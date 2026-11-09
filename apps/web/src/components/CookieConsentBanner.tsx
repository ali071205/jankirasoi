'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('jr_cookie_consent');
      if (!consent) {
        // Small delay so page renders smoothly first
        const timer = setTimeout(() => setShowBanner(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('jr_cookie_consent', 'ACCEPTED');
      localStorage.setItem('jr_cookie_consent_date', new Date().toISOString());
    } catch {}
    setShowBanner(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem('jr_cookie_consent', 'ESSENTIAL');
      localStorage.setItem('jr_cookie_consent_date', new Date().toISOString());
    } catch {}
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-2xl border border-stone-200/90 flex flex-col gap-3 text-xs text-gray-800">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">cookie</span>
            </span>
            <div>
              <h4 className="font-bold text-xs text-gray-950 font-headline leading-tight">
                Cookie &amp; Data Privacy Consent
              </h4>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                DPDP Act, 2023 Compliant
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleEssentialOnly}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            title="Close"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <p className="text-[11px] text-gray-600 leading-relaxed">
          Hum essential security aur session cookies use karte hain taaki aapka login, cart aur order tracking safe rahe (as per India&apos;s Digital Personal Data Protection Act, 2023). Hum koi ad-tracking ya data-selling nahi karte.
        </p>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
          <Link
            href="/privacy"
            target="_blank"
            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline"
          >
            Privacy Policy
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-[11px] font-semibold text-gray-600 transition-colors"
            >
              Essential Only
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-[11px] font-bold text-white shadow-2xs transition-colors"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

