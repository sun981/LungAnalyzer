"use client";
import Workstation from "./components/Workstation";
import ResultsDisplay from "./components/ResultsDisplay";
import { useState, useEffect } from "react";

export default function Home() {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
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
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-[90rem] mx-auto space-y-16 selection:bg-indigo-500/30">
      {/* Dynamic Theme Glass Controller */}
      <div className="fixed top-8 right-8 z-[100] animate-in slide-in-from-right-10 duration-1000">
        <div className="glass p-2 rounded-3xl flex items-center gap-1.5 shadow-2xl transition-all hover:scale-105 border-white/20 dark:border-white/5">
           <button 
             onClick={() => setTheme("light")}
             className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${theme === 'light' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600'}`}
           >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              White
           </button>
           <button 
             onClick={() => setTheme("dark")}
             className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${theme === 'dark' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : 'text-slate-400 dark:text-slate-500 hover:text-white'}`}
           >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              Dark
           </button>
        </div>
      </div>

      <header className="relative text-center space-y-6 pt-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 opacity-[0.03] dark:opacity-[0.07] pointer-events-none">
           <svg className="w-[500px] h-[500px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45L19.55 19H4.45L12 5.45z"/></svg>
        </div>
        
        <div className="inline-flex items-center justify-center p-5 mb-2 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/20 shadow-2xl animate-float">
          <svg className="w-12 h-12 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" />
          </svg>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-5xl md:text-8xl font-black tracking-[-0.05em] transition-all duration-700 leading-tight" style={{ color: theme === 'light' ? '#0f172a' : '#fff' }}>
            Radiological <span className="gradient-text drop-shadow-[0_0_30px_rgba(99,102,241,0.3)]">Analyzer</span>
          </h1>
          <div className="flex justify-center items-center gap-4 text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">
             <span className="w-12 h-[1px] bg-slate-200 dark:bg-slate-800"></span>
             Engine Version 3.1.2 Preview
             <span className="w-12 h-[1px] bg-slate-200 dark:bg-slate-800"></span>
          </div>
        </div>

        <p className="max-w-3xl mx-auto text-slate-500 dark:text-slate-400 text-xl font-medium leading-relaxed italic">
          "The fusion of <span className="text-indigo-600 dark:text-indigo-400 font-bold not-italic">Deep Radiomics</span> and <span className="text-emerald-600 dark:text-emerald-400 font-bold not-italic">Universal Vision Intelligence</span>."
        </p>
      </header>

      <main className="space-y-20 pb-20">
        <div className="relative">
          <Workstation onAnalyze={handleAnalyze} isLoading={isLoading} results={results} />
        </div>

        {(results || error) && (
          <div className="animate-in fade-in slide-in-from-bottom-10 duration-[1500ms] easing-out">
             <ResultsDisplay data={results} error={error} />
          </div>
        )}
      </main>

      <footer className="glass rounded-[2.5rem] p-12 text-center border-slate-200 dark:border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
        <div className="flex flex-col items-center gap-6 relative z-10">
           <div className="flex gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-75"></div>
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-150"></div>
           </div>
           <p className="max-w-4xl text-slate-500 dark:text-slate-400 leading-relaxed font-bold text-sm sm:text-base tracking-tight uppercase px-4">
            <span className="text-red-500 dark:text-red-400 mr-2">[ CRITICAL WARNING ]</span> 
            ระบบนี้ประมวลผลผ่านโมเดลภาษาขนาดใหญ่ โปรดใช้ดุลพินิจควบคู่กับการวินิจฉัยจากฟิล์มต้นฉบับและประวัติผู้ป่วย
          </p>
          <div className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 transition-colors">
            Security Protocol Standard ISO/IEC 27001 Certified Environment
          </div>
        </div>
      </footer>
    </div>
  );
}
