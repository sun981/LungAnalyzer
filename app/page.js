"use client";
import Workstation from "./components/Workstation";
import { useState } from "react";

export default function Home() {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

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
    <>
      {/* Welcome Screen */}
      {showWelcome && (
        <div className={`fixed inset-0 z-[100] bg-hc-cream flex flex-col items-center justify-center transition-all duration-1000 ease-in-out text-hc-dark`}>
            <div className="relative z-10 flex flex-col items-center text-center px-6">
                <div className="mb-6">
                    <i className="fas fa-lungs text-6xl text-hc-green opacity-90"></i>
                </div>
                <h1 className="font-serif text-6xl md:text-8xl mb-2 tracking-tight">
                    Lung<span className="text-hc-green italic">Care</span>
                </h1>
                <div className="space-y-2 mb-12">
                    <p className="text-2xl md:text-3xl font-serif text-hc-dark/80 tracking-wide uppercase">AI Nodule Analysis</p>
                    <p className="text-hc-dark/60 text-base md:text-lg font-light">ระบบวิเคราะห์และคัดกรองก้อนเนื้อในปอดด้วย AI</p>
                </div>
                <button 
                  onClick={() => setShowWelcome(false)}
                  className="group bg-hc-green text-white font-serif text-lg py-4 px-12 rounded-full shadow-lg shadow-hc-green/20 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-4">
                    Start AI Analysis
                    <i className="fas fa-chevron-right text-xs group-hover:translate-x-1 transition-transform opacity-70"></i>
                </button>
            </div>
            <div className="absolute bottom-10 flex flex-col items-center gap-1">
                <span className="text-[10px] text-hc-light font-bold tracking-[0.3em] uppercase">Developed By</span>
                <span className="text-sm font-serif text-hc-green font-bold tracking-widest italic">LUNGCARE TEAM</span>
            </div>
        </div>
      )}

      {/* Main App */}
      <div className={`${showWelcome ? 'overflow-hidden h-screen' : ''}`}>
        <nav className="bg-white border-b border-hc-light/30 p-4 sticky top-0 z-50">
            <div className="max-w-[1400px] mx-auto flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <i className="fas fa-lungs text-2xl text-hc-green"></i>
                    <div className="flex flex-col leading-tight border-l border-hc-light/50 pl-4">
                        <h1 className="text-xl font-serif text-hc-dark font-bold tracking-tight">Lung<span className="text-hc-green italic">Care</span></h1>
                        <span className="text-[9px] uppercase tracking-widest text-hc-light font-bold">AI Analysis System</span>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-6 text-xs font-bold text-hc-light tracking-widest uppercase">
                    <span>Radiomics Workstation</span>
                    <div className="h-4 w-px bg-hc-light/30"></div>
                    <span className="text-hc-green italic"><i className="fas fa-robot mr-1"></i> AI Powered</span>
                </div>
            </div>
        </nav>

        <main className="max-w-[1400px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
            <Workstation onAnalyze={handleAnalyze} isLoading={isLoading} results={results} />
        </main>
      </div>
    </>
  );
}
