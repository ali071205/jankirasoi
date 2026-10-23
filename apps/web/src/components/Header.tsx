'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api, UserProfile } from '../lib/api';
import CustomerAuthModal from './CustomerAuthModal';
import { useCart } from '../context/CartContext';

export default function Header() {
  const pathname = usePathname();
  const { totalCount } = useCart();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Close dropdown and mobile menu on route change
  useEffect(() => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
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
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container-high/60">
        <div className="max-w-4xl mx-auto h-16 px-margin flex items-center justify-between gap-space-sm">
          {/* Brand Logo & Live Status */}
          <Link href="/" className="flex items-center gap-space-sm min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              JR
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-space-xs">
                <span className="font-title-md text-title-md text-on-surface truncate font-bold font-headline">
                  Janki Rasoi
                </span>
                <span className="hidden xs:inline-block font-label-sm text-label-sm px-1.5 py-0.5 rounded-full bg-[#EAF4ED] text-[#38754A] uppercase shrink-0 font-bold border border-[#38754A]/20">
                  Ghar Ka Swad
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38754A] animate-pulse shrink-0"></span>
                <span className="font-label-sm text-label-sm text-[#38754A] font-semibold truncate">
                  Lunch Serving Now
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links (Visible on tablets and desktop >= 768px) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-on-surface">
            <Link
              href="/"
              className={`hover:text-primary transition-colors ${
                pathname === '/' ? 'text-primary font-bold' : 'text-on-surface'
              }`}
            >
              Home
            </Link>
            <Link
              href="/menu"
              className={`hover:text-primary transition-colors ${
                pathname === '/menu' ? 'text-primary font-bold' : 'text-on-surface'
              }`}
            >
              Today's Menu
            </Link>
            <Link
              href="/track"
              className={`hover:text-primary transition-colors ${
                pathname === '/track' ? 'text-primary font-bold' : 'text-on-surface'
              }`}
            >
              Track Order
            </Link>
            <a
              href="tel:+919876543210"
              className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FFF9F0] border border-[#EEE7DC] text-[#292D26] hover:text-[#38754A] transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px] text-[#38754A]">call</span>
              <span>+91 98765 43210</span>
            </a>
          </nav>

          {/* Cart Icon & Profile Container */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/cart"
              aria-label="View Cart"
              className="relative w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">shopping_bag</span>
              {totalCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-secondary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {totalCount}
                </span>
              )}
            </Link>

            {/* Profile Button & Dropdown Container */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleProfileClick}
                aria-expanded={isDropdownOpen}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors border border-surface-container-high/80"
                title={currentUser ? currentUser.name : 'Login / Register'}
              >
                {currentUser ? (
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <span className="material-symbols-outlined text-[22px] text-on-surface-variant">
                    account_circle
                  </span>
                )}
              </button>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle Navigation Menu"
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface ml-0.5"
            >
              <span className="material-symbols-outlined text-[24px]">
                {isMobileMenuOpen ? 'close' : 'menu'}
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
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-white border-b border-[#EEE7DC] shadow-xl z-50 p-4 animate-in slide-in-from-top-2 duration-150 flex flex-col gap-3">
          <nav className="flex flex-col gap-1">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2.5 ${
                pathname === '/' ? 'bg-[#EAF4ED] text-[#38754A]' : 'text-[#292D26] hover:bg-[#FFF9F0]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">home</span>
              <span>Home</span>
            </Link>
            <Link
              href="/menu"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2.5 ${
                pathname === '/menu' ? 'bg-[#EAF4ED] text-[#38754A]' : 'text-[#292D26] hover:bg-[#FFF9F0]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
              <span>Today's Menu</span>
            </Link>
            <Link
              href="/cart"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2.5 ${
                pathname === '/cart' ? 'bg-[#EAF4ED] text-[#38754A]' : 'text-[#292D26] hover:bg-[#FFF9F0]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
              <span>Your Tray ({totalCount})</span>
            </Link>
            <Link
              href="/track"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2.5 ${
                pathname === '/track' ? 'bg-[#EAF4ED] text-[#38754A]' : 'text-[#292D26] hover:bg-[#FFF9F0]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">moped</span>
              <span>Live Order Tracking</span>
            </Link>
          </nav>

          {/* Kitchen Contact & Working Links */}
          <div className="pt-2 border-t border-[#EEE7DC] flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#77786F]">
              Kitchen Support
            </span>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="tel:+919876543210"
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#FFF9F0] border border-[#EEE7DC] text-xs font-bold text-[#292D26] hover:text-[#38754A]"
              >
                <span className="material-symbols-outlined text-[16px] text-[#38754A]">call</span>
                <span>Call Kitchen</span>
              </a>
              <a
                href="mailto:care@jankirasoi.com"
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#FFF9F0] border border-[#EEE7DC] text-xs font-bold text-[#292D26] hover:text-[#38754A]"
              >
                <span className="material-symbols-outlined text-[16px] text-[#38754A]">mail</span>
                <span>Email Desk</span>
              </a>
            </div>
            <div className="flex items-center justify-between text-xs text-[#77786F] pt-1">
              <Link href="/privacy" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#38754A]">
                Privacy Policy
              </Link>
              <span>&bull;</span>
              <Link href="/terms" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#38754A]">
                Terms &amp; Conditions
              </Link>
            </div>
          </div>
        </div>
      )}

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
