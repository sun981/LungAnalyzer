"use client";
import styles from "./ResultsDisplay.module.css";
import { useEffect, useState } from "react";

export default function ResultsDisplay({ data, error }) {
  const [animatedData, setAnimatedData] = useState([]);

  useEffect(() => {
    if (data) {
      setTimeout(() => {
        setAnimatedData(data);
      }, 100);
    } else {
      setAnimatedData([]);
    }
  }, [data]);

  const getColorClass = (prob) => {
    if (prob > 75) return styles.highProb;
    if (prob > 30) return styles.medProb;
    return "";
  };

  return (
    <div className={styles.resultsContainer}>
      <h2 className={styles.title}>Analysis Results</h2>
      
      {error ? (
        <div className={styles.emptyState}>
          <div style={{ color: 'var(--danger)' }}>
            <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p>{error}</p>
        </div>
      ) : !data ? (
        <div className={styles.emptyState}>
          <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>Upload an image and run the analysis to view potential tumor classifications.</p>
        </div>
      ) : (
        <div className={styles.resultList}>
          {data.map((item, index) => {
            const prob = item.probability || 0;
            const animateProb = animatedData.length > 0 ? prob : 0;
            const colorClass = getColorClass(prob);
            
            return (
              <div key={index} className={styles.resultItem}>
                <div className={styles.header}>
                  <span className={styles.label}>{item.label}</span>
                  <span className={`${styles.percentage} ${prob > 75 ? styles.textHigh : prob > 30 ? styles.textMed : ""}`}>
                    {prob}%
                  </span>
                </div>
                <div className={styles.barBackground}>
                  <div 
                    className={`${styles.barFill} ${colorClass}`} 
                    style={{ width: `${animateProb}%` }} 
                  />
                </div>
                {item.description && (
                  <p className={styles.description}>{item.description}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
