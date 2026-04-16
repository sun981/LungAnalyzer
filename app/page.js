"use client";
import Workstation from "./components/Workstation";
import ResultsDisplay from "./components/ResultsDisplay";
import { useState, useEffect } from "react";

export default function Home() {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const handleAnalyze = async (payload) => {
    setIsLoading(true); setError(null); setResults(null);
    try {
      const resp = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to analyze image");
      setResults(data);
    } catch (err) { setError(err.message); } 
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-[100rem] mx-auto space-y-12">
      {/* Theme Toggler */}
      <div className="fixed top-6 right-6 z-[100]">
        <div className="glass p-1.5 flex items-center gap-1">
           <button 
             onClick={() => setTheme("light")}
             className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${theme === 'light' ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}
           >
              Clinic
           </button>
           <button 
             onClick={() => setTheme("dark")}
             className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${theme === 'dark' ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}
           >
              Night
           </button>
        </div>
      </div>

      <header className="relative text-center space-y-4 pt-12">
        <div className="inline-flex items-center justify-center p-4 mb-2 rounded-full bg-[var(--highlight)] text-[var(--accent)] shadow-sm">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h1 className="font-playfair text-5xl md:text-7xl font-bold tracking-tight text-[var(--foreground)]">
            LungCare
          </h1>
          <div className="flex justify-center items-center gap-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
             <span className="w-8 h-[1px] bg-[var(--card-border)]"></span>
             Advanced Radiomics Workstation
             <span className="w-8 h-[1px] bg-[var(--card-border)]"></span>
          </div>
        </div>
      </header>

      <main className="space-y-12 pb-20">
        <div className="relative">
          <Workstation onAnalyze={handleAnalyze} isLoading={isLoading} results={results} />
        </div>

        {(results || error) && (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
             <ResultsDisplay data={results} error={error} />
          </div>
        )}
      </main>

      <footer className="glass p-8 text-center relative overflow-hidden">
        <div className="flex flex-col items-center gap-4 relative z-10">
           <p className="max-w-4xl text-[var(--foreground)] leading-relaxed font-bold text-sm tracking-wide px-4">
            <span className="text-[var(--danger-text)] font-playfair mr-2">Disclaimer:</span> 
            ระบบนี้เป็นเพียงผู้ช่วยวิเคราะห์ผลทางการแพทย์ โปรดใช้ดุลพินิจในการวินิจฉัยร่วมกับบุคลากรทางการแพทย์ทุกครั้ง
          </p>
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-4 py-2 border border-[var(--card-border)] rounded-full">
            LungCare Clinical Engine 3.2.0
          </div>
        </div>
      </footer>
    </div>
  );
}
