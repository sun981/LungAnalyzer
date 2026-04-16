"use client";
import React, { useRef, useState, useEffect } from 'react';

export default function Workstation({ onAnalyze, isLoading, results }) {
    // --- State ---
    const [image, setImage] = useState(null);
    const [points, setPoints] = useState([]);
    const [seeds, setSeeds] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [segmentationStep, setSegmentationStep] = useState(0); 
    const [tolerance, setTolerance] = useState(25);
    const [showOverlay, setShowOverlay] = useState(true);
    const [statusText, setStatusText] = useState('กรุณาอัพโหลดภาพ CT Scan');

    // Radiomics state
    const [radiomicsFeatures, setRadiomicsFeatures] = useState({
        area: 0, circularity: 0, meanDensity: 0, heterogeneity: 0
    });
    const [probability, setProbability] = useState(0); // Local quick probability

    // Refs
    const fileInputRef = useRef(null);
    const originalCanvasRef = useRef(null);
    const resultCanvasRef = useRef(null);

    // Contexts
    const getCtx = (canvasRef) => canvasRef.current?.getContext('2d', { willReadFrequently: true });

    // Constants for drawing
    const ROI_COLOR = '#769382'; 

    // --- File Handling ---
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = originalCanvasRef.current;
                    const ctx = getCtx(originalCanvasRef);
                    canvas.width = 512;
                    canvas.height = 512;
                    ctx.drawImage(img, 0, 0, 512, 512);

                    const resCanvas = resultCanvasRef.current;
                    resCanvas.width = 512;
                    resCanvas.height = 512;
                    const resCtx = getCtx(resultCanvasRef);
                    resCtx.clearRect(0, 0, 512, 512);

                    setImage(img);
                    setPoints([]);
                    setSeeds([]);
                    setSegmentationStep(0);
                    setStatusText('ภาพพร้อมใช้งาน กรุณาวาดขอบเขต (Vector ROI)');
                    resetRadiomics();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const applyContrast = () => {
        if (!image) return;
        const ctx = getCtx(originalCanvasRef);
        ctx.drawImage(image, 0, 0, 512, 512);
        const imgData = ctx.getImageData(0, 0, 512, 512);
        const data = imgData.data;
        const factor = (259 * (128 + 255)) / (255 * (259 - 128));
        for (let i = 0; i < data.length; i += 4) {
            data[i] = clamp(factor * (data[i] - 128) + 128);
            data[i + 1] = clamp(factor * (data[i + 1] - 128) + 128);
            data[i + 2] = clamp(factor * (data[i + 2] - 128) + 128);
        }
        ctx.putImageData(imgData, 0, 0);
        setStatusText('ปรับความชัดเจน (Contrast Enhanced) เรียบร้อย');
    };

    const applyEqualization = () => {
        if (!image) return;
        const ctx = getCtx(originalCanvasRef);
        ctx.drawImage(image, 0, 0, 512, 512);
        const imgData = ctx.getImageData(0, 0, 512, 512);
        const data = imgData.data;

        // Histogram equalization on grayscale
        let hist = new Array(256).fill(0);
        for(let i=0; i<data.length; i+=4) {
            let gray = Math.round(0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]);
            hist[gray]++;
        }
        let cdf = new Array(256).fill(0);
        cdf[0] = hist[0];
        for(let i=1; i<256; i++) cdf[i] = cdf[i-1] + hist[i];
        let cdfMin = cdf.find(x => x > 0) || 0;
        const total = 512 * 512;
        
        let map = new Array(256);
        for(let i=0; i<256; i++) {
            map[i] = Math.round(((cdf[i] - cdfMin) / (total - cdfMin)) * 255);
        }

        for (let i = 0; i < data.length; i += 4) {
            let gray = Math.round(0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]);
            let mapped = map[gray];
            data[i] = mapped;
            data[i + 1] = mapped;
            data[i + 2] = mapped;
        }
        ctx.putImageData(imgData, 0, 0);
        setStatusText('ปรับสมดุลแสง (Equalization) เรียบร้อย');
    };

    // --- Interactive Tools ---
    const handleCanvasMouseDown = (e) => {
        if (!image) return;
        const rect = originalCanvasRef.current.getBoundingClientRect();
        const scaleX = 512 / rect.width;
        const scaleY = 512 / rect.height;
        const x = Math.round((e.clientX - rect.left) * scaleX);
        const y = Math.round((e.clientY - rect.top) * scaleY);

        if (segmentationStep === 0) {
            setIsDrawing(true);
            setPoints([{ x, y }]);
            setStatusText('กำลังวาดขอบเขต ROI...');
        } else if (segmentationStep === 1) {
            if (isPointInPolygon({ x, y }, points)) {
                // Add seed
                const newSeeds = [...seeds, { x, y }];
                setSeeds(newSeeds);
                processSegmentation(newSeeds);
                setStatusText(`เพิ่มจุด Seed ที่ ${newSeeds.length} และทำการ Region Growing`);
            } else {
                setStatusText('! จุด Seed ต้องอยู่ภายในกรอบสีเขียว (ROI)');
                setTimeout(() => setStatusText('สร้าง Seeds จุดที่ต้องการ...'), 2000);
            }
        }
    };

    const handleCanvasMouseMove = (e) => {
        if (!isDrawing || segmentationStep !== 0) return;
        const rect = originalCanvasRef.current.getBoundingClientRect();
        const scaleX = 512 / rect.width;
        const scaleY = 512 / rect.height;
        const x = Math.round((e.clientX - rect.left) * scaleX);
        const y = Math.round((e.clientY - rect.top) * scaleY);
        setPoints(prev => [...prev, { x, y }]);
        redrawOriginalCanvas([...points, { x, y }]);
    };

    const handleCanvasMouseUp = () => {
        if (isDrawing && segmentationStep === 0) {
            setIsDrawing(false);
            if (points.length > 2) {
                setSegmentationStep(1);
                setStatusText('สร้างขอบเขตสำเร็จ กรุณากดเลือกจุดศูนย์กลาง (Seed) ภายในกรอบ');
            } else {
                setPoints([]);
                redrawOriginalCanvas([]);
                setStatusText('การวาดผิดพลาด กรุณาวาดใหม่ใหม่อีกครั้ง');
            }
        }
    };

    const redrawOriginalCanvas = (currentPoints = points) => {
        if (!image) return;
        const ctx = getCtx(originalCanvasRef);
        // Redraw image
        ctx.drawImage(image, 0, 0, 512, 512);

        // Draw ROI
        if (currentPoints.length > 0) {
            ctx.beginPath();
            ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
            for (let i = 1; i < currentPoints.length; i++) {
                ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
            }
            if (!isDrawing && currentPoints.length > 2) ctx.closePath();
            
            ctx.strokeStyle = ROI_COLOR;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Highlight fill
            if (!isDrawing && currentPoints.length > 2) {
                ctx.fillStyle = 'rgba(118, 147, 130, 0.15)'; // hc-green very light
                ctx.fill();
            }
        }

        // Draw Seeds
        seeds.forEach(seed => {
            ctx.beginPath();
            ctx.arc(seed.x, seed.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#A74A4A'; // red marker for seed
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    };

    // Keep original canvas updated when points or seeds change
    useEffect(() => {
        if(!isDrawing) redrawOriginalCanvas();
    }, [points, seeds]);

    // Helpers
    const isPointInPolygon = (point, vs) => {
        let x = point.x, y = point.y;
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            let xi = vs[i].x, yi = vs[i].y;
            let xj = vs[j].x, yj = vs[j].y;
            let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    };
    const clamp = (val) => Math.min(255, Math.max(0, val));

    // --- Core Segmentation Logic ---
    const processSegmentation = (currentSeeds = seeds) => {
        if (currentSeeds.length === 0 || !image || points.length < 3) return;
        
        const originalCtx = getCtx(originalCanvasRef);
        const originalData = originalCtx.getImageData(0, 0, 512, 512);
        const data = originalData.data;

        // Bounding box of ROI to limit search
        let minX = 512, minY = 512, maxX = 0, maxY = 0;
        points.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });

        // Add padding
        minX = Math.max(0, Math.floor(minX) - 10);
        minY = Math.max(0, Math.floor(minY) - 10);
        maxX = Math.min(512, Math.ceil(maxX) + 10);
        maxY = Math.min(512, Math.ceil(maxY) + 10);

        let visited = new Uint8Array(512 * 512);
        let segmented = new Uint8Array(512 * 512);
        
        // We do region growing for EVERY seed
        currentSeeds.forEach(seed => {
            let queue = [seed];
            let startIdx = (seed.y * 512 + seed.x) * 4;
            // Target intensity for THIS seed
            let targetIntensity = Math.round(0.299 * data[startIdx] + 0.587 * data[startIdx+1] + 0.114 * data[startIdx+2]);

            while (queue.length > 0) {
                let p = queue.shift();
                let idx = p.y * 512 + p.x;

                if (visited[idx]) continue;
                if (!isPointInPolygon(p, points)) { visited[idx] = 1; continue; }

                let pxIdx = idx * 4;
                let intensity = Math.round(0.299 * data[pxIdx] + 0.587 * data[pxIdx+1] + 0.114 * data[pxIdx+2]);

                if (Math.abs(intensity - targetIntensity) <= tolerance) {
                    visited[idx] = 1;
                    segmented[idx] = 255;

                    if (p.x > minX) queue.push({x: p.x - 1, y: p.y});
                    if (p.x < maxX - 1) queue.push({x: p.x + 1, y: p.y});
                    if (p.y > minY) queue.push({x: p.x, y: p.y - 1});
                    if (p.y < maxY - 1) queue.push({x: p.x, y: p.y + 1});
                }
            }
        });

        updateResultCanvasAndMetrics(segmented, minX, minY, maxX, maxY);
    };

    const updateResultCanvasAndMetrics = (segmentedBinary, minX, minY, maxX, maxY) => {
        const resCtx = getCtx(resultCanvasRef);
        const originalData = getCtx(originalCanvasRef).getImageData(0, 0, 512, 512).data;
        const resImgData = new ImageData(512, 512);
        const resData = resImgData.data;

        let area = 0;
        let perimeter = 0;
        let intensities = [];

        for (let y = minY; y < maxY; y++) {
            for (let x = minX; x < maxX; x++) {
                let idx = y * 512 + x;
                let pxIdx = idx * 4;
                if (segmentedBinary[idx] === 255) {
                    area++;
                    // Overlay color (red-ish or true)
                    resData[pxIdx] = 167; // R
                    resData[pxIdx+1] = 74; // G
                    resData[pxIdx+2] = 74; // B
                    resData[pxIdx+3] = showOverlay ? 180 : 255;
                    
                    let intensity = Math.round(0.299 * originalData[pxIdx] + 0.587 * originalData[pxIdx+1] + 0.114 * originalData[pxIdx+2]);
                    intensities.push(intensity);

                    // Perimeter check
                    if (segmentedBinary[idx-1]===0 || segmentedBinary[idx+1]===0 || segmentedBinary[idx-512]===0 || segmentedBinary[idx+512]===0) {
                        perimeter++;
                    }
                } else if (showOverlay) {
                    // Show original image in background
                    resData[pxIdx] = originalData[pxIdx];
                    resData[pxIdx+1] = originalData[pxIdx+1];
                    resData[pxIdx+2] = originalData[pxIdx+2];
                    resData[pxIdx+3] = 255;
                } else {
                    resData[pxIdx+3] = 0; // Transparent
                }
            }
        }
        resCtx.putImageData(resImgData, 0, 0);

        // Calc features
        if (area > 0) {
            let circularity = (4 * Math.PI * area) / (Math.pow(perimeter || 1, 2));
            let mean = intensities.reduce((a, b) => a + b, 0) / area;
            let variance = intensities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / area;
            let heterogeneity = Math.sqrt(variance) / mean;

            setRadiomicsFeatures({
                area: area,
                circularity: Math.min(1, circularity),
                meanDensity: mean,
                heterogeneity: heterogeneity
            });

            // Local Mock probability
            let riskScore = 0;
            if (area > 500) riskScore += 1;
            if (area > 1000) riskScore += 1;
            if (circularity < 0.6) riskScore += 2;
            else if (circularity < 0.8) riskScore += 1;
            if (heterogeneity > 0.15) riskScore += 1;
            if (mean > 150) riskScore += 1;
            
            let p = 1 / (1 + Math.exp(-(riskScore - 2)));
            setProbability(p);
        } else {
            resetRadiomics();
        }
    };

    const resetRadiomics = () => {
        setRadiomicsFeatures({area: 0, circularity: 0, meanDensity: 0, heterogeneity: 0});
        setProbability(0);
    };

    // Morphology wrappers
    const applyMorphology = (operation) => {
        if(seeds.length === 0) return;
        setStatusText(`Running mathematical morphology: ${operation}...`);
        
        // Read current result binary
        const resCtx = getCtx(resultCanvasRef);
        const currentData = resCtx.getImageData(0, 0, 512, 512).data;
        let binary = new Uint8Array(512 * 512);

        let minX = 512, minY = 512, maxX = 0, maxY = 0; // recalculate bounding

        for(let i=0; i<512*512; i++) {
            if(currentData[i*4+3] > 0 && currentData[i*4] === 167) { 
                binary[i] = 255; 
                let x = i % 512; let y = Math.floor(i / 512);
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
        
        // Pad
        minX = Math.max(0, minX - 5); minY = Math.max(0, minY - 5);
        maxX = Math.min(512, maxX + 5); maxY = Math.min(512, maxY + 5);

        let newBinary = new Uint8Array(512 * 512);

        const erode = (bin) => {
            let out = new Uint8Array(512*512);
            for(let y=minY+1; y<maxY-1; y++){
                for(let x=minX+1; x<maxX-1; x++){
                    let idx = y*512+x;
                    if(bin[idx]===255 && bin[idx-1]===255 && bin[idx+1]===255 && bin[idx-512]===255 && bin[idx+512]===255){
                        out[idx]=255;
                    }
                }
            }
            return out;
        };

        const dilate = (bin) => {
            let out = new Uint8Array(bin); // Copy
            for(let y=minY+1; y<maxY-1; y++){
                for(let x=minX+1; x<maxX-1; x++){
                    let idx = y*512+x;
                    if(bin[idx]===255) {
                        out[idx-1]=255; out[idx+1]=255; out[idx-512]=255; out[idx+512]=255;
                        out[idx-513]=255; out[idx-511]=255; out[idx+511]=255; out[idx+513]=255; // 8 conn
                    }
                }
            }
            return out;
        };

        if(operation === 'erosion') newBinary = erode(binary);
        else if(operation === 'dilation') newBinary = dilate(binary);
        else if(operation === 'opening') newBinary = dilate(erode(binary));
        else if(operation === 'closing') newBinary = erode(dilate(binary));

        updateResultCanvasAndMetrics(newBinary, minX, minY, maxX, maxY);
        setStatusText(`Morphology '${operation}' applied.`);
    };

    // Actions
    const handleUndoSeed = () => {
        if(seeds.length > 0) {
            const newSeeds = seeds.slice(0, -1);
            setSeeds(newSeeds);
            if(newSeeds.length === 0) {
                const resCtx = getCtx(resultCanvasRef);
                resCtx.clearRect(0,0,512,512);
                resetRadiomics();
                setStatusText('ลบจุด Seed ทั้งหมดแล้ว กรุณาเลือกจุดใหม่');
            } else {
                processSegmentation(newSeeds);
            }
        }
    };

    const handleClearAll = () => {
        setPoints([]);
        setSeeds([]);
        setSegmentationStep(0);
        const resCtx = getCtx(resultCanvasRef);
        resCtx.clearRect(0,0,512,512);
        resetRadiomics();
        setStatusText('รีเซ็ต ROI เรียบร้อย เริ่มวาดใหม่ได้');
    };

    const handleNewScan = () => {
        setImage(null);
        setPoints([]);
        setSeeds([]);
        setSegmentationStep(0);
        resetRadiomics();
        const ctx = getCtx(originalCanvasRef);
        ctx.clearRect(0,0,512,512);
        const resCtx = getCtx(resultCanvasRef);
        resCtx.clearRect(0,0,512,512);
        setStatusText('เริ่มงานใหม่ กรุณาอัพโหลดภาพ CT Scan');
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    // Effect for Tolerance changed -> re-run
    useEffect(() => {
        if(seeds.length > 0) {
            processSegmentation(seeds);
        }
    }, [tolerance, showOverlay]);

    // Handle Deep AI Analysis trigger
    const triggerAnalysis = () => {
        if (!image || seeds.length === 0) {
            setStatusText('กรุณาวาด ROI และ Seed เพื่อ segment ก่อนวิเคราะห์!');
            return;
        }

        // Get the result canvas as base64
        const imageDataUrl = originalCanvasRef.current.toDataURL("image/jpeg");

        onAnalyze({
            image: imageDataUrl,
            radiomics: radiomicsFeatures
        });
    };

    return (
      <>
        {/* Left Panel: Controls */}
        <div className="lg:col-span-3 space-y-6">
            <div className="panel p-5">
                <div className="flex items-center gap-3 mb-4 border-b border-hc-light/30 pb-3">
                    <div className="bg-hc-cream text-hc-green w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">01</div>
                    <h2 className="text-lg font-serif font-bold text-hc-dark uppercase tracking-wide">Image Source</h2>
                </div>
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-hc-light hover:border-hc-green bg-hc-cream/30 hover:bg-hc-cream transition-all rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer text-center gap-3 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-hc-green/5 -translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    <i className="fas fa-cloud-upload-alt text-4xl text-hc-green/80 group-hover:scale-110 transition-transform"></i>
                    <div>
                        <p className="font-bold text-hc-dark text-sm">Upload CT Scan (DICOM/PNG)</p>
                        <p className="text-xs text-hc-light mt-1">คลิกเพื่อเลือกไฟล์ภาพ</p>
                    </div>
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                    />
                </div>
            </div>

            <div className="panel p-5">
                <div className="flex items-center gap-3 mb-4 border-b border-hc-light/30 pb-3">
                    <div className="bg-hc-cream text-hc-green w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">02</div>
                    <h2 className="text-lg font-serif font-bold text-hc-dark uppercase tracking-wide">Enhancement</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={applyContrast} disabled={!image} className="bg-white border border-hc-light/50 text-hc-dark text-xs py-3 px-2 rounded-xl font-bold uppercase tracking-wider hover:bg-hc-cream hover:border-hc-green hover:text-hc-green transition-all shadow-sm active:scale-[0.98] flex flex-col items-center gap-2 disabled:opacity-50 disabled:pointer-events-none">
                        <i className="fas fa-adjust text-lg"></i>
                        Soft Contrast
                    </button>
                    <button onClick={applyEqualization} disabled={!image} className="bg-white border border-hc-light/50 text-hc-dark text-xs py-3 px-2 rounded-xl font-bold uppercase tracking-wider hover:bg-hc-cream hover:border-hc-green hover:text-hc-green transition-all shadow-sm active:scale-[0.98] flex flex-col items-center gap-2 disabled:opacity-50 disabled:pointer-events-none">
                        <i className="fas fa-chart-bar text-lg"></i>
                        Equalization
                    </button>
                </div>
            </div>

            <div className="panel p-5">
                <div className="flex items-center gap-3 mb-4 border-b border-hc-light/30 pb-3">
                    <div className="bg-hc-cream text-hc-green w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">03</div>
                    <h2 className="text-lg font-serif font-bold text-hc-dark uppercase tracking-wide">Segmentation</h2>
                </div>
                
                <div className="space-y-5">
                    {/* Step Tabs/Indicators */}
                    <div className="flex bg-hc-cream/50 rounded-lg p-1 relative">
                        <div className={`flex-1 text-center py-2 text-xs font-bold uppercase rounded-md transition-all ${segmentationStep === 0 ? 'bg-white shadow-sm text-hc-green' : 'text-hc-light'}`}>
                            1. DRAW ROI
                        </div>
                        <div className={`flex-1 text-center py-2 text-xs font-bold uppercase rounded-md transition-all ${segmentationStep === 1 ? 'bg-white shadow-sm text-hc-green' : 'text-hc-light'}`}>
                            2. MULTI SEEDS
                        </div>
                    </div>

                    <div className="bg-hc-cream/30 p-3 rounded-xl border border-hc-light/20">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold uppercase text-hc-dark">Region Tolerance</label>
                            <span className="text-xs font-bold bg-white px-2 py-1 rounded text-hc-green shadow-sm border border-hc-light/20">{tolerance}</span>
                        </div>
                        <input type="range" min="5" max="100" value={tolerance} onChange={(e)=>setTolerance(parseInt(e.target.value))} className="w-full" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-hc-light tracking-widest px-2">Morphological Ops (Active)</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={()=>applyMorphology('erosion')} disabled={seeds.length===0} className="border border-hc-light/40 py-2 rounded-lg text-xs font-bold text-hc-dark hover:bg-hc-cream hover:text-hc-green transition-all shadow-sm disabled:opacity-50">Erosion</button>
                            <button onClick={()=>applyMorphology('dilation')} disabled={seeds.length===0} className="border border-hc-light/40 py-2 rounded-lg text-xs font-bold text-hc-dark hover:bg-hc-cream hover:text-hc-green transition-all shadow-sm disabled:opacity-50">Dilation</button>
                            <button onClick={()=>applyMorphology('opening')} disabled={seeds.length===0} className="border border-hc-light/40 py-2 rounded-lg text-xs font-bold text-hc-dark hover:bg-hc-cream hover:text-hc-green transition-all shadow-sm disabled:opacity-50">Opening</button>
                            <button onClick={()=>applyMorphology('closing')} disabled={seeds.length===0} className="border border-hc-light/40 py-2 rounded-lg text-xs font-bold text-hc-dark hover:bg-hc-cream hover:text-hc-green transition-all shadow-sm disabled:opacity-50">Closing</button>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-hc-light/30 flex justify-between items-center">
                        <label className="text-xs font-bold text-hc-dark uppercase flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={showOverlay} onChange={(e)=>setShowOverlay(e.target.checked)} className="rounded text-hc-green focus:ring-hc-green" />
                            Show Base Image
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                        <button onClick={handleUndoSeed} disabled={seeds.length === 0} className="py-2 px-3 border border-hc-light/50 text-hc-dark text-xs font-bold uppercase rounded-lg hover:bg-hc-cream transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm">
                            <i className="fas fa-undo"></i> Undo Seed
                        </button>
                        <button onClick={handleClearAll} disabled={points.length === 0} className="py-2 px-3 border border-[#A74A4A]/30 text-[#A74A4A] text-xs font-bold uppercase rounded-lg hover:bg-[#FDF6F6] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm">
                            <i className="fas fa-trash-alt"></i> Clear All
                        </button>
                    </div>

                    <button onClick={handleNewScan} className="w-full py-3 mt-2 border-2 border-hc-dark border-dashed text-hc-dark text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-hc-dark hover:text-white transition-all">
                        <i className="fas fa-file-medical mr-2"></i> New Scan
                    </button>
                </div>
            </div>
        </div>

        {/* Center Panel: Canvases */}
        <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="panel p-2 flex-col flex bg-[#1a1c1b] border-hc-dark shadow-2xl relative group pb-10">
                <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-widest text-[#F3EFE3] border border-white/10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-hc-green animate-pulse"></span>
                    Workspace <span className="opacity-50">|</span> <span className="text-hc-light">Original CT</span>
                </div>
                
                <div className="canvas-container w-full aspect-square border-none shadow-none m-auto overflow-hidden relative">
                    {!image && (
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                             <div className="text-white/20 flex flex-col items-center">
                                 <i className="fas fa-image text-6xl mb-2"></i>
                                 <span className="text-[#F3EFE3] uppercase tracking-widest text-xs font-bold">No Image</span>
                             </div>
                         </div>
                    )}
                    <canvas 
                        ref={originalCanvasRef} 
                        className={`max-w-full max-h-full object-contain ${image ? 'cursor-crosshair' : ''}`}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                    ></canvas>
                    
                    {/* Crosshair guide overlay when drawing ROI */}
                    {isDrawing && segmentationStep === 0 && (
                        <div className="absolute inset-0 pointer-events-none border border-hc-green/30 animate-pulse"></div>
                    )}
                </div>
            </div>

            <div className="panel p-2 flex-col flex bg-[#1a1c1b] border-hc-dark shadow-2xl relative pb-10">
                <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-widest text-[#F3EFE3] border border-white/10 flex items-center gap-2">
                    <i className="fas fa-microscope text-hc-beige"></i>
                    AI Mask <span className="opacity-50">|</span> <span className="text-hc-light">Segmentation Result</span>
                </div>
                
                <div className="canvas-container w-full aspect-square border-none shadow-none m-auto relative">
                     <canvas ref={resultCanvasRef} className="max-w-full max-h-full object-contain pointer-events-none"></canvas>
                </div>
            </div>

            <div className="bg-hc-dark text-hc-cream p-3 rounded-xl border border-hc-dark shadow-lg flex items-center px-4 gap-3">
                <i className="fas fa-terminal text-hc-green/60"></i>
                <span className="text-xs font-mono lowercase tracking-wider opacity-80">{statusText}</span>
            </div>
        </div>

        {/* Right Panel: Advanced Classification */}
        <div className="lg:col-span-4 space-y-6">
            <div className="panel h-full flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="bg-hc-dark p-6 text-white text-center relative">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                    <i className="fas fa-clipboard-check text-3xl mb-3 text-hc-green"></i>
                    <h2 className="text-xl font-serif font-bold uppercase tracking-widest text-hc-beige">Diagnostic Report</h2>
                    <p className="text-[10px] uppercase tracking-widest opacity-60 mt-1">LungCare Radiomics AI Engine</p>
                </div>

                <div className="p-6 flex-1 flex flex-col gap-6">
                    
                    {/* Local Probability Banner */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold uppercase text-hc-light tracking-widest">Base Malignancy Index</label>
                        <div className="flex items-end gap-3">
                            <span className={`text-5xl font-mono tracking-tighter ${probability > 0.6 ? 'text-[#A74A4A]' : probability > 0.3 ? 'text-hc-dark' : 'text-hc-green'}`}>
                                {(probability * 100).toFixed(1)}<span className="text-2xl text-hc-light">%</span>
                            </span>
                            <div className="pb-1 text-xs font-bold uppercase px-3 py-1 rounded border bg-hc-cream border-hc-light/30">
                                {probability > 0.6 ? 'High Risk' : probability > 0.3 ? 'Indeterminate' : 'Low Risk'}
                            </div>
                        </div>
                        {/* Progress Bar */}
                         <div className="h-1.5 w-full bg-hc-cream rounded-full mt-2 overflow-hidden flex">
                            <div className="h-full bg-hc-green transition-all duration-1000" style={{width: `${Math.min(probability*100, 30)}%`}}></div>
                            <div className="h-full bg-yellow-500/80 transition-all duration-1000" style={{width: `${Math.max(0, Math.min((probability-0.3)*100, 30))}%`}}></div>
                            <div className="h-full bg-[#A74A4A] transition-all duration-1000" style={{width: `${Math.max(0, (probability-0.6)*100)}%`}}></div>
                        </div>
                    </div>

                    {/* Radiomics Data */}
                    <div className="bg-hc-cream/50 rounded-xl p-4 border border-hc-light/20">
                        <label className="text-[10px] font-bold uppercase text-hc-light tracking-widest flex items-center gap-2 mb-3">
                            <i className="fas fa-chart-pie"></i> Local Radiomics
                        </label>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                            <div>
                                <p className="text-[10px] text-hc-light uppercase font-bold">Area (px)</p>
                                <p className="text-lg font-mono text-hc-dark font-bold">{Math.round(radiomicsFeatures.area).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-hc-light uppercase font-bold">Circularity</p>
                                <p className="text-lg font-mono text-hc-dark font-bold">{radiomicsFeatures.circularity.toFixed(3)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-hc-light uppercase font-bold">Mean Density</p>
                                <p className="text-lg font-mono text-hc-dark font-bold">{Math.round(radiomicsFeatures.meanDensity)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-hc-light uppercase font-bold">Heterogeneity</p>
                                <p className="text-lg font-mono text-hc-dark font-bold">{radiomicsFeatures.heterogeneity.toFixed(3)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Button for NextJS AI Backend */}
                    <div className="mt-auto">
                        <button 
                            onClick={triggerAnalysis}
                            disabled={isLoading || seeds.length === 0}
                            className="w-full bg-hc-dark text-white font-serif text-sm uppercase tracking-widest py-4 rounded-xl shadow-lg hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {isLoading ? (
                                <><i className="fas fa-circle-notch fa-spin"></i> Analyzing with Cloud AI...</>
                            ) : (
                                <>Generate AI Report <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i></>
                            )}
                        </button>
                    </div>

                    {/* Cloud AI Results Display */}
                    {results && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white border border-hc-green/40 p-4 rounded-xl shadow-md relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                <i className="fas fa-robot text-5xl"></i>
                            </div>
                            <h3 className="text-xs font-bold text-hc-green uppercase tracking-widest mb-3 flex items-center gap-2">
                                <i className="fas fa-check-circle"></i> AI Conclusion
                            </h3>
                            
                            <div className="text-sm text-hc-dark font-bold mb-2">
                                การประเมิน: <span className={results.malignancyRisk > 0.6 ? 'text-[#A74A4A]' : 'text-hc-green'}>{results.assessment || "พบความเสี่ยง"}</span>
                            </div>

                            <ul className="reason-list text-hc-dark text-xs leading-relaxed opacity-90 pl-1">
                                {results.reasons ? results.reasons.map((r, i) => <li key={i}>{r}</li>) : (
                                    <li>ลักษณะของก้อนเนื้อบ่งชี้ถึงความจำเป็นในการติดตามผล</li>
                                )}
                            </ul>
                        </div>
                    )}

                </div>
            </div>
        </div>
      </>
    );
}
