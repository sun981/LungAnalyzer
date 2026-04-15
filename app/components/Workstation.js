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
  }, [isImageLoaded, tolerance, erosion, dilation, showOverlay]);

  useEffect(() => { if(seedPoints.current.length) processSegmentation(); }, [processSegmentation]);

  const handleDeepAnalyze = () => onAnalyze({ image: canvasResultRef.current.toDataURL("image/jpeg").split(",")[1], featureData: radiomics });

  const commonCardClass = "glass p-8 rounded-[2.5rem] space-y-8 dark:border-white/5 transition-all duration-700 shadow-2xl";

  return (
    <div className="w-full text-slate-800 dark:text-slate-200 transition-colors duration-700">
      <main className="grid grid-cols-1 md:grid-cols-12 gap-12">
        
        {/* Left Sidebar: Orchestration */}
        <div className="md:col-span-4 space-y-12">
            <div className={commonCardClass}>
                <header className="flex items-center gap-3">
                    <div className="w-2.5 h-6 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                    <h2 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Module 01: Capture</h2>
                </header>
                <div className="group relative">
                  <input onChange={handleImageUpload} type="file" className="block w-full text-xs text-slate-500 file:mr-4 file:py-4 file:px-8 file:rounded-2xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer shadow-xl transition-all active:scale-95" accept="image/*" />
                </div>
            </div>

            <div className={commonCardClass}>
                <header className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-6 bg-violet-600 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
                        <h2 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Module 02: Optic Filters</h2>
                    </div>
                    <button onClick={() => { setBrightness(0); setContrast(0); }} className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter hover:scale-110 transition-transform">Reset Matrix</button>
                </header>
                <div className="space-y-8">
                    <div className="space-y-4">
                        <div className="flex justify-between text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest transition-colors"><span>Intensity</span><span className="text-indigo-500">{brightness}</span></div>
                        <input type="range" min="-100" max="100" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full" />
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest transition-colors"><span>Dynamic Range</span><span className="text-indigo-500">{contrast}</span></div>
                        <input type="range" min="-100" max="100" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full" />
                    </div>
                </div>
            </div>

            <div className={commonCardClass}>
                <header className="flex items-center gap-3">
                    <div className="w-2.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    <h2 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Module 03: Isolation</h2>
                </header>
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setCurrentMode('DRAW')} className={`p-4 rounded-3xl border-2 transition-all font-black text-[10px] uppercase tracking-tighter ${currentMode === 'DRAW' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl scale-105' : 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400'}`}>1. Vector ROI</button>
                        <button onClick={() => setCurrentMode('SEED')} className={`p-4 rounded-3xl border-2 transition-all font-black text-[10px] uppercase tracking-tighter ${currentMode === 'SEED' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl scale-105' : 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400'}`}>2. Seed Pulse</button>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest"><span>Spatial Sensitivity</span><span className="text-emerald-500 font-black">{tolerance}</span></div>
                        <input type="range" min="5" max="100" value={tolerance} onChange={e=>setTolerance(Number(e.target.value))} className="w-full accent-emerald-500" />
                    </div>
                    <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 transition-colors">
                        <button onClick={() => setShowOverlay(!showOverlay)} className={`flex-1 py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all ${showOverlay ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 underline decoration-dotted decoration-2 underline-offset-4'}`}>{showOverlay ? "Active Overlay" : "Wireframe Mode"}</button>
                        <button onClick={() => {roiPoints.current=[]; seedPoints.current=[]; setRadiomics(null); setCurrentMode('DRAW'); redrawOriginalCanvas();}} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black text-[9px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all">Format Buffer</button>
                    </div>
                </div>
            </div>
        </div>

        {/* Center / Workspace Columns */}
        <div className="md:col-span-8 flex flex-col gap-12">
            <div className="card-main p-10 shadow-indigo-500/10 dark:shadow-none transition-all duration-700">
                <header className="flex justify-between items-center mb-8">
                   <div className="space-y-1">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tigh transition-colors uppercase">Synchronized Workspace</h3>
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">HPU-3 Cluster Online</p>
                   </div>
                   <div className="px-6 py-2 rounded-full bg-slate-900 dark:bg-emerald-500 text-[10px] font-black text-white dark:text-slate-900 tracking-[0.3em] uppercase transition-all shadow-xl">Processing v3.1</div>
                </header>
                <div className="flex justify-center items-center bg-slate-950 rounded-[3rem] overflow-hidden min-h-[500px] relative border-[12px] border-slate-100 dark:border-slate-900 shadow-2xl transition-colors group">
                    {!isImageLoaded && <div className="absolute inset-0 flex flex-col justify-center items-center space-y-4 animate-pulse z-10"><div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div><p className="text-[11px] font-black text-slate-700 uppercase tracking-[0.5em]">Establishing Sensor Link</p></div>}
                    <canvas ref={canvasOriginalRef} className={`max-w-full h-auto cursor-crosshair z-20 rounded-3xl ${!isImageLoaded ? 'hidden' : ''}`} onMouseDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onTouchStart={handlePointerDown} />
                    {seedPoints.current.map((pt, i) => <div key={i} className="absolute w-4 h-4 bg-emerald-400 border-[3px] border-black rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 shadow-[0_0_20px_#10b981] animate-in zoom-in duration-300" style={{ left: `${(pt.x / canvasOriginalRef.current?.width)*100}%`, top: `${(pt.y / canvasOriginalRef.current?.height)*100}%` }} />)}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               <div className="glass p-8 rounded-[3rem] dark:border-white/5 flex flex-col shadow-2xl space-y-6">
                  <header className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
                      <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">Pixel Map</h3>
                      <div className="px-3 py-1 bg-violet-600 text-white text-[9px] font-black rounded-full italic shadow-lg">ISOLATED</div>
                  </header>
                  <div className="flex-grow flex justify-center items-center bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-inner min-h-[300px] group transition-colors">
                      <canvas ref={canvasResultRef} className="max-w-full h-auto object-contain group-hover:scale-110 transition-transform duration-[2s]"></canvas>
                  </div>
              </div>

              <div className="glass p-10 rounded-[3.5rem] dark:border-white/5 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-700">
                  <div className="absolute top-0 right-0 p-8 opacity-5"><svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg></div>
                  <header className="flex items-center gap-4 mb-4">
                      <div className="w-3 h-8 bg-gradient-to-b from-indigo-600 to-violet-600 rounded-full"></div>
                      <h2 className="text-[11px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-[0.4em]">Feature Set</h2>
                  </header>

                  {!radiomics ? (
                     <div className="flex-grow flex flex-col items-center justify-center space-y-4 opacity-20">
                        <div className="w-12 h-12 border-4 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[11px] font-black uppercase tracking-[0.6em]">Buffering Data</p>
                     </div>
                  ) : (
                    <div className="space-y-8 animate-in slide-in-from-right-10 duration-[1s]">
                        <div className={`p-8 rounded-[2.5rem] border-l-[12px] shadow-2xl relative transition-all ${parseFloat(radiomics.localProbability) > 65 ? 'bg-red-500/10 border-red-600' : 'bg-emerald-500/10 border-emerald-500'}`}>
                           <div className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-2">Heuristic Confidence</div>
                           <div className="flex items-baseline gap-2">
                              <span className="text-6xl font-black italic tracking-tighter text-slate-900 dark:text-white transition-colors">{radiomics.localProbability}%</span>
                           </div>
                        </div>
                        <div className="grid gap-3 text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                           <div className="p-4 rounded-3xl bg-slate-100/50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex justify-between items-center group hover:bg-indigo-600 hover:text-white transition-all">
                              <span className="opacity-70 group-hover:opacity-100">Area Magnification</span>
                              <span className="group-hover:translate-x-[-10px] transition-transform">{radiomics.area.toLocaleString()} px²</span>
                           </div>
                           <div className="p-4 rounded-3xl bg-slate-100/50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex justify-between items-center group hover:bg-emerald-600 hover:text-white transition-all">
                              <span className="opacity-70 group-hover:opacity-100">Density Cluster</span>
                              <span className="group-hover:translate-x-[-10px] transition-transform">{radiomics.meanDensity.toFixed(1)} HU'</span>
                           </div>
                        </div>
                        <button onClick={handleDeepAnalyze} disabled={isLoading} className="group relative w-full overflow-hidden rounded-[2rem] bg-indigo-600 p-[2px] transition-all hover:scale-[1.02] active:scale-95 disabled:grayscale">
                           <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-600 to-indigo-500 animate-[shimmer_2s_infinite] bg-[length:200%_100%]"></div>
                           <div className="relative bg-indigo-600 rounded-[1.9rem] py-6 px-4 flex items-center justify-center gap-4">
                             {isLoading ? ( <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> ) : ( <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg> )}
                             <span className="text-[12px] font-black text-white uppercase tracking-[0.3em]">{isLoading ? "Requesting Core..." : "Initiate Gemini Neural"}</span>
                           </div>
                        </button>
                    </div>
                  )}
              </div>
            </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
