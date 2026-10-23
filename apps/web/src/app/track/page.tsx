'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, TrackOrderResponse, DEFAULT_FOOD_IMAGE } from '../../lib/api';

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
        <div className="h-64 rounded-2xl bg-surface-container animate-pulse mb-4"></div>
        <div className="h-44 rounded-2xl bg-surface-container animate-pulse"></div>
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

  return (
    <main className="flex flex-col relative w-full pt-16 pb-28 bg-[#FFF9F0] min-h-screen">
      <div className="flex flex-col w-full max-w-xl mx-auto px-3 sm:px-4 pb-10">
        {/* Floating Celebration Confetti Particles */}
        <div className="relative w-full overflow-hidden pointer-events-none -mb-2 h-8 flex justify-center items-center">
          <div className="w-2 h-2 rounded-full bg-[#E99A32] animate-bounce opacity-80 mx-1"></div>
          <div className="w-2 h-2 rounded-full bg-[#38754A] animate-ping opacity-60 mx-2 delay-100"></div>
          <div className="w-2.5 h-1.5 rounded-full bg-[#E99A32] animate-pulse opacity-75 mx-1 delay-200"></div>
          <div className="w-2 h-2 rounded-full bg-[#EAF4ED] animate-bounce opacity-90 mx-3 delay-300"></div>
        </div>

        <div className="flex flex-col gap-3.5">
          {/* 1. Top Delight Success Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-[#EEE7DC] flex flex-col items-center text-center relative overflow-hidden">
            <div className="relative w-14 h-14 mb-2 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#EAF4ED] animate-ping opacity-40"></div>
              <div className="relative w-12 h-12 rounded-full bg-[#38754A] text-white flex items-center justify-center shadow-sm">
                <span
                  className="material-symbols-outlined text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </div>
            </div>

            <span className="px-3 py-0.5 rounded-full bg-[#EAF4ED] text-[#38754A] text-xs mb-1.5 inline-flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38754A]"></span>
              Ghar Jaisa Swad Assured
            </span>

            <h1 className="text-lg sm:text-xl text-[#292D26] font-bold font-headline leading-snug">
              {order?.status === 'DELIVERED'
                ? 'Meal Delivered Successfully!'
                : 'Order Placed Successfully!'}
            </h1>
            <p className="text-xs text-[#77786F] mt-0.5">
              Order ID:{' '}
              <span className="text-xs sm:text-sm text-[#292D26] font-bold font-mono">
                #{order?.orderNumber}
              </span>
            </p>

            {/* Quick Delivery ETA Banner */}
            <div className="w-full mt-3 bg-[#FFF9F0] rounded-xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 border border-[#EEE7DC]">
              <div className="flex items-center gap-2.5 text-left min-w-0 flex-1">
                <div className="w-9 h-9 rounded-full bg-[#FFF1DC] text-[#E99A32] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">timer</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-[#77786F] uppercase tracking-wider block font-bold">
                    Estimated Delivery
                  </span>
                  <div className="text-xs sm:text-sm text-[#292D26] font-bold truncate">
                    {order?.deliverySlot || 'Lunch (12:30 PM - 01:30 PM)'}{' '}
                    <span className="text-xs text-[#38754A] font-medium whitespace-nowrap">
                      ({order?.status === 'DELIVERED' ? 'Completed' : 'On Time'})
                    </span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 self-center">
                <span className="px-2.5 py-0.5 bg-[#EAF4ED] text-[#38754A] rounded-full text-[11px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38754A] animate-pulse"></span>
                  {order?.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Delivery Handover OTP Card */}
          {order?.deliveryOtp && order.status !== 'DELIVERED' && (
            <div className="bg-[#FFF1DC] rounded-2xl p-4 shadow-xs border border-[#E99A32]/40 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-bold text-[#E99A32]">
                  Delivery Handover OTP
                </span>
                <span className="material-symbols-outlined text-[#E99A32] text-[20px]">shield</span>
              </div>

              <div className="flex items-center justify-between bg-white/95 backdrop-blur-md p-3 rounded-xl border border-[#EEE7DC]">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-2xl tracking-widest text-[#292D26]">
                    {order.deliveryOtp}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyOtp(order.deliveryOtp || '')}
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

          {/* 3. Kitchen Live Tracker Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-[#EEE7DC]">
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#EEE7DC]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-[#38754A] text-[22px] shrink-0">skillet</span>
                <h2 className="text-sm sm:text-base text-[#292D26] font-bold truncate">Kitchen Live Tracker</h2>
              </div>
              <span className="text-xs text-[#38754A] bg-[#EAF4ED] px-2.5 py-0.5 rounded-full font-bold shrink-0 whitespace-nowrap">
                Step {Math.min(currentStep + 1, 3)} of 3
              </span>
            </div>

            {/* Stepper Vertical Stack */}
            <div className="relative flex flex-col gap-3">
              {PROGRESS_STEPS.map((step, idx) => {
                const isCompleted = currentStep > idx;
                const isCurrent = currentStep === idx;

                return (
                  <div
                    key={step.key}
                    className={`flex items-start gap-3 rounded-xl p-2.5 transition-colors ${
                      isCurrent ? 'bg-[#FFF9F0] border border-[#EEE7DC]' : ''
                    }`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs mt-0.5 text-xs font-bold ${
                        isCompleted
                          ? 'bg-[#38754A] text-white'
                          : isCurrent
                          ? 'bg-[#38754A] text-white animate-pulse'
                          : 'bg-[#EEE7DC] text-[#77786F]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
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
                      <p className="text-[11px] sm:text-xs text-[#77786F] leading-relaxed mt-0.5 break-words">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Order Items Summary */}
          {order?.items && order.items.length > 0 && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-[#EEE7DC] flex flex-col gap-2.5">
              <h3 className="text-sm sm:text-base text-[#292D26] font-bold">Your Meal Items</h3>

              <div className="flex flex-col gap-2">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#FFF9F0] border border-[#EEE7DC]"
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

              <div className="pt-2.5 border-t border-[#EEE7DC] flex items-center justify-between text-xs sm:text-sm font-bold text-[#292D26]">
                <span>Total Paid</span>
                <span>₹{(order.totalAmountPaise / 100).toFixed(0)}</span>
              </div>
            </div>
          )}

          {/* 5. Kitchen Support Link */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <a
              href="https://wa.me/919812345678?text=Hi%20Janki%20Rasoi,%20I%20have%20a%20query%20about%20my%20order"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#EEE7DC] text-xs font-bold text-[#292D26] hover:bg-[#FFF9F0] transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[#38754A] text-[18px]">chat</span>
              WhatsApp Kitchen Support
            </a>
          </div>
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
