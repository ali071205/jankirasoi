'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, TrackOrderResponse, DEFAULT_FOOD_IMAGE, FALLBACK_CATALOG } from '../../lib/api';

const PROGRESS_STEPS = [
  { key: 'ACCEPTED', label: 'Order Confirmed', icon: 'check', desc: 'Kitchen accepted your wholesome meal request.' },
  { key: 'PREPARING', label: 'Preparing in Kitchen', icon: 'skillet', desc: 'Fresh rotis right off the tawa & piping hot dal packaging.' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: 'moped', desc: 'Rider is on the way to your delivery address.' },
];

function getProgressIndex(status: string) {
  if (status === 'DELIVERED') return 3;
  if (status === 'OUT_FOR_DELIVERY') return 2;
  if (status === 'READY_FOR_PICKUP' || status === 'PREPARING') return 1;
  return 0;
}

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');

  const [order, setOrder] = useState<TrackOrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [trackingToken, setTrackingToken] = useState<string | null>(tokenFromUrl);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) {
      setTrackingToken(tokenFromUrl);
    } else if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('jr_last_tracking_token');
      if (stored) {
        setTrackingToken(stored);
      } else {
        setLoading(false);
      }
    }
  }, [tokenFromUrl]);

  useEffect(() => {
    let isMounted = true;

    async function fetchStatus(isSilent = false) {
      if (!trackingToken) {
        if (isMounted) setLoading(false);
        return;
      }
      if (!isSilent && isMounted) {
        setLoading(true);
      }
      try {
        const data = await api.trackOrder(trackingToken);
        if (isMounted) {
          setOrder(data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted && !isSilent) setError(err.message || 'Unable to fetch order status');
      } finally {
        if (isMounted && !isSilent) setLoading(false);
      }
    }

    // 1. Initial full fetch
    fetchStatus(false);

    // 2. Silent fast polling every 3.5 seconds
    const interval = setInterval(() => {
      fetchStatus(true);
    }, 3500);

    // 3. Instant sync on visibility change or window focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [trackingToken]);

  const handleCopyOtp = (otp: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(otp);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    }
  };

  // Find image of ordered meal from catalog or default
  const dishImageUrl = useMemo(() => {
    if (!order?.items?.length) return DEFAULT_FOOD_IMAGE;
    const firstName = (order.items[0]?.name || '').trim().toLowerCase();
    for (const cat of FALLBACK_CATALOG.categories) {
      for (const item of cat.items) {
        const catItemName = item.name.toLowerCase();
        if (catItemName === firstName || firstName.includes(catItemName) || catItemName.includes(firstName)) {
          if (item.imageUrl) return item.imageUrl;
        }
      }
    }
    return DEFAULT_FOOD_IMAGE;
  }, [order]);

  if (!trackingToken) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[60vh] pt-20 pb-28 px-margin">
        <div className="bg-surface-container-lowest p-space-xl rounded-2xl shadow-xs border border-surface-container-high/60 max-w-sm w-full text-center flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-primary-container">
            <span className="material-symbols-outlined text-[32px]">receipt_long</span>
          </div>
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">No Active Order Found</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            You haven't placed an order yet or your session has expired.
          </p>
          <Link
            href="/menu"
            className="mt-2 h-10 px-6 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <span>Order Food Now</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </main>
    );
  }

  if (loading && !order) {
    return (
      <main className="pt-20 pb-28 max-w-xl mx-auto px-margin">
        <div className="h-44 rounded-3xl bg-surface-container animate-pulse mb-4"></div>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main className="pt-20 pb-28 max-w-xl mx-auto px-margin text-center">
        <div className="p-space-lg rounded-2xl bg-surface-container-lowest border border-error/20">
          <p className="text-error font-bold text-sm">{error}</p>
          <Link
            href="/"
            className="mt-3 inline-block px-4 py-2 rounded-full bg-primary-container text-on-primary text-xs font-bold"
          >
            Go to Homepage
          </Link>
        </div>
      </main>
    );
  }

  const currentStep = getProgressIndex(order?.status || 'ACCEPTED');
  const totalItemCount = order?.items?.reduce((a, b) => a + b.quantity, 0) || 1;

  return (
    <main className="flex flex-col relative w-full pt-4 pb-28 bg-[#FFF9F0] min-h-screen">
      <div className="flex flex-col w-full max-w-xl mx-auto px-3 sm:px-4 pb-10">
        
        {/* Top Header Bar */}
        <header className="flex items-center justify-between pb-3 px-1">
          <Link
            href="/"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 text-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </Link>

          <div className="text-center">
            <h1 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
              Janki Rasoi
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {order?.deliverySlot || 'Lunch Service'} • {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 text-slate-700"
            title="Toggle Details"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isExpanded ? 'expand_less' : 'more_horiz'}
            </span>
          </button>
        </header>

        {/* SINGLE UNIFIED COLLAPSIBLE CARD */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 overflow-hidden transition-all duration-300">
          
          {/* Card Header (Always Visible) - Collapsed by default */}
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-4 sm:p-5 cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
          >
            <div className="flex items-center justify-between gap-3">
              
              {/* Left Column: Pill, Status Headline, Toggle Trigger */}
              <div className="flex flex-col justify-center gap-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="self-start px-2.5 py-1 rounded-lg bg-[#E6F8F0] text-[#008848] text-xs font-black tracking-wider uppercase shadow-2xs">
                    {order?.status === 'DELIVERED'
                      ? 'DELIVERED'
                      : order?.status === 'OUT_FOR_DELIVERY'
                      ? 'ARRIVING IN 10 MINS'
                      : 'ARRIVING IN 10 MINS'}
                  </span>
                  {order?.orderNumber && (
                    <span className="text-[11px] font-bold text-slate-400 truncate">
                      #{order.orderNumber}
                    </span>
                  )}
                </div>

                <h2 className="text-lg sm:text-xl font-black text-slate-900 font-headline leading-tight">
                  {order?.status === 'DELIVERED'
                    ? 'Order Delivered!'
                    : order?.status === 'OUT_FOR_DELIVERY'
                    ? 'Rider On The Way!'
                    : order?.status === 'PREPARING' || order?.status === 'READY_FOR_PICKUP'
                    ? 'Preparing in Kitchen!'
                    : 'Order Received!'}
                </h2>

                <div className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 mt-0.5">
                  <span>{isExpanded ? 'Hide live tracking & details' : 'Order info & live tracking'}</span>
                  <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
              </div>

              {/* Right Column: Ordered Food Image */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-slate-200 shadow-xs bg-[#ECEFEA]">
                <img
                  src={dishImageUrl}
                  alt={order?.items?.[0]?.name || 'Ordered Dish'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 right-1 bg-black/65 backdrop-blur-xs text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-md">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                </div>
              </div>

            </div>
          </div>

          {/* Expanded Content: Revealed Only When Toggled Open */}
          {isExpanded && (
            <div className="border-t border-slate-100 p-4 sm:p-5 flex flex-col gap-4 bg-[#FAFAF8] transition-all">
              
              {/* 1. Live Styled Map Box */}
              <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-[#ECEFEA] border border-slate-200 shadow-inner flex items-center justify-center">
                {/* Map Vector Graphic (Indore / Sagore roads) */}
                <svg className="absolute inset-0 w-full h-full opacity-70" viewBox="0 0 200 200" fill="none">
                  <rect width="200" height="200" fill="#E8EDE5" />
                  <path d="M-10 40 Q50 60 120 30 T210 50" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
                  <path d="M30 210 Q60 120 140 100 T210 160" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
                  <path d="M-20 140 Q80 130 180 80" stroke="#FFFFFF" strokeWidth="5" />
                  <path d="M70 -10 L110 210" stroke="#FFFFFF" strokeWidth="7" />
                  <path d="M140 -10 L160 210" stroke="#FFFFFF" strokeWidth="4" />
                  
                  {/* Dotted Route Line between Pins */}
                  <path
                    d="M55 95 C 75 80, 105 130, 145 110"
                    stroke="#1C1C1E"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Expand Map Action Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = `https://www.google.com/maps/dir/?api=1&destination=22.6288,75.5684`;
                    window.open(url, '_blank');
                  }}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-white/95 backdrop-blur-xs text-slate-700 flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-transform z-10"
                  title="Open Full Map"
                >
                  <span className="material-symbols-outlined text-[15px]">open_in_full</span>
                </button>

                {/* Kitchen / Restaurant Pin (Skillet Pin) */}
                <div className="absolute top-[34%] right-[20%] flex flex-col items-center z-10 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-[#1C1C1E] text-white flex items-center justify-center shadow-md border-2 border-white">
                    <span className="material-symbols-outlined text-[16px]">skillet</span>
                  </div>
                  <div className="w-1.5 h-1 bg-black/40 rounded-full blur-[0.5px]"></div>
                </div>

                {/* Destination / Customer Pin (Home Pin) */}
                <div className="absolute bottom-[30%] left-[20%] flex flex-col items-center z-10">
                  <div className="w-8 h-8 rounded-full bg-[#1C1C1E] text-white flex items-center justify-center shadow-md border-2 border-white">
                    <span className="material-symbols-outlined text-[16px]">home</span>
                  </div>
                  <div className="w-1.5 h-1 bg-black/40 rounded-full blur-[0.5px]"></div>
                </div>

                {/* Map Watermark matching Image 2 */}
                <div className="absolute bottom-2 left-2.5 flex flex-col pointer-events-none z-10">
                  <span className="text-[10px] font-black text-slate-700/85 tracking-tight leading-none">
                    Sagore 454774
                  </span>
                  <span className="text-[8px] font-bold text-slate-500/80 leading-none mt-0.5">
                    Indore-Pithampur Corridor
                  </span>
                </div>
              </div>

              {/* 2. Delivery Handover OTP */}
              {order?.deliveryOtp && order.status !== 'DELIVERED' && (
                <div className="bg-[#FFF1DC] rounded-2xl p-3.5 shadow-xs border border-[#E99A32]/40 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-bold text-[#E99A32]">
                      Delivery Handover OTP
                    </span>
                    <span className="material-symbols-outlined text-[#E99A32] text-[18px]">shield</span>
                  </div>

                  <div className="flex items-center justify-between bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-[#EEE7DC]">
                    <span className="font-mono font-extrabold text-2xl tracking-widest text-[#292D26]">
                      {order.deliveryOtp}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyOtp(order.deliveryOtp || '');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#E99A32] text-white text-xs font-bold hover:bg-[#d38520] transition-colors shadow-xs"
                    >
                      {copiedOtp ? 'Copied!' : 'Copy PIN'}
                    </button>
                  </div>

                  <p className="text-[11px] text-[#77786F] leading-tight">
                    Share this secure 6-digit code with the delivery rider only when your meal arrives.
                  </p>
                </div>
              )}

              {/* 3. Kitchen Live Tracker (3 Steps) */}
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#EEE7DC]">
                <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#EEE7DC]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[#38754A] text-[20px] shrink-0">skillet</span>
                    <h3 className="text-xs sm:text-sm text-[#292D26] font-bold truncate">Kitchen Live Tracker</h3>
                  </div>
                  <span className="text-[11px] text-[#38754A] bg-[#EAF4ED] px-2 py-0.5 rounded-full font-bold shrink-0">
                    Step {Math.min(currentStep + 1, 3)} of 3
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {PROGRESS_STEPS.map((step, idx) => {
                    const isCompleted = currentStep > idx;
                    const isCurrent = currentStep === idx;

                    return (
                      <div
                        key={step.key}
                        className={`flex items-start gap-2.5 rounded-xl p-2 transition-colors ${
                          isCurrent ? 'bg-[#FFF9F0] border border-[#EEE7DC]' : ''
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-xs mt-0.5 text-xs font-bold ${
                            isCompleted
                              ? 'bg-[#38754A] text-white'
                              : isCurrent
                              ? 'bg-[#38754A] text-white animate-pulse'
                              : 'bg-[#EEE7DC] text-[#77786F]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {isCompleted ? 'check' : step.icon}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-xs sm:text-sm truncate ${
                                isCurrent
                                  ? 'text-[#38754A] font-bold'
                                  : isCompleted
                                  ? 'text-[#292D26] font-semibold'
                                  : 'text-[#77786F]'
                              }`}
                            >
                              {step.label}
                            </span>
                            {isCurrent && (
                              <span className="w-2 h-2 rounded-full bg-[#38754A] animate-ping shrink-0"></span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#77786F] leading-relaxed mt-0.5 break-words">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Order Items Summary & Instructions */}
              {order?.items && order.items.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#EEE7DC] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs sm:text-sm text-[#292D26] font-bold">Your Meal Items</h3>
                    <span className="text-xs text-slate-500 font-semibold">{totalItemCount} items</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#FFF9F0] border border-[#EEE7DC]"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-3.5 h-3.5 bg-white rounded-xs border border-[#38754A] flex items-center justify-center p-0.5 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#38754A]"></span>
                          </span>
                          <span className="text-xs sm:text-sm text-[#292D26] font-medium truncate">
                            {item.name}
                          </span>
                          {item.variant && (
                            <span className="text-[11px] text-[#77786F] shrink-0">
                              ({item.variant})
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-[#292D26] shrink-0">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.deliveryNotes && (
                    <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Order Instructions &amp; Cooking Request:
                      </span>
                      <p className="text-xs text-slate-800 bg-[#FFF9F0] p-2.5 rounded-xl border border-[#EEE7DC]">
                        {order.deliveryNotes}
                      </p>
                    </div>
                  )}

                  <div className="pt-2.5 border-t border-[#EEE7DC] flex items-center justify-between text-xs sm:text-sm font-bold text-[#292D26]">
                    <span>Total Paid</span>
                    <span>₹{(order.totalAmountPaise / 100).toFixed(0)}</span>
                  </div>
                </div>
              )}

              {/* 5. Kitchen WhatsApp Support */}
              <div className="flex items-center justify-center pt-1">
                <a
                  href="https://wa.me/919812345678?text=Hi%20Janki%20Rasoi,%20I%20have%20a%20query%20about%20my%20order"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-full justify-center inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-[#EEE7DC] text-xs font-bold text-[#292D26] hover:bg-[#FFF9F0] transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[#38754A] text-[18px]">chat</span>
                  WhatsApp Kitchen Support
                </a>
              </div>

            </div>
          )}

        </div>

      </div>
    </main>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-24 text-center text-xs font-bold text-on-surface-variant">
          Loading tracking dashboard...
        </div>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}
