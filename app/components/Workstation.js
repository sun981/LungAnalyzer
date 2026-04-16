"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';

const MAX_WIDTH = 800; // Increased for higher resolution processing

export default function Workstation({ onAnalyze, isLoading, results }) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [tolerance, setTolerance] = useState(30);
  const [erosion, setErosion] = useState(0);
  const [dilation, setDilation] = useState(0);
  const [opening, setOpening] = useState(0);
  const [closing, setClosing] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [currentMode, setCurrentMode] = useState('DRAW'); 
  const [radiomics, setRadiomics] = useState(null);
  
  const rawImageObj = useRef(null);
  const rawPixelData = useRef(null);
  const enhancedPixelData = useRef(null);
  const roiPoints = useRef([]);
  const seedPoints = useRef([]);
  const roiMask = useRef(null);
  const isDrawing = useRef(false);

  const canvasOriginalRef = useRef(null);
  const canvasResultRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') rawImageObj.current = new window.Image();
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      rawImageObj.current.onload = () => {
        const cOrig = canvasOriginalRef.current, cRes = canvasResultRef.current;
        let w = rawImageObj.current.width, h = rawImageObj.current.height;
        if (w > MAX_WIDTH) { h = Math.floor(h * (MAX_WIDTH / w)); w = MAX_WIDTH; }
        cOrig.width = w; cOrig.height = h; cRes.width = w; cRes.height = h;
        const ctx = cOrig.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(rawImageObj.current, 0, 0, w, h);
        rawPixelData.current = ctx.getImageData(0, 0, w, h);
        setIsImageLoaded(true); setBrightness(0); setContrast(0);
        setTimeout(applyImageEnhancement, 0); 
      };
      rawImageObj.current.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const applyImageEnhancement = useCallback(() => {
    if (!isImageLoaded || !rawPixelData.current) return;
    const w = canvasOriginalRef.current.width, h = canvasOriginalRef.current.height;
    enhancedPixelData.current = new window.ImageData(new Uint8ClampedArray(rawPixelData.current.data), w, h);
    const data = enhancedPixelData.current.data, factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128 + brightness));       
        data[i+1] = Math.max(0, Math.min(255, factor * (data[i+1] - 128) + 128 + brightness));   
        data[i+2] = Math.max(0, Math.min(255, factor * (data[i+2] - 128) + 128 + brightness));   
    }
    redrawOriginalCanvas();
    if (seedPoints.current.length > 0) processSegmentation();
  }, [isImageLoaded, brightness, contrast]);

  useEffect(() => { applyImageEnhancement(); }, [applyImageEnhancement]);

  const redrawOriginalCanvas = () => {
    if (!isImageLoaded || !enhancedPixelData.current || !canvasOriginalRef.current) return;
    const ctx = canvasOriginalRef.current.getContext('2d');
    ctx.putImageData(enhancedPixelData.current, 0, 0);
    const pts = roiPoints.current;
    if (pts.length > 0) {
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.setLineDash(currentMode === 'SEED' ? [5, 5] : []);
        ctx.strokeStyle = currentMode === 'SEED' ? '#6366f1' : '#10b981';
        ctx.lineWidth = 3;
        if (currentMode === 'SEED') { ctx.closePath(); ctx.fillStyle = 'rgba(99, 102, 241, 0.15)'; ctx.fill(); }
        ctx.stroke();
    }
    if (results?.boundingBox) {
      const [ymin, xmin, ymax, xmax] = results.boundingBox;
      const w = canvasOriginalRef.current.width, h = canvasOriginalRef.current.height;
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4; ctx.setLineDash([]);
      ctx.strokeRect(xmin * w, ymin * h, (xmax - xmin) * w, (ymax - ymin) * h);
      ctx.fillStyle = '#ef4444'; ctx.font = 'black 20px Inter, sans-serif';
      ctx.fillText(results.classification === 'Malignant' ? '⚠ DETECTION: MALIGNANT' : '✓ DETECTION: BENIGN', xmin * w, ymin * h - 12);
    }
  };

  useEffect(() => { redrawOriginalCanvas(); }, [results, currentMode]);

  const handlePointerDown = (e) => {
    if (!isImageLoaded) return;
    const rect = canvasOriginalRef.current.getBoundingClientRect(), 
          clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX,
          clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY,
          x = Math.floor((clientX - rect.left) * (canvasOriginalRef.current.width / rect.width)),
          y = Math.floor((clientY - rect.top) * (canvasOriginalRef.current.height / rect.height));

    if (currentMode === 'DRAW') {
        isDrawing.current = true; roiPoints.current = [{x, y}]; redrawOriginalCanvas();
    } else if (currentMode === 'SEED') {
        if (roiMask.current && roiMask.current[y * canvasOriginalRef.current.width + x] === 1) {
            seedPoints.current.push({x, y}); processSegmentation();
        }
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing.current || currentMode !== 'DRAW') return;
    const rect = canvasOriginalRef.current.getBoundingClientRect(),
          clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX,
          clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    roiPoints.current.push({
        x: Math.floor((clientX - rect.left) * (canvasOriginalRef.current.width / rect.width)),
        y: Math.floor((clientY - rect.top) * (canvasOriginalRef.current.height / rect.height))
    });
    redrawOriginalCanvas();
  };

  const handlePointerUp = () => {
    if (!isDrawing.current || currentMode !== 'DRAW') return;
    isDrawing.current = false;
    if (roiPoints.current.length > 5) {
        roiPoints.current.push({...roiPoints.current[0]});
        const w = canvasOriginalRef.current.width, h = canvasOriginalRef.current.height;
        const offCtx = Object.assign(document.createElement('canvas'), {width:w, height:h}).getContext('2d');
        offCtx.fillStyle='#000'; offCtx.fillRect(0,0,w,h);
        offCtx.beginPath(); offCtx.moveTo(roiPoints.current[0].x, roiPoints.current[0].y);
        roiPoints.current.slice(1).forEach(p => offCtx.lineTo(p.x, p.y));
        offCtx.closePath(); offCtx.fillStyle='#fff'; offCtx.fill();
        const maskData = offCtx.getImageData(0,0,w,h).data;
        roiMask.current = new Uint8Array(w*h);
        for(let i=0; i<w*h; i++) roiMask.current[i] = maskData[i*4]>128?1:0;
        setCurrentMode('SEED'); redrawOriginalCanvas();
    } else { roiPoints.current=[]; redrawOriginalCanvas(); }
  };

  const processSegmentation = useCallback(() => {
    if (!isImageLoaded || !seedPoints.current.length || !enhancedPixelData.current || !roiMask.current) return;
    const w = canvasOriginalRef.current.width, h = canvasOriginalRef.current.height, data = enhancedPixelData.current.data;
    let mask = new Uint8Array(w*h), stack = [], seedIntensities = [];
    seedPoints.current.forEach(p => {
        const sIdx = (p.y*w+p.x)*4; seedIntensities.push(0.299*data[sIdx]+0.587*data[sIdx+1]+0.114*data[sIdx+2]);
        mask[p.y*w+p.x]=1; stack.push(p.x, p.y);
    });
    const dx=[0,0,-1,1], dy=[-1,1,0,0];
    while(stack.length) {
        const cy=stack.pop(), cx=stack.pop();
        for(let i=0; i<4; i++) {
            const nx=cx+dx[i], ny=cy+dy[i], nIdx=ny*w+nx;
            if(nx>=0 && nx<w && ny>=0 && ny<h && roiMask.current[nIdx] && !mask[nIdx]) {
                const gray = 0.299*data[nIdx*4]+0.587*data[nIdx*4+1]+0.114*data[nIdx*4+2];
                if(seedIntensities.some(s => Math.abs(gray-s)<=tolerance)) { mask[nIdx]=1; stack.push(nx, ny); }
            }
        }
    }
    const morph = (m, type) => {
        let dst = new Uint8Array(m.length);
        for(let y=1; y<h-1; y++) for(let x=1; x<w-1; x++) {
            let hit = type==='erode'?1:0;
            for(let dy=-1; dy<=1; dy++) for(let dx=-1; dx<=1; dx++) {
                if(type==='erode') { if(!m[(y+dy)*w+x+dx]) hit=0; }
                else { if(m[(y+dy)*w+x+dx]) hit=1; }
            }
            dst[y*w+x]=hit;
        }
        return dst;
    };
    for(let i=0; i<erosion; i++) mask=morph(mask, 'erode');
    for(let i=0; i<dilation; i++) mask=morph(mask, 'dilate');
    // Opening
    for(let j=0; j<opening; j++) { mask = morph(mask, 'erode'); mask = morph(mask, 'dilate'); }
    // Closing
    for(let j=0; j<closing; j++) { mask = morph(mask, 'dilate'); mask = morph(mask, 'erode'); }

    const ctx = canvasResultRef.current.getContext('2d'), resImg = ctx.createImageData(w, h);
    for(let i=0; i<mask.length; i++) {
        const p=i*4;
        if(showOverlay && mask[i]) { resImg.data[p]=Math.min(255, data[p]+130); resImg.data[p+1]=data[p+1]*0.3; resImg.data[p+2]=data[p+2]*0.3; }
        else { const v=!showOverlay&&mask[i]?255:0; resImg.data[p]=showOverlay?data[p]:v; resImg.data[p+1]=showOverlay?data[p+1]:v; resImg.data[p+2]=showOverlay?data[p+2]:v; }
        resImg.data[p+3]=255;
    }
    ctx.putImageData(resImg, 0, 0);
    let area=0, perimeter=0, intensities=[];
    for(let y=0; y<h; y++) for(let x=0; x<w; x++) {
        const idx = y*w+x;
        if(mask[idx]) {
            area++;
            if(x===0||x===w-1||y===0||y===h-1||!mask[y*w+x-1]||!mask[y*w+x+1]||!mask[(y-1)*w+x]||!mask[(y+1)*w+x]) perimeter++;
            intensities.push(0.299*data[idx*4]+0.587*data[idx*4+1]+0.114*data[idx*4+2]);
        }
    }
    if(area<10) { setRadiomics(null); return; }
    const mean = intensities.reduce((a,b)=>a+b,0)/area, 
          std = Math.sqrt(intensities.reduce((a,b)=>a+Math.pow(b-mean,2),0)/area), 
          circ = (perimeter > 0) ? Math.min(1, (4*Math.PI*area)/(perimeter**2)) : 0, 
          z = -4.5 + (area/1000)*1.8 + (1-circ)*3.5 + (std/30)*1.5;
    setRadiomics({ area, circularity: circ, meanDensity: mean, stdDev: std, localProbability: (100/(1+Math.exp(-z))).toFixed(1) });
  }, [isImageLoaded, tolerance, erosion, dilation, opening, closing, showOverlay]);

  useEffect(() => { if(seedPoints.current.length) processSegmentation(); }, [processSegmentation]);

  const handleDeepAnalyze = () => onAnalyze({ image: canvasResultRef.current.toDataURL("image/jpeg").split(",")[1], featureData: radiomics });

  const commonCardClass = "glass p-6 rounded-2xl flex flex-col gap-4 shadow-sm";

  return (
    <div className="w-full text-slate-800 dark:text-slate-200 transition-colors duration-700">
      <main className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Sidebar: Orchestration */}
        <div className="md:col-span-4 flex flex-col gap-8 min-w-0">
            <div className={commonCardClass}>
                <header className="flex items-center gap-3 mb-2">
                    <div className="w-2.5 h-6 bg-[var(--accent)] rounded-full"></div>
                    <h2 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">Module 01: Capture</h2>
                </header>
                <div className="group relative">
                  <input onChange={handleImageUpload} type="file" className="block w-full text-xs text-[var(--foreground)] file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-[var(--accent)] file:text-white hover:file:opacity-90 cursor-pointer shadow-sm transition-all" accept="image/*" />
                </div>
            </div>

            <div className={commonCardClass}>
                <header className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-6 bg-[var(--accent)] rounded-full"></div>
                        <h2 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">Module 02: Enhancement</h2>
                    </div>
                    <button onClick={() => { setBrightness(0); setContrast(0); }} className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-wider hover:underline">Reset</button>
                </header>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]"><span>Intensity</span><span className="text-[var(--accent)]">{brightness}</span></div>
                        <input type="range" min="-100" max="100" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]"><span>Dynamic Range</span><span className="text-[var(--accent)]">{contrast}</span></div>
                        <input type="range" min="-100" max="100" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full" />
                    </div>
                </div>
            </div>

            <div className={commonCardClass}>
                <header className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-6 bg-[var(--accent)] rounded-full"></div>
                        <h2 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">Module 03: Segmentation</h2>
                    </div>
                </header>
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setCurrentMode('DRAW')} className={`p-4 rounded-xl border transition-all font-bold text-[10px] uppercase tracking-wider ${currentMode === 'DRAW' ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md scale-105' : 'bg-transparent border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--surface)]'}`}>1. Vector ROI</button>
                        <button onClick={() => setCurrentMode('SEED')} className={`p-4 rounded-xl border transition-all font-bold text-[10px] uppercase tracking-wider ${currentMode === 'SEED' ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md scale-105' : 'bg-transparent border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--surface)]'}`}>2. Seed Pulse</button>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]"><span>Spatial Sensitivity</span><span className="text-[var(--accent)]">{tolerance}</span></div>
                        <input type="range" min="5" max="100" value={tolerance} onChange={e=>setTolerance(Number(e.target.value))} className="w-full" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-4 border-t border-[var(--card-border)]">
                        <div className="space-y-2">
                           <div className="flex justify-between text-[9px] font-bold uppercase text-[var(--text-muted)]"><span>Erosion</span><span>{erosion}</span></div>
                           <input type="range" min="0" max="10" value={erosion} onChange={e=>setErosion(Number(e.target.value))} className="w-full" />
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between text-[9px] font-bold uppercase text-[var(--text-muted)]"><span>Dilation</span><span>{dilation}</span></div>
                           <input type="range" min="0" max="10" value={dilation} onChange={e=>setDilation(Number(e.target.value))} className="w-full" />
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between text-[9px] font-bold uppercase text-[var(--text-muted)]"><span>Opening</span><span>{opening}</span></div>
                           <input type="range" min="0" max="5" value={opening} onChange={e=>setOpening(Number(e.target.value))} className="w-full" />
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between text-[9px] font-bold uppercase text-[var(--text-muted)]"><span>Closing</span><span>{closing}</span></div>
                           <input type="range" min="0" max="5" value={closing} onChange={e=>setClosing(Number(e.target.value))} className="w-full" />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--card-border)]">
                        <button onClick={() => { if (seedPoints.current.length > 0) { seedPoints.current.pop(); processSegmentation(); redrawOriginalCanvas(); } }} disabled={seedPoints.current.length===0} className="flex-1 min-w-[30%] py-3 rounded-xl border border-[var(--card-border)] font-bold text-[9px] uppercase tracking-widest hover:bg-[var(--card-border)] disabled:opacity-30">Undo Seed</button>
                        <button onClick={() => {roiPoints.current=[]; seedPoints.current=[]; setRadiomics(null); setCurrentMode('DRAW'); redrawOriginalCanvas();}} className="flex-1 min-w-[30%] py-3 rounded-xl border border-[var(--danger-text)] text-[var(--danger-text)] font-bold text-[9px] uppercase tracking-widest hover:bg-[var(--danger-bg)]">Reset ROI</button>
                        <button onClick={() => setShowOverlay(!showOverlay)} className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-bold text-[9px] uppercase tracking-widest hover:opacity-90">{showOverlay ? "Active Overlay" : "Wireframe Mode"}</button>
                    </div>
                </div>
            </div>
        </div>

        {/* Center / Workspace Columns */}
        <div className="md:col-span-8 flex flex-col gap-8 min-w-0">
            
            {/* Split Screen Workspace */}
            <div className="card-main p-6 sm:p-8 flex flex-col items-stretch space-y-6">
                <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
                   <div className="space-y-1">
                      <h3 className="text-xl font-playfair font-bold text-[var(--foreground)] tracking-wide">Synchronized Workspace</h3>
                   </div>
                   <div className="px-4 py-1.5 rounded-full border border-[var(--card-border)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest self-start sm:self-auto">Side-By-Side</div>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative min-h-[400px]">
                    {/* Left: Interaction Canvas */}
                    <div className="flex flex-col gap-3 min-w-0">
                       <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] text-center">Enhanced Source</div>
                       <div className="flex-1 flex justify-center items-center rounded-2xl bg-[#1A1C1B]/5 border border-[var(--card-border)] overflow-hidden relative shadow-inner min-w-0">
                           {!isImageLoaded && <div className="absolute inset-0 flex flex-col justify-center items-center space-y-4 animate-pulse z-10"><p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">No Image</p></div>}
                           <canvas ref={canvasOriginalRef} className={`w-full h-auto object-contain cursor-crosshair z-20 ${!isImageLoaded ? 'hidden' : ''}`} onMouseDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp} />
                           {seedPoints.current.map((pt, i) => <div key={i} className="absolute w-3 h-3 bg-[var(--highlight)] border-[2px] border-black rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 shadow-sm animate-in zoom-in duration-200" style={{ left: `${(pt.x / canvasOriginalRef.current?.width)*100}%`, top: `${(pt.y / canvasOriginalRef.current?.height)*100}%` }} />)}
                       </div>
                    </div>

                    <div className="w-full h-px xl:w-px xl:h-full bg-[var(--card-border)] hidden xl:block absolute left-1/2 top-0 -translate-x-1/2"></div>
                    
                    {/* Right: Result Canvas */}
                    <div className="flex flex-col gap-3 min-w-0">
                       <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] text-center">Segmentation Result</div>
                       <div className="flex-1 flex justify-center items-center rounded-2xl bg-[#1A1C1B]/5 border border-[var(--card-border)] overflow-hidden relative shadow-inner min-w-0">
                           <canvas ref={canvasResultRef} className={`w-full h-auto object-contain ${!isImageLoaded ? 'hidden' : ''}`}></canvas>
                       </div>
                    </div>
                </div>
            </div>

            {/* Feature Set */}
            <div className="glass p-6 sm:p-8 rounded-3xl shadow-sm border border-[var(--card-border)] overflow-hidden">
                  <header className="flex items-center gap-3 mb-6 border-b border-[var(--card-border)] pb-4">
                      <h2 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">Radiomics Feature Extraction</h2>
                  </header>

                  {!radiomics ? (
                     <div className="flex flex-col items-center justify-center space-y-4 py-8 opacity-40">
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Awaiting Analysis...</p>
                     </div>
                  ) : (
                    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700">
                        <div className={`p-6 rounded-2xl border-l-[6px] shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${parseFloat(radiomics.localProbability) > 65 ? 'bg-[#FDF6F6] border-[#A74A4A] text-[#A74A4A]' : 'bg-[#F4F8F5] border-[#5B8266] text-[#5B8266]'}`}>
                           <div className="text-[10px] font-bold uppercase tracking-widest pl-2">Local Probability</div>
                           <div className="text-3xl font-playfair font-bold">{radiomics.localProbability}%</div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">
                           <div className="p-4 rounded-xl border border-[var(--card-border)] bg-white flex flex-col gap-2">
                              <span className="opacity-80">Area</span>
                              <span className="text-[var(--foreground)] text-sm">{radiomics.area.toLocaleString()} px²</span>
                           </div>
                           <div className="p-4 rounded-xl border border-[var(--card-border)] bg-white flex flex-col gap-2">
                              <span className="opacity-80">Mean Density</span>
                              <span className="text-[var(--foreground)] text-sm">{radiomics.meanDensity.toFixed(1)} HU</span>
                           </div>
                        </div>
                        <button onClick={handleDeepAnalyze} disabled={isLoading} className="btn-premium w-full flex items-center justify-center gap-3 py-4">
                           {isLoading ? ( <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> ) : ( <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg> )}
                           <span>{isLoading ? "Running Diagnostic Engine..." : "Analyze with Medical AI"}</span>
                        </button>
                    </div>
                  )}
            </div>
        </div>
      </main>
    </div>
  );
}
