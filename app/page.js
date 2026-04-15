"use client";
import Workstation from "./components/Workstation";
import ResultsDisplay from "./components/ResultsDisplay";
import { useState, useEffect } from "react";

export default function Home() {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState("dark"); // "dark" | "light"

  // Apply theme to document element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

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

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      {/* Theme Switcher */}
      <div className="fixed top-6 right-6 z-[100]">
        <div className="glass p-1.5 rounded-2xl flex items-center gap-1 shadow-2xl border-slate-200/50 dark:border-slate-800/50">
           <button 
             onClick={() => setTheme("light")}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${theme === 'light' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}
           >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Medical White
           </button>
           <button 
             onClick={() => setTheme("dark")}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}
           >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              Premium Dark
           </button>
        </div>
      </div>

      <header className="text-center space-y-4 pt-10 pb-6 relative">
        <div className="inline-flex items-center justify-center p-3 mb-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 shadow-2xl animate-bounce-slow">
          <svg className="w-10 h-10 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter transition-all duration-500" style={{ color: theme === 'light' ? '#000' : '#fff' }}>
          Radiological <span className="gradient-text">Analyzer 3.1</span>
        </h1>
        <p className="max-w-2xl mx-auto text-slate-500 dark:text-slate-400 text-lg sm:text-xl font-medium">
          ยกระดับการวิเคราะห์รังสีภาพด้วยระบบ <span className="text-indigo-600 dark:text-indigo-400 font-black">Native Radiomics</span> และขุมพลัง <span className="text-violet-600 dark:text-violet-400 font-black">Gemini 3.1 Flash Lite</span>
        </p>
      </header>

      <main className="space-y-12 pb-20">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
          <div className="relative">
            <Workstation onAnalyze={handleAnalyze} isLoading={isLoading} results={results} />
          </div>
        </div>

        {(results || error) && (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
             <ResultsDisplay data={results} error={error} />
          </div>
        )}
      </main>

      <footer className="glass rounded-3xl p-8 text-center text-sm border-slate-200 dark:border-slate-800/50 shadow-xl">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
           <p className="max-w-3xl text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            <strong className="text-red-500 dark:text-red-400 font-black uppercase tracking-widest mr-2 underline decoration-2 underline-offset-4">Warning:</strong> 
            เครื่องมือนี้ออกแบบมาเพื่อสนับสนุนการตัดสินใจเบื้องต้นของบุคลากรทางการแพทย์เท่านั้น 
            การวินิจฉัยควรตรวจสอบซ้ำโดยผู้เชี่ยวชาญร่วมกับข้อมูลทางคลินิกอื่นๆ เสมอ
          </p>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
