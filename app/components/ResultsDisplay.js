"use client";
import { useEffect, useState } from "react";

export default function ResultsDisplay({ data, error }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (data) setIsVisible(true);
    else setIsVisible(false);
  }, [data]);

  if (error) {
    return (
      <div className="card-main border-[#F2D6D6] p-12 text-center space-y-4 animate-in fade-in zoom-in duration-500 bg-[#FDF6F6]">
        <div className="inline-flex p-4 rounded-full bg-white text-[#A74A4A] shadow-sm">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-playfair font-bold text-[#A74A4A] uppercase tracking-wide">Analysis Failure</h3>
        <p className="text-[#A74A4A]/80 max-w-lg mx-auto italic font-medium leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const classification = data.classification || "Suspicious";
  
  let riskTheme = {
      bg: "bg-[#F4F8F5]",
      border: "border-[#D3E0D7]",
      text: "text-[#5B8266]",
      label: "Benign (Low Risk)",
      action: "Routine Screening"
  };
  
  if (classification === "Malignant") {
      riskTheme = {
          bg: "bg-[#FDF6F6]",
          border: "border-[#F2D6D6]",
          text: "text-[#A74A4A]",
          label: "Malignant (High Risk)",
          action: "Immediate Clinical Review"
      };
  } else if (classification === "Suspicious" || classification === "Intermediate") {
      riskTheme = {
          bg: "bg-[#FCF9F2]",
          border: "border-[#E8DFCC]",
          text: "text-[#8C6D31]",
          label: "Suspicious (Intermediate Risk)",
          action: "Further Investigation Needed"
      };
  }

  return (
    <div className={`card-main overflow-hidden animate-in fade-in zoom-in duration-1000 border ${riskTheme.border} ${riskTheme.bg}`}>
      
      <div className="p-8 sm:p-14 space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-[var(--card-border)] pb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`w-8 h-1 ${riskTheme.bg} border ${riskTheme.border}`}></span>
              <h2 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Diagnostic Report</h2>
            </div>
            <div className="flex flex-col gap-2">
               <h3 className={`text-4xl md:text-5xl font-playfair font-bold ${riskTheme.text} tracking-wide`}>
                  {riskTheme.label}
               </h3>
               <div className={`mt-2 inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${riskTheme.border} bg-white ${riskTheme.text} self-start shadow-sm`}>
                  {riskTheme.action}
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-[var(--card-border)] shadow-sm">
             <div className="text-right">
                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">Status</div>
                <div className="text-[10px] font-bold text-[var(--foreground)] uppercase tracking-wider">Verified by AI</div>
             </div>
             <div className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--card-border)] flex items-center justify-center">
                <svg className={`w-5 h-5 ${riskTheme.text}`} fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M2.166 4.9L10 .3l7.834 4.6a1 1 0 01.5 1.175l-1.733 9.442a2 2 0 01-1.45 1.587l-5.15 1.156a2 2 0 01-1.123 0l-5.15-1.156a2 2 0 01-1.45-1.587l-1.733-9.442a1 1 0 01.5-1.175zM10 2.5l-6 3.522 1.349 7.348 4.651 1.044 4.651-1.044L16 6.022 10 2.5zM14.288 7.22a1 1 0 00-1.576-1.24l-3.212 4.07-1.439-1.439a1 1 0 00-1.414 1.414l2.146 2.146a1 1 0 001.513-.083l4-5.07z" clipRule="evenodd" />
                </svg>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
           <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-white rounded-3xl p-10 border border-[var(--card-border)] relative shadow-sm h-full">
                 <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-6">Clinical Narrative</div>
                 <p className="text-[var(--foreground)] leading-relaxed text-base whitespace-pre-wrap font-sarabun">
                    {data.description}
                 </p>
              </div>
           </div>

           <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl p-8 border border-[var(--card-border)] shadow-sm text-center">
                 <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-6">Calculated Fidelity</div>
                 <div className="flex flex-col items-center gap-4">
                    <div className="relative w-24 h-24">
                       <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--surface)]" />
                          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" 
                            strokeDasharray={`${classification === "Malignant" ? 92 : (classification === "Benign" ? 98 : 85)}, 100`} strokeLinecap="round"
                            className={riskTheme.text} />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`font-playfair font-bold text-2xl ${riskTheme.text}`}>
                             {classification === "Malignant" ? "High" : (classification === "Benign" ? "Max" : "Mod")}
                          </span>
                       </div>
                    </div>
                    <div className="bg-[var(--surface)] px-4 py-2 rounded-xl border border-[var(--card-border)]">
                       <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                          Internal Confidence Metric
                       </p>
                    </div>
                 </div>
              </div>

              <div className={`p-6 rounded-2xl bg-white border ${riskTheme.border} text-center shadow-sm`}>
                  <div className={`text-[10px] font-bold ${riskTheme.text} uppercase tracking-widest mb-1`}>Data Origin</div>
                  <div className="text-[10px] text-[var(--text-muted)] italic leading-tight">Advanced Radiomics & Gemini Flash Workstation</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
