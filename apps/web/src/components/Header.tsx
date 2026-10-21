'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { api, UserProfile } from '../lib/api';
import CustomerAuthModal from './CustomerAuthModal';

export default function Header() {
  const { totalCount } = useCart();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Sync session on mount and listen to storage events
  useEffect(() => {
    api.getCurrentUser().then((user) => {
      if (user && user.role === 'CUSTOMER') {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    });

    const handleStorage = () => {
      api.getCurrentUser().then((user) => {
        if (user && user.role === 'CUSTOMER') setCurrentUser(user);
        else setCurrentUser(null);
      });
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Don't show customer header on rider portal (has its own full-screen mobile PWA header)
  if (pathname.startsWith('/rider')) return null;

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl shadow-sm border-b border-gray-100">
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

          <div className="flex items-center gap-2.5">
            {/* Customer Profile / Login Button */}
            <button
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-container-lowest hover:bg-surface-container border border-gray-200 transition-colors shadow-2xs"
            >
              <span className="material-symbols-outlined text-base text-primary">
                {currentUser ? 'account_circle' : 'person'}
              </span>
              <span className="max-w-[90px] truncate text-gray-800">
                {currentUser ? currentUser.name.split(' ')[0] : 'Login'}
              </span>
            </button>

            {/* Cart Button */}
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

      {/* Customer Auth & Account BottomSheet/Modal */}
      <CustomerAuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          api.getCurrentUser().then((user) => {
            if (user && user.role === 'CUSTOMER') setCurrentUser(user);
          });
        }}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    </>
  );
}
