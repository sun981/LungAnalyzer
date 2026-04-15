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
      <div className="glass rounded-3xl p-8 border-red-500/20 bg-red-500/5 text-center space-y-3">
        <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-500">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-red-600 dark:text-red-200 uppercase tracking-tighter">Analysis Error</h3>
        <p className="text-red-500/80 dark:text-red-400/80 max-w-md mx-auto italic">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const isMalignant = data.classification === "Malignant";

  return (
    <div className="card-main overflow-hidden animate-in fade-in zoom-in duration-500">
      <div className="p-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500"></div>
      
      <div className="p-8 md:p-12 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <h2 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em]">AI Clinical Diagnosis (Gemini 3.1)</h2>
            <div className="flex items-center gap-4">
               <h3 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-slate-100 italic tracking-tighter transition-colors">
                  {isMalignant ? "พิจารณาเป็น: เนื้อร้าย" : "พิจารณาเป็น: เนื้อดี"}
               </h3>
               <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${isMalignant ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-white'}`}>
                  {data.classification}
               </span>
            </div>
          </div>
          
          <div className="hidden md:block">
             <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-inner transition-colors">
                <svg className={`w-10 h-10 ${isMalignant ? 'text-red-500' : 'text-emerald-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
           <div className="lg:col-span-8">
              <div className="bg-slate-50 dark:bg-slate-950/40 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800/50 relative shadow-inner group transition-colors">
                 <div className="absolute top-6 right-8 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em]">Expert Description</div>
                 <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg whitespace-pre-wrap font-medium">
                    {data.description}
                 </p>
                 <div className="w-12 h-1.5 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full mt-6 transition-all group-hover:w-24"></div>
              </div>
           </div>

           <div className="lg:col-span-4 flex flex-col justify-center">
              <div className="bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-700 shadow-xl space-y-6 text-center transition-colors">
                 <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Morphological Confidence</div>
                 <div className="flex flex-col items-center gap-4">
                    <div className="relative w-28 h-28">
                       <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-slate-700" />
                          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" 
                            strokeDasharray={`${isMalignant ? 94 : 98}, 100`} strokeLinecap="round"
                            className={isMalignant ? "text-red-500" : "text-emerald-500 transition-colors"} />
                       </svg>
                       <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-black text-2xl text-slate-900 dark:text-slate-100 uppercase tracking-tighter italic">
                             {isMalignant ? "V.High" : "Clear"}
                          </span>
                       </div>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] text-slate-500 dark:text-slate-500 leading-tight font-bold italic">
                          Spatial features indicate {isMalignant ? 'aggressive' : 'regular'} boundary patterns.
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
