"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';

const MAX_WIDTH = 600;

export default function Workstation({ onAnalyze, isLoading, results }) {
  // --- React States ---
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [tolerance, setTolerance] = useState(30);
  const [erosion, setErosion] = useState(0);
  const [dilation, setDilation] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [currentMode, setCurrentMode] = useState('DRAW'); // 'DRAW' | 'SEED'
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
    if (typeof window !== 'undefined') {
      rawImageObj.current = new window.Image();
    }
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      rawImageObj.current.onload = () => {
        const cOrig = canvasOriginalRef.current;
        const cRes = canvasResultRef.current;
        let width = rawImageObj.current.width;
        let height = rawImageObj.current.height;
        if (width > MAX_WIDTH) { 
          height = Math.floor(height * (MAX_WIDTH / width)); 
          width = MAX_WIDTH; 
        }
        cOrig.width = width; cOrig.height = height;
        cRes.width = width; cRes.height = height;
        const ctx = cOrig.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(rawImageObj.current, 0, 0, width, height);
        rawPixelData.current = ctx.getImageData(0, 0, width, height);
        setIsImageLoaded(true);
        setBrightness(0);
        setContrast(0);
        setTimeout(applyImageEnhancement, 0); 
      };
      rawImageObj.current.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const applyImageEnhancement = useCallback(() => {
    if (!isImageLoaded || !rawPixelData.current) return;
    const width = canvasOriginalRef.current.width, height = canvasOriginalRef.current.height;
    enhancedPixelData.current = new window.ImageData(new Uint8ClampedArray(rawPixelData.current.data), width, height);
    const data = enhancedPixelData.current.data;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
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
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.setLineDash(currentMode === 'SEED' ? [5, 5] : []);
        ctx.strokeStyle = currentMode === 'SEED' ? '#6366f1' : '#10b981';
        ctx.lineWidth = 2.5;
        if (currentMode === 'SEED') { ctx.closePath(); ctx.fillStyle = 'rgba(99, 102, 241, 0.15)'; ctx.fill(); }
        ctx.stroke();
    }
    if (results?.boundingBox) {
      const [ymin, xmin, ymax, xmax] = results.boundingBox;
      const w = canvasOriginalRef.current.width, h = canvasOriginalRef.current.height;
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.setLineDash([]);
      ctx.strokeRect(xmin * w, ymin * h, (xmax - xmin) * w, (ymax - ymin) * h);
      ctx.fillStyle = '#ef4444'; ctx.font = 'bold 16px sans-serif';
      ctx.fillText(results.classification === 'Malignant' ? '⚠️ Malignant' : '✅ Benign', xmin * w, ymin * h - 8);
    }
  };

  useEffect(() => { redrawOriginalCanvas(); }, [results, currentMode]);

  const handlePointerDown = (e) => {
    if (!isImageLoaded) return;
    const rect = canvasOriginalRef.current.getBoundingClientRect();
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    const x = Math.floor((clientX - rect.left) * (canvasOriginalRef.current.width / rect.width));
    const y = Math.floor((clientY - rect.top) * (canvasOriginalRef.current.height / rect.height));

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
    const rect = canvasOriginalRef.current.getBoundingClientRect();
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
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
    const ctx = canvasResultRef.current.getContext('2d');
    const resImg = ctx.createImageData(w, h);
    for(let i=0; i<mask.length; i++) {
        const p=i*4;
        if(showOverlay && mask[i]) { resImg.data[p]=Math.min(255, data[p]+130); resImg.data[p+1]=data[p+1]*0.3; resImg.data[p+2]=data[p+2]*0.3; }
        else { const v=!showOverlay&&mask[i]?255:0; resImg.data[p]=showOverlay?data[p]:v; resImg.data[p+1]=showOverlay?data[p+1]:v; resImg.data[p+2]=showOverlay?data[p+2]:v; }
        resImg.data[p+3]=255;
    }
    ctx.putImageData(resImg, 0, 0);
    extractAdvancedRadiomics(mask, w, h, data);
  }, [isImageLoaded, tolerance, erosion, dilation, showOverlay]);

  useEffect(() => { if(seedPoints.current.length) processSegmentation(); }, [processSegmentation]);

  const extractAdvancedRadiomics = (mask, w, h, pixelData) => {
    let area=0, perimeter=0, intensities=[];
    for(let y=0; y<h; y++) for(let x=0; x<w; x++) {
        const idx = y*w+x;
        if(mask[idx]) {
            area++;
            if(x===0||x===w-1||y===0||y===h-1||!mask[y*w+x-1]||!mask[y*w+x+1]||!mask[(y-1)*w+x]||!mask[(y+1)*w+x]) perimeter++;
            intensities.push(0.299*pixelData[idx*4]+0.587*pixelData[idx*4+1]+0.114*pixelData[idx*4+2]);
        }
    }
    if(area<10) { setRadiomics(null); return; }
    const mean = intensities.reduce((a,b)=>a+b,0)/area;
    const std = Math.sqrt(intensities.reduce((a,b)=>a+Math.pow(b-mean,2),0)/area);
    const circ = (perimeter > 0) ? Math.min(1, (4*Math.PI*area)/(perimeter**2)) : 0;
    const z = -4.5 + (area/1000)*1.8 + (1-circ)*3.5 + (std/30)*1.5;
    setRadiomics({ area, circularity: circ, meanDensity: mean, stdDev: std, localProbability: (100/(1+Math.exp(-z))).toFixed(1) });
  };

  const commonCardClass = "card-main p-6 space-y-6 shadow-sm dark:shadow-2xl transition-colors duration-500";

  return (
    <div className="w-full text-slate-900 dark:text-slate-200 transition-colors duration-500">
      <main className="mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column */}
        <div className="md:col-span-4 space-y-8">
            <div className={commonCardClass}>
                <header className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-4 bg-indigo-500 rounded-full"></div>
                    <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Image Source</h2>
                </header>
                <input onChange={handleImageUpload} type="file" className="block w-full text-xs text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer shadow-sm active:scale-95 transition-all" accept="image/*" />
            </div>

            <div className={commonCardClass}>
                <header className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-4 bg-violet-500 rounded-full"></div>
                        <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Enhancement</h2>
                    </div>
                    <button onClick={() => { setBrightness(0); setContrast(0); }} className="text-[10px] font-black text-indigo-500 hover:text-indigo-400 uppercase underline decoration-2 underline-offset-4">Reset</button>
                </header>
                <div className="space-y-6">
                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase"><span>Brightness</span><span className="text-indigo-600">{brightness}</span></div>
                        <input type="range" min="-100" max="100" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full" />
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase"><span>Contrast</span><span className="text-indigo-600">{contrast}</span></div>
                        <input type="range" min="-100" max="100" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full" />
                    </div>
                </div>
            </div>

            <div className={commonCardClass}>
                <header className="flex items-center gap-2">
                    <div className="w-2 h-4 bg-emerald-500 rounded-full"></div>
                    <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Segmentation</h2>
                </header>
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <div className={`p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-tighter ${currentMode === 'DRAW' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800 text-slate-400'}`}>1. Draw Polygon ROI</div>
                        <div className={`p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-tighter ${currentMode === 'SEED' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-slate-50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800 text-slate-400'}`}>2. Multi-Seed Placement</div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase"><span>Tolerance</span><span className="text-emerald-500 font-black">{tolerance}</span></div>
                        <input type="range" min="5" max="100" value={tolerance} onChange={e=>setTolerance(Number(e.target.value))} className="w-full accent-emerald-500" />
                    </div>
                    <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex-1 space-y-2">
                           <button onClick={() => setShowOverlay(!showOverlay)} className={`w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${showOverlay ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                             {showOverlay ? "Hide Overlay" : "Show Overlay"}
                           </button>
                        </div>
                        <div className="flex-1 space-y-2">
                           <button onClick={() => {roiPoints.current=[]; seedPoints.current=[]; setRadiomics(null); setCurrentMode('DRAW'); redrawOriginalCanvas();}} className="w-full py-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 font-black text-[9px] uppercase tracking-widest border border-red-100 dark:border-red-900/30">Reset All</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Center / Right Columns */}
        <div className="md:col-span-8 flex flex-col gap-8">
            <div className="card-main p-8 shadow-2xl transition-colors duration-500">
                <header className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 italic tracking-tighter uppercase transition-colors">Precision Workspace</h3>
                    <div className="px-4 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-400 tracking-widest animate-pulse transition-colors">LIVE ANALYTICS</div>
                </header>
                <div className="flex justify-center items-center bg-slate-50 dark:bg-slate-950/80 rounded-[2.5rem] overflow-hidden min-h-[400px] relative border-4 border-slate-100 dark:border-slate-900 shadow-inner group transition-colors">
                    {!isImageLoaded && <p className="text-[11px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em]">Mount Sensor Image</p>}
                    <canvas ref={canvasOriginalRef} className="max-w-full h-auto object-contain cursor-crosshair z-20" onMouseDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onTouchStart={handlePointerDown} />
                    {seedPoints.current.map((pt, i) => <div key={i} className="absolute w-3 h-3 bg-emerald-400 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 shadow-xl" style={{ left: `${(pt.x / canvasOriginalRef.current?.width)*100}%`, top: `${(pt.y / canvasOriginalRef.current?.height)*100}%` }} />)}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className={commonCardClass + " flex flex-col"}>
                  <header className="flex justify-between items-center">
                      <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Morphology Mask</h3>
                      <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-full italic tracking-tighter">BIT-8 NATIVE</div>
                  </header>
                  <div className="flex-grow mt-4 flex justify-center items-center bg-slate-100 dark:bg-black rounded-3xl overflow-hidden border-2 border-slate-50 dark:border-slate-800/50 shadow-inner min-h-[250px] transition-colors">
                      <canvas ref={canvasResultRef} className="max-w-full h-auto object-contain"></canvas>
                  </div>
              </div>

              <div className={commonCardClass + " flex flex-col justify-between"}>
                  <header className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-4 bg-violet-600 rounded-full"></div>
                      <h2 className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-[0.2em]">Radiomics Data</h2>
                  </header>

                  {!radiomics ? (
                     <div className="flex-grow flex flex-col items-center justify-center space-y-3 opacity-30">
                        <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-400 animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Capture</p>
                     </div>
                  ) : (
                    <div className="space-y-6">
                        <div className={`p-6 rounded-3xl border-2 transition-all ${parseFloat(radiomics.localProbability) > 65 ? 'bg-red-500/5 border-red-500/30 text-red-600' : 'bg-emerald-500/5 border-emerald-500/30 text-emerald-600'}`}>
                           <div className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Local Model Estimation</div>
                           <div className="text-4xl font-black transition-colors">{radiomics.localProbability}%</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-400 transition-colors uppercase">
                           <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                              <span className="opacity-50 text-[8px] mb-1">Area</span>
                              <span className="text-slate-900 dark:text-slate-100 font-black">{radiomics.area.toLocaleString()}</span>
                           </div>
                           <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                              <span className="opacity-50 text-[8px] mb-1">Density</span>
                              <span className="text-slate-900 dark:text-slate-100 font-black">{radiomics.meanDensity.toFixed(1)}</span>
                           </div>
                        </div>
                        <button onClick={handleDeepAnalyze} disabled={isLoading} className="w-full py-4 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-500 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                           {isLoading ? "Consulting AI..." : "Consult Gemini Vision"}
                        </button>
                    </div>
                  )}
              </div>
            </div>
        </div>
      </main>
    </div>
  );
}
