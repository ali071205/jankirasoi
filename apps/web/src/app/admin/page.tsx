'use client';

import React, { useEffect } from 'react';

export default function AdminRedirectPage() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const remoteAdmin = process.env.NEXT_PUBLIC_ADMIN_URL;

    if (isLocal) {
      const timer = setTimeout(() => {
        window.location.href = 'http://localhost:3002';
      }, 800);
      return () => clearTimeout(timer);
    } else if (remoteAdmin) {
      const timer = setTimeout(() => {
        window.location.href = remoteAdmin;
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF9F0] text-slate-800 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-xl border border-amber-200/80 flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-[#1D5C34] text-white flex items-center justify-center shadow-md animate-pulse">
          <span className="material-symbols-outlined text-[34px]">admin_panel_settings</span>
        </div>
        
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Kitchen Admin &amp; Staff KDS
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            The dedicated kitchen console runs locally on <strong>Port 3002</strong> or on your registered staff tablet.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 w-full mt-2">
          <a
            href="http://localhost:3002"
            className="w-full py-3.5 px-6 rounded-2xl bg-[#1D5C34] hover:bg-[#164828] text-white font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>Open Local KDS (Port 3002)</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </a>

          <a
            href="/"
            className="w-full py-3 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all text-center"
          >
            Back to Storefront
          </a>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Live Kitchen Sync • Zero Latency Orders</span>
        </div>
      </div>
    </div>
  );
}
