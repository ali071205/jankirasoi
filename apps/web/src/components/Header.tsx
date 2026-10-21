'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api, UserProfile } from '../lib/api';
import CustomerAuthModal from './CustomerAuthModal';

export default function Header() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on outside click or route change
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleProfileClick = () => {
    if (currentUser) {
      setIsDropdownOpen((prev) => !prev);
    } else {
      setIsAuthOpen(true);
    }
  };

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await api.logout();
    setCurrentUser(null);
    window.dispatchEvent(new Event('storage'));
  };

  // Don't show customer header on rider portal
  if (pathname.startsWith('/rider')) return null;

  const latestOrder = currentUser?.recentOrders && currentUser.recentOrders.length > 0
    ? currentUser.recentOrders[0]
    : null;

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-xl shadow-xs border-b border-stone-200/80">
        <div className="max-w-4xl mx-auto h-16 px-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-xs">
              JR
            </span>
            <div className="flex flex-col">
              <span className="font-headline font-bold text-lg leading-tight text-on-surface">Janki Rasoi</span>
            </div>
          </Link>

          {/* Profile & Dropdown Container */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={handleProfileClick}
              aria-expanded={isDropdownOpen}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                currentUser
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100/70 shadow-xs'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50 shadow-xs'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                {currentUser ? currentUser.name.charAt(0).toUpperCase() : '👤'}
              </span>
              <span className="max-w-[110px] truncate font-bold">
                {currentUser ? currentUser.name.split(' ')[0] : 'Login'}
              </span>
              <span
                className={`material-symbols-outlined text-sm transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              >
                keyboard_arrow_down
              </span>
            </button>

            {/* THEME-BASED PROFILE DROPDOWN */}
            {isDropdownOpen && currentUser && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-3xl shadow-2xl border border-stone-200/90 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* 1. Header User Card */}
                <div className="p-4 bg-gradient-to-r from-emerald-900 via-primary to-emerald-950 text-white flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg border border-white/20 shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate leading-tight">{currentUser.name}</div>
                    <div className="text-xs text-emerald-200 font-mono mt-0.5">+91 {currentUser.phone}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="px-2 py-0.2 rounded-full bg-white/20 text-[10px] font-bold text-emerald-100">
                        {currentUser.orderCount || 0} Tiffins Ordered
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Ongoing / Recent Order Quick Card (if exists) */}
                {latestOrder && (
                  <div className="p-3 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-primary text-[20px] shrink-0">
                        skillet
                      </span>
                      <div className="truncate text-xs">
                        <div className="font-bold text-stone-900 truncate">
                          Order #{latestOrder.orderNumber}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          ₹{(latestOrder.totalAmountPaise / 100).toFixed(0)} • {latestOrder.status.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/track?token=${latestOrder.trackingToken}`}
                      onClick={() => setIsDropdownOpen(false)}
                      className="px-2.5 py-1 rounded-xl bg-primary text-white font-bold text-[11px] hover:bg-emerald-800 transition-colors shrink-0"
                    >
                      Track
                    </Link>
                  </div>
                )}

                {/* 3. Action Menu Items */}
                <div className="p-2 flex flex-col gap-1 text-xs">
                  <Link
                    href="/track"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-stone-100/80 transition-colors text-stone-800 font-semibold"
                  >
                    <span className="w-8 h-8 rounded-xl bg-emerald-50 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                    </span>
                    <div className="flex-1">
                      <div className="leading-tight font-bold">My Orders &amp; Live Tracking</div>
                      <div className="text-[11px] text-stone-500 font-normal">Check status of today's tiffins</div>
                    </div>
                    <span className="material-symbols-outlined text-sm text-stone-400">chevron_right</span>
                  </Link>

                  {/* Saved Address Preview */}
                  <div className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-stone-100/80 transition-colors text-stone-800">
                    <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">home_pin</span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="leading-tight font-bold">Saved Delivery Address</div>
                      <div className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                        {currentUser.savedAddress
                          ? `${currentUser.savedAddress.flat || ''} ${currentUser.savedAddress.street || ''} (${currentUser.savedAddress.pincode || ''})`
                          : 'Saved automatically upon next order'}
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Kitchen Support */}
                  <a
                    href="https://wa.me/919812345678?text=Hi%20Janki%20Rasoi,%20I%20have%20a%20query%20about%20my%20tiffin%20order"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-stone-100/80 transition-colors text-stone-800 font-semibold"
                  >
                    <span className="w-8 h-8 rounded-xl bg-green-50 text-green-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                    </span>
                    <div className="flex-1">
                      <div className="leading-tight font-bold">Kitchen Support &amp; WhatsApp</div>
                      <div className="text-[11px] text-stone-500 font-normal">Chat directly with kitchen station</div>
                    </div>
                    <span className="material-symbols-outlined text-sm text-stone-400">arrow_outward</span>
                  </a>
                </div>

                {/* 4. Footer Logout Action */}
                <div className="p-2 border-t border-stone-200/80 bg-stone-50/70">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-rose-700 hover:bg-rose-100/60 font-bold text-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Login Modal (Only opens if user is NOT logged in and clicks Login) */}
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
          setIsAuthOpen(false);
        }}
      />
    </>
  );
}
