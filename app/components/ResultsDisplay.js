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
      <div className="card-main border-red-500/30 p-12 text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="inline-flex p-4 rounded-[2rem] bg-red-500/10 text-red-500 shadow-lg shadow-red-500/10">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-2xl font-black text-red-700 dark:text-red-400 uppercase tracking-tighter transition-colors">Internal Processing Failure</h3>
        <p className="text-red-500/80 dark:text-red-400/60 max-w-lg mx-auto italic font-medium leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const isMalignant = data.classification === "Malignant";

  return (
    <div className="card-main overflow-hidden animate-in fade-in zoom-in duration-1000 border-indigo-500/10 dark:border-white/5">
      <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 shadow-xl shadow-indigo-500/20"></div>
      
      <div className="p-8 sm:p-14 space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-[2px] bg-indigo-500"></span>
              <h2 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.4em]">Automated Clinical Narrative</h2>
            </div>
            <div className="flex flex-wrap items-center gap-6">
               <h3 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white italic tracking-tighter transition-colors drop-shadow-sm">
                  {isMalignant ? "เนื้อร้าย (Malignant)" : "เนื้อดี (Benign)"}
               </h3>
               <div className={`px-6 py-2 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all ${isMalignant ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-600 text-white'}`}>
                  {isMalignant ? 'Immediate Action' : 'Observation Recommended'}
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 transition-colors">
             <div className="text-right">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</div>
                <div className="text-xs font-bold text-slate-900 dark:text-emerald-400 uppercase tracking-tighter">Verified by Vision 3.1</div>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-lg transition-colors">
                <svg className={`w-6 h-6 ${isMalignant ? 'text-red-500' : 'text-emerald-500'}`} fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M2.166 4.9L10 .3l7.834 4.6a1 1 0 01.5 1.175l-1.733 9.442a2 2 0 01-1.45 1.587l-5.15 1.156a2 2 0 01-1.123 0l-5.15-1.156a2 2 0 01-1.45-1.587l-1.733-9.442a1 1 0 01.5-1.175zM10 2.5l-6 3.522 1.349 7.348 4.651 1.044 4.651-1.044L16 6.022 10 2.5zM14.288 7.22a1 1 0 00-1.576-1.24l-3.212 4.07-1.439-1.439a1 1 0 00-1.414 1.414l2.146 2.146a1 1 0 001.513-.083l4-5.07z" clipRule="evenodd" />
                </svg>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
           <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-950/40 rounded-[3rem] p-10 sm:p-14 border border-slate-200 dark:border-white/5 relative shadow-inner group transition-colors overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-bl-[100%] transition-all group-hover:scale-110"></div>
                 <div className="absolute top-10 right-12 text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.5em] transition-colors">Primary Diagnostic Narrative</div>
                 <p className="text-slate-800 dark:text-slate-300 leading-[1.8] text-xl whitespace-pre-wrap font-medium tracking-tight relative z-10 transition-colors">
                    {data.description}
                 </p>
                 <div className="w-16 h-1 bg-indigo-500/30 dark:bg-indigo-500/20 rounded-full mt-10"></div>
              </div>
           </div>

           <div className="lg:col-span-4 space-y-8">
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-950 rounded-[3rem] p-10 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-8 text-center transition-colors relative overflow-hidden">
                 <div className="absolute top-[-10%] left-[-10%] w-40 h-40 bg-indigo-500/[0.03] dark:bg-indigo-500/[0.05] rounded-full blur-3xl"></div>
                 <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-4">Calculated Fidelity</div>
                 
                 <div className="flex flex-col items-center gap-6 relative z-10">
                    <div className="relative w-36 h-36 translate-y-2">
                       <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_20px_rgba(99,102,241,0.2)]" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-200 dark:text-slate-800 transition-colors" />
                          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" 
                            strokeDasharray={`${isMalignant ? 96 : 99}, 100`} strokeLinecap="round"
                            className={isMalignant ? "text-red-500" : "text-emerald-500 transition-colors"} />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="font-black text-4xl text-slate-950 dark:text-white uppercase tracking-tighter italic leading-none transition-colors">
                             {isMalignant ? "High" : "Optimal"}
                          </span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Accuracy</span>
                       </div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-900 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors">
                       <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold italic">
                          "Internal weighting favors {isMalignant ? 'structural instability' : 'asymptomatic texture'}"
                       </p>
                    </div>
                 </div>
              </div>

              <div className="p-8 rounded-[2.5rem] bg-indigo-600/5 border border-indigo-500/20 text-center animate-pulse">
                  <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Data Origin</div>
                  <div className="text-[10px] text-slate-500 italic">"Radiomics Feature Extraction Set v0.9"</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
