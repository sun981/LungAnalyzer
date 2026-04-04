"use client";
import styles from "./page.module.css";
import Workstation from "./components/Workstation";
import ResultsDisplay from "./components/ResultsDisplay";
import { useState } from "react";

export default function Home() {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async (payload) => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze image");
      }

      setResults(data.classifications);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <svg className={styles.icon} width="36" height="36" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Radiological <span>Analyzer</span>
        </h1>
        <p className={styles.subtitle}>
          Upload MRI, CT, or X-ray scans to receive instant AI-powered tumor probability classifications.
        </p>
      </header>

      <main style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <Workstation onAnalyze={handleAnalyze} isLoading={isLoading} results={results} />
        {(results || error || isLoading) && (
          <ResultsDisplay data={results} error={error} />
        )}
      </main>

      <div className="disclaimer">
        <strong>Disclaimer:</strong> This application uses Google's Gemini AI to analyze radiological images for educational and demonstration purposes only. The results do not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider with any questions regarding a medical condition.
      </div>
    </div>
  );
}
