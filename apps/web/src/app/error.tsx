'use client';

import React, { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Check if error is due to stale webpack chunk after a deployment
    const msg = error?.message || '';
    const isChunkError =
      msg.includes('Loading chunk') ||
      msg.includes('ChunkLoadError') ||
      msg.includes('failed to fetch dynamically imported module');

    if (isChunkError && typeof window !== 'undefined') {
      const reloadKey = 'jr_chunk_reload_attempt';
      const lastAttempt = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!lastAttempt || now - parseInt(lastAttempt, 10) > 10000) {
        sessionStorage.setItem(reloadKey, now.toString());
        window.location.reload();
        return;
      }
    }
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#FFF9F0]">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl">refresh</span>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold font-headline text-stone-900">
            Page Refresh Required
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            A newer kitchen update was deployed or connection interrupted. Tap below to reload the fresh menu.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full mt-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="w-full py-3 px-5 rounded-2xl bg-[#38754A] hover:bg-[#285C38] text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">cached</span>
            <span>Refresh Page</span>
          </button>

          <a
            href="/"
            className="w-full py-3 px-5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-sm transition-colors text-center"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
