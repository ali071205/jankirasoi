'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';

export default function Header() {
  const { totalCount } = useCart();
  const pathname = usePathname();

  // If on admin page, render admin top header
  if (pathname === '/admin') {
    return (
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/95 backdrop-blur-xl shadow-xs border-b border-black/5">
        <div className="max-w-6xl mx-auto h-16 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold">
              JR
            </span>
            <div>
              <h1 className="font-headline font-bold text-base leading-tight">Janki Rasoi Kitchen Console</h1>
              <span className="text-[11px] text-primary font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span> Live Kitchen KDS
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors"
            >
              Customer Storefront
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl shadow-sm">
      <div className="max-w-4xl mx-auto h-16 px-4 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold">
            JR
          </span>
          <div className="flex flex-col">
            <span className="font-headline font-bold text-lg leading-tight text-on-surface">Janki Rasoi</span>
            <span className="text-xs text-primary font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> Pure Veg Homestyle
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface-variant flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">dashboard</span> Admin KDS
          </Link>
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-lowest shadow-sm hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[22px] text-on-surface">shopping_bag</span>
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-secondary text-white text-[11px] rounded-full flex items-center justify-center font-bold">
                {totalCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
