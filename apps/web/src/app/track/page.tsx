'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, TrackOrderResponse } from '../../lib/api';

const STEP_DEFS = [
  { key: 'PLACED', label: 'Order Received', desc: 'Order received and waiting for kitchen approval' },
  { key: 'ACCEPTED', label: 'Accepted by Kitchen', desc: 'Chef confirmed meal preparation' },
  { key: 'PREPARING', label: 'Fresh on Tawa & Simmering', desc: 'Fresh phulkas & hot dal being packed in tiffins' },
  { key: 'READY_FOR_PICKUP', label: 'Ready for Dispatch', desc: 'Sealed & waiting for rider pickup' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Rider is on the way to your doorstep' },
  { key: 'DELIVERED', label: 'Delivered Fresh', desc: 'Meal handed over and verified via PIN' },
];

interface RecentOrderMeta {
  orderNumber: string;
  trackingToken: string;
  placedAt: string;
}

function TrackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlToken = searchParams.get('token');

  const [activeIdentifier, setActiveIdentifier] = useState<string>('');
  const [order, setOrder] = useState<TrackOrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);
  const [recentOrders, setRecentOrders] = useState<RecentOrderMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Load Recent Orders from LocalStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(window.localStorage.getItem('jr_recent_orders') || '[]');
        if (Array.isArray(stored)) {
          setRecentOrders(stored);
        }

        // Determine initial tracking token
        if (urlToken) {
          setActiveIdentifier(urlToken);
        } else if (stored.length > 0 && stored[0].trackingToken) {
          setActiveIdentifier(stored[0].trackingToken);
        } else {
          const lastToken = window.localStorage.getItem('jr_last_tracking_token');
          if (lastToken) setActiveIdentifier(lastToken);
          else setLoading(false);
        }
      } catch {
        if (urlToken) setActiveIdentifier(urlToken);
        else setLoading(false);
      }
    }
  }, [urlToken]);

  // Fetch Order by Identifier (token, order number, or phone)
  const fetchOrder = useCallback(
    async (idToFetch: string, isBackground = false) => {
      if (!idToFetch) return;
      if (!isBackground) setLoading(true);

      try {
        const data = await api.trackOrder(idToFetch);
        setOrder(data);
        setError(null);

        // Update active token in URL without reload if changed
        if (typeof window !== 'undefined' && data.orderNumber) {
          try {
            window.localStorage.setItem('jr_last_tracking_token', idToFetch);
          } catch {}
        }
      } catch (err: any) {
        if (!isBackground) {
          setError(err.message || 'Order not found. Please check your order number or phone number.');
        }
      } finally {
        setLoading(false);
        setSearching(false);
      }
    },
    []
  );

  // Trigger fetch when activeIdentifier changes
  useEffect(() => {
    if (activeIdentifier) {
      fetchOrder(activeIdentifier);
    }
  }, [activeIdentifier, fetchOrder]);

  // Live Auto-Refresh every 4 seconds
  useEffect(() => {
    if (!activeIdentifier) return;
    const interval = setInterval(() => {
      fetchOrder(activeIdentifier, true);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeIdentifier, fetchOrder]);

  // Handle Manual Search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setSearching(true);
    setActiveIdentifier(query);
  };

  // Copy PIN to clipboard
  const handleCopyPin = (pin: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const currentIdx = order ? STEP_DEFS.findIndex((s) => s.key === order.status) : -1;

  let statusHeading = 'Kitchen is Preparing Your Tiffin';
  if (order) {
    if (order.status === 'DELIVERED') {
      statusHeading = 'Meal Delivered Fresh!';
    } else if (order.status === 'OUT_FOR_DELIVERY') {
      statusHeading = 'Rider is on the Way!';
    } else if (order.status === 'READY_FOR_PICKUP') {
      statusHeading = 'Packed & Waiting for Rider';
    } else if (order.status === 'ACCEPTED') {
      statusHeading = 'Order Confirmed by Chef';
    }
  }

  return (
    <main className="flex-1 pt-20 pb-24 max-w-2xl mx-auto w-full px-4 flex flex-col gap-4">
      {/* Top Search / Lookup Bar */}
      <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-black/5 flex flex-col gap-2.5">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Phone (9876543210) or #JR-Order"
              className="w-full bg-surface-container-lowest border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface placeholder-gray-400 focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-container active:scale-95 transition-all shrink-0"
          >
            {searching ? 'Finding...' : 'Track'}
          </button>
        </form>

        {/* Recent Orders Pills Switcher */}
        {recentOrders.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
            <span className="text-[11px] font-bold text-gray-400 shrink-0">Recent:</span>
            {recentOrders.map((ro) => {
              const isSelected = activeIdentifier === ro.trackingToken || activeIdentifier === ro.orderNumber;
              return (
                <button
                  key={ro.orderNumber}
                  onClick={() => {
                    setActiveIdentifier(ro.trackingToken || ro.orderNumber);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface-container text-on-surface-variant border-transparent hover:border-gray-200'
                  }`}
                >
                  #{ro.orderNumber}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && !order && (
        <div className="bg-white rounded-2xl p-8 shadow-xs border border-black/5 animate-pulse flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-200"></div>
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      )}

      {/* Error or Empty State */}
      {!loading && !order && (
        <div className="bg-white rounded-2xl p-8 text-center flex flex-col items-center gap-3 shadow-xs border border-black/5">
          <span className="material-symbols-outlined text-[48px] text-primary">local_shipping</span>
          <h2 className="font-headline font-bold text-lg text-on-surface">No Active Order Selected</h2>
          <p className="text-xs text-on-surface-variant max-w-sm">
            {error ||
              'Enter your 10-digit mobile phone number or your Order ID above to see live kitchen preparation and your verbal delivery PIN.'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Link
              href="/menu"
              className="px-5 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-container"
            >
              Order Lunch or Dinner
            </Link>
          </div>
        </div>
      )}

      {/* Order Active View */}
      {order && (
        <>
          {/* Order Header Card */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-black/5 flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-primary-container text-white flex items-center justify-center shadow-md mb-2">
              <span className="material-symbols-outlined text-[28px]">
                {order.status === 'DELIVERED'
                  ? 'task_alt'
                  : order.status === 'OUT_FOR_DELIVERY'
                  ? 'two_wheeler'
                  : 'skillet'}
              </span>
            </div>
            <span className="px-3 py-0.5 rounded-full bg-green-50 text-primary font-bold text-[11px] mb-1">
              Ghar Jaisa Swad Assured
            </span>
            <h1 className="font-headline font-bold text-xl text-on-surface">{statusHeading}</h1>
            <p className="text-xs text-on-surface-variant mt-1">
              Order <span className="font-mono font-bold text-on-surface">#{order.orderNumber}</span> • {order.deliverySlot}
            </p>
          </div>

          {/* VERBAL DELIVERY PIN CARD (THE HERO COMPONENT) */}
          {order.status === 'OUT_FOR_DELIVERY' && order.deliveryOtp ? (
            <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white p-6 shadow-lg text-center flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-1.5 text-white/90 font-bold text-xs uppercase tracking-wider bg-black/20 px-3 py-1 rounded-full">
                <span className="material-symbols-outlined text-[16px]">key</span>
                <span>Your Verbal Handover PIN</span>
              </div>

              {/* 6 Digit Display Box */}
              <div className="bg-white px-8 py-3 rounded-2xl shadow-inner border border-white/40">
                <span className="font-headline font-bold text-4xl sm:text-5xl tracking-widest text-slate-900 font-mono">
                  {order.deliveryOtp}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyPin(order.deliveryOtp!)}
                  className="px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiedPin ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedPin ? 'PIN Copied!' : 'Copy PIN'}</span>
                </button>
              </div>

              <p className="text-xs text-white/95 max-w-sm leading-relaxed mt-1">
                Tell this <strong>6-digit code</strong> to the rider when they arrive at your door to safely receive your meal.
              </p>
            </div>
          ) : order.status === 'DELIVERED' ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center flex items-center justify-center gap-2 text-xs text-emerald-800 font-bold shadow-xs">
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">verified</span>
              <span>Delivered Fresh &amp; Verified with Handover PIN!</span>
            </div>
          ) : (
            <div className="rounded-2xl bg-surface-container-low border border-black/5 p-4 text-center flex items-center justify-center gap-2 text-xs text-on-surface-variant shadow-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">lock_clock</span>
              <span>
                Your <strong>6-digit handover PIN</strong> will appear here automatically as soon as the rider departs the kitchen.
              </span>
            </div>
          )}

          {/* Assigned Rider Profile & Safety Call (Swiggy / Zomato Pattern) */}
          {order.status === 'OUT_FOR_DELIVERY' && (
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-black/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-100 text-primary flex items-center justify-center font-bold text-sm">
                  <span className="material-symbols-outlined text-[24px]">sports_motorsports</span>
                </div>
                <div>
                  <span className="font-bold text-xs text-on-surface block">
                    {order.riderName || 'Rider Sonu Kumar'}
                  </span>
                  <span className="text-[11px] text-gray-500 block">Delivery Partner • Hero Splendor</span>
                </div>
              </div>
              <a
                href={`tel:${order.riderPhone || '9876543210'}`}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[16px]">call</span>
                <span>Call Rider</span>
              </a>
            </div>
          )}

          {/* One-Tap WhatsApp Share for Family Members */}
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              `Tracking my Janki Rasoi meal (Order #${order.orderNumber}). Verbal Handover PIN: ${
                order.deliveryOtp || 'Active upon arrival'
              }. Track live: http://10.103.206.252:3001/track?token=${order.orderNumber}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-2xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-600">share</span>
            <span>Share PIN &amp; Live Tracking on WhatsApp</span>
          </a>

          {/* Live Kitchen Status Stepper */}
          <section className="bg-white rounded-2xl p-5 shadow-xs border border-black/5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h2 className="font-headline font-bold text-sm text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[20px]">soup_kitchen</span>
                Live Kitchen Timeline
              </h2>
              <span className="text-[11px] text-primary font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> Auto-updating (4s)
              </span>
            </div>

            <div className="flex flex-col gap-4 relative pl-3">
              {STEP_DEFS.map((step, idx) => {
                const isDone = currentIdx >= idx;
                const isCurrent = currentIdx === idx;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isCurrent
                          ? 'bg-primary text-white ring-4 ring-orange-100 animate-pulse'
                          : isDone
                          ? 'bg-primary text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isDone ? (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`font-bold text-xs ${
                          isCurrent ? 'text-primary' : isDone ? 'text-on-surface' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </span>
                      <span className="text-[11px] text-on-surface-variant">{step.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Order Items Snapshot */}
          <section className="bg-white rounded-2xl p-5 shadow-xs border border-black/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-bold text-sm text-on-surface">Order Summary</h2>
              <span className="text-xs font-semibold text-gray-500">
                {order.paymentMethod === 'COD' ? '💵 Pay on Delivery' : '💳 Paid Online'}
              </span>
            </div>
            <div className="flex flex-col divide-y divide-gray-100 text-xs">
              {order.items.map((i, idx) => (
                <div key={idx} className="py-2.5 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-on-surface">
                      {i.quantity}x {i.name}
                    </span>
                    {i.variant && <span className="text-[10px] text-gray-500 block">{i.variant}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2.5 border-t border-gray-100 flex justify-between font-bold text-sm text-primary">
              <span>Total Amount</span>
              <span>₹{(order.totalAmountPaise / 100).toFixed(2)}</span>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-xs text-gray-500">
          Loading live tracking console...
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
