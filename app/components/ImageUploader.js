"use client";
import { useState, useRef } from "react";
import styles from "./ImageUploader.module.css";

export default function ImageUploader({ onAnalyze, isLoading }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    if (isLoading) return;
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyzeClick = () => {
    if (selectedFile) {
      onAnalyze(selectedFile);
    }
  };

  return (
    <div className={styles.wrapper}>
      {!previewUrl ? (
        <div
          className={`${styles.uploaderContainer} ${isDragging ? styles.dragging : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept="image/*"
            className={styles.input}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <div className={styles.label}>
            <svg className={styles.uploadIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p style={{ fontWeight: 600 }}>Click or drag image to upload</p>
            <p style={{ fontSize: '0.85rem' }}>Supported formats: JPEG, PNG</p>
          </div>
        </div>
      ) : (
        <div className={styles.previewContainer}>
          <img src={previewUrl} alt="Preview" className={styles.previewImage} />
          <button className={styles.removeBtn} onClick={clearImage} disabled={isLoading} title="Remove Image">
            &times;
          </button>
        </div>
      )}

      {previewUrl && (
        <button 
          className={styles.analyzeBtn} 
          onClick={handleAnalyzeClick}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className={styles.loadingSpinner} />
              Analyzing...
            </>
          ) : (
            "Analyze Image"
          )}
        </button>
      )}
    </div>
  );
}
