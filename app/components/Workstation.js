"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./Workstation.module.css";

export default function Workstation({ onAnalyze, isLoading, results }) {
  const [cvReady, setCvReady] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Image Processing States
  const [contrast, setContrast] = useState(1.0);
  const [brightness, setBrightness] = useState(0);
  const [threshold, setThreshold] = useState(127);
  const [invertThreshold, setInvertThreshold] = useState(false);
  const [erodeIters, setErodeIters] = useState(0);
  const [dilateIters, setDilateIters] = useState(0);
  
  // Extracted Features State
  // Extracted Features State
  const [features, setFeatures] = useState({ size: 0, irregularity: 0 });

  // ROI State
  const [isDrawing, setIsDrawing] = useState(false);
  const [roi, setRoi] = useState(null); // {x, y, width, height}
  const [startPos, setStartPos] = useState({x: 0, y: 0});

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const baseImageRef = useRef(null); // original image data

  // Check for OpenCV initialization
  useEffect(() => {
    const checkCv = () => {
      if (typeof window !== "undefined" && window.cv && window.cv.Mat) {
        setCvReady(true);
      } else {
        setTimeout(checkCv, 500);
      }
    };
    checkCv();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          baseImageRef.current = img;
          setImageLoaded(true);
          processImage();
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = useCallback(() => {
    if (!cvReady || !baseImageRef.current || !canvasRef.current) return;

    try {
      const cv = window.cv;
      
      // Load original image into OpenCV Mat
      let src = cv.imread(baseImageRef.current);
      let enhanced = new cv.Mat();
      let gray = new cv.Mat();
      let thresh = new cv.Mat();
      
      // 1. Enhancement (Contrast / Brightness)
      cv.convertScaleAbs(src, enhanced, contrast, brightness);
      
      // 2. Grayscale for segmentation
      cv.cvtColor(enhanced, gray, cv.COLOR_RGBA2GRAY, 0);
      
      // 3. Thresholding
      const threshType = invertThreshold ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY;
      cv.threshold(gray, thresh, threshold, 255, threshType);
      
      // 4. Morphology
      let M = cv.Mat.ones(3, 3, cv.CV_8U);
      if (erodeIters > 0) {
        cv.erode(thresh, thresh, M, new cv.Point(-1, -1), erodeIters);
      }
      if (dilateIters > 0) {
        cv.dilate(thresh, thresh, M, new cv.Point(-1, -1), dilateIters);
      }
      
      // 4.5. Apply ROI Mask if drawn
      if (roi && roi.width > 5 && roi.height > 5) {
        let mask = cv.Mat.zeros(thresh.rows, thresh.cols, cv.CV_8U);
        let rect = new cv.Rect(Math.round(roi.x), Math.round(roi.y), Math.round(roi.width), Math.round(roi.height));
        
        // Clamp rect to image bounds safely
        rect.x = Math.max(0, Math.min(rect.x, mask.cols - 1));
        rect.y = Math.max(0, Math.min(rect.y, mask.rows - 1));
        rect.width = Math.min(mask.cols - rect.x, rect.width);
        rect.height = Math.min(mask.rows - rect.y, rect.height);
        
        if (rect.width > 0 && rect.height > 0) {
          let roiMask = mask.roi(rect);
          roiMask.setTo(new cv.Scalar(255));
          
          cv.bitwise_and(thresh, mask, thresh); // Apply mask
          
          // Draw the ROI bounding box to inform the user
          cv.rectangle(enhanced, new cv.Point(rect.x, rect.y), new cv.Point(rect.x + rect.width, rect.y + rect.height), new cv.Scalar(0, 150, 255, 255), 2);
          roiMask.delete();
        }
        mask.delete();
      }
      
      // 5. Contours and Feature Extraction
      let contours = new cv.MatVector();
      let hierarchy = new cv.Mat();
      cv.findContours(thresh, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
      
      let largestArea = 0;
      let largestIndex = -1;
      let perimeter = 0;
      
      for (let i = 0; i < contours.size(); ++i) {
        let cnt = contours.get(i);
        let area = cv.contourArea(cnt, false);
        if (area > largestArea) {
          largestArea = area;
          largestIndex = i;
          perimeter = cv.arcLength(cnt, true);
        }
      }
      
      let irregularityScore = 1.0;
      if (largestArea > 0) {
        // Circle has irregularity of 1.0. Higher means more jagged (spiculated).
        irregularityScore = (perimeter * perimeter) / (4 * Math.PI * largestArea);
        
        // Highlight segmentation: Semi-transparent fill + Bold Outline
        let overlay = cv.Mat.zeros(enhanced.rows, enhanced.cols, enhanced.type());
        let fillColor = new cv.Scalar(255, 50, 150, 255); // Bright pink/magenta
        let lineColor = new cv.Scalar(0, 255, 0, 255); // Green outline
        
        // Fill the contour on the overlay Mat (-1 = cv.FILLED)
        cv.drawContours(overlay, contours, largestIndex, fillColor, -1, cv.LINE_8, hierarchy, 0);
        
        // Blend overlay with the original enhanced image (0.35 opacity)
        cv.addWeighted(enhanced, 1.0, overlay, 0.35, 0, enhanced);
        
        // Draw the stark contour outline
        cv.drawContours(enhanced, contours, largestIndex, lineColor, 2, cv.LINE_8, hierarchy, 0);
        
        overlay.delete();
      }
      
      setFeatures({
         size: Math.round(largestArea),
         irregularity: irregularityScore.toFixed(2)
      });
      
      // Output to canvas
      cv.imshow(canvasRef.current, enhanced);

      // Cleanup Mats to avoid memory leak
      src.delete();
      enhanced.delete();
      gray.delete();
      thresh.delete();
      M.delete();
      contours.delete();
      hierarchy.delete();
    } catch (e) {
      console.error("OpenCV Processing Error:", e);
    }
  }, [cvReady, contrast, brightness, threshold, invertThreshold, erodeIters, dilateIters, roi]);

  // Re-run processing when settings change
  useEffect(() => {
    if (imageLoaded && !isDrawing) {
      processImage();
      
      // If AI returns bounding box results, draw them directly on top of the final rendered canvas
      if (results && results.length > 0 && cvReady && canvasRef.current) {
        try {
           const cv = window.cv;
           // Read the current state of the canvas into a new Mat
           let finalMat = cv.imread(canvasRef.current);
           
           results.forEach((res) => {
             if (res.boundingBox) {
               const { ymin, xmin, ymax, xmax } = res.boundingBox;
               // Gemini uses normalized coordinates [0, 1000]
               const pt1 = new cv.Point((xmin / 1000) * finalMat.cols, (ymin / 1000) * finalMat.rows);
               const pt2 = new cv.Point((xmax / 1000) * finalMat.cols, (ymax / 1000) * finalMat.rows);
               
               // Draw the AI bounding box (Bright Red)
               cv.rectangle(finalMat, pt1, pt2, new cv.Scalar(255, 0, 0, 255), 4);
               
               // Draw background box for text label
               cv.rectangle(finalMat, new cv.Point(pt1.x, pt1.y - 30), new cv.Point(pt1.x + 180, pt1.y), new cv.Scalar(255, 0, 0, 255), -1);
               // Add label text
               cv.putText(finalMat, `AI: ${res.label}`, new cv.Point(pt1.x + 5, pt1.y - 7), cv.FONT_HERSHEY_SIMPLEX, 0.7, new cv.Scalar(255, 255, 255, 255), 2);
             }
           });
           
           cv.imshow(canvasRef.current, finalMat);
           finalMat.delete();
        } catch(e) {
           console.error("Error drawing AI bounding box", e);
        }
      }
    }
  }, [contrast, brightness, threshold, invertThreshold, erodeIters, dilateIters, imageLoaded, processImage, roi, isDrawing, results, cvReady]);

  // Canvas Mouse Tools
  const handleMouseDown = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setStartPos({x, y});
    setIsDrawing(true);
    setRoi({x, y, width: 0, height: 0});
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setRoi({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y)
    });
    // Dynamically update image to show bounding box while drawing
    processImage(); 
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const triggerAnalyze = () => {
    if (canvasRef.current) {
      // Get base64 string directly from processed canvas to send to AI
      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.9);
      onAnalyze({
         imageBase64: dataUrl.split(",")[1], // strip data prefix
         mimeType: "image/jpeg",
         features: features
      });
    }
  };

  if (!cvReady) {
    return <div style={{ textAlign: "center", padding: "3rem" }}>Loading Workstation Engines (OpenCV)...</div>;
  }

  return (
    <div className={styles.workstationContainer}>
      {!imageLoaded ? (
        <div className={styles.uploaderContainer} onClick={() => fileInputRef.current?.click()}>
          <input type="file" accept="image/*" style={{ display: "none" }} ref={fileInputRef} onChange={handleFileChange} />
          <h3 style={{ marginBottom: "1rem" }}>Upload Scan</h3>
          <p style={{ color: "var(--text-muted)" }}>Select a radiological image to open in the workstation.</p>
        </div>
      ) : (
        <div className={styles.workspace}>
          <div className={styles.canvasPanel}>
             <div className={styles.canvasWrapper}>
                <canvas 
                  ref={canvasRef} 
                  className={styles.canvas}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{ cursor: 'crosshair' }}
                ></canvas>
             </div>
             <button onClick={() => { setImageLoaded(false); setErodeIters(0); setDilateIters(0); setRoi(null); }} style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "var(--border-color)" }}>
                Start Over
             </button>
             {roi && (
               <button onClick={() => setRoi(null)} style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "var(--warning)", color: "white", marginTop: "0.5rem" }}>
                 Clear Selection Box
               </button>
             )}
          </div>
          
          <div className={styles.controlsPanel}>
            <div className={styles.controlGroup}>
              <h4 className={styles.controlHeader}>Enhancement</h4>
              <div className={styles.sliderRow}>
                 <label>Contrast (Window Width) <span>{contrast.toFixed(1)}</span></label>
                 <input type="range" min="1.0" max="3.0" step="0.1" value={contrast} onChange={(e) => setContrast(parseFloat(e.target.value))} />
              </div>
              <div className={styles.sliderRow}>
                 <label>Brightness (Window Level) <span>{brightness}</span></label>
                 <input type="range" min="-100" max="100" step="5" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} />
              </div>
            </div>

            <div className={styles.controlGroup}>
              <h4 className={styles.controlHeader}>Segmentation (Edge Detection)</h4>
              <div className={styles.sliderRow}>
                 <label>Threshold <span>{threshold}</span></label>
                 <input type="range" min="0" max="255" step="1" value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value))} />
                 <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '0.5rem', fontWeight: 400 }}>
                   <input type="checkbox" checked={invertThreshold} onChange={(e) => setInvertThreshold(e.target.checked)} style={{ width: 'auto' }} />
                   Invert Selection (Select dark areas)
                 </label>
              </div>
              <div className={styles.morphRow}>
                 <label>Erosion Iterations: <span>{erodeIters}</span></label>
                 <div className={styles.morphControls}>
                    <button onClick={() => setErodeIters(e => Math.max(0, e - 1))}>-</button>
                    <button onClick={() => setErodeIters(e => e + 1)}>+</button>
                 </div>
              </div>
              <div className={styles.morphRow}>
                 <label>Dilation Iterations: <span>{dilateIters}</span></label>
                 <div className={styles.morphControls}>
                    <button onClick={() => setDilateIters(d => Math.max(0, d - 1))}>-</button>
                    <button onClick={() => setDilateIters(d => d + 1)}>+</button>
                 </div>
              </div>
              
              <div className={styles.featuresPanel}>
                 <div className={styles.featureItem}>
                    <span>Est. Mass Size:</span>
                    <span className={styles.featureValue}>{features.size} px</span>
                 </div>
                 <div className={styles.featureItem}>
                    <span>Edge Irregularity:</span>
                    <span className={styles.featureValue}>{features.irregularity} (1.0 = smooth)</span>
                 </div>
                 <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                    * High irregularity implies spiculated margins often seen in malignant tumors.
                 </p>
              </div>
            </div>

            <button className={styles.analyzeBtn} onClick={triggerAnalyze} disabled={isLoading}>
              {isLoading ? "Classifying..." : "AI Classify (Benign / Malignant)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
