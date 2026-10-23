'use client';

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, TrackOrderResponse, CatalogResponse, DEFAULT_FOOD_IMAGE } from '../../lib/api';

const PROGRESS_STEPS = [
  { key: 'ACCEPTED', label: 'Confirmed', icon: 'check_circle' },
  { key: 'PREPARING', label: 'Kitchen', icon: 'skillet' },
  { key: 'OUT_FOR_DELIVERY', label: 'On Way', icon: 'moped' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'task_alt' },
];

function getProgressIndex(status: string) {
  if (status === 'DELIVERED') return 3;
  if (status === 'OUT_FOR_DELIVERY') return 2;
  if (status === 'READY_FOR_PICKUP' || status === 'PREPARING') return 1;
  return 0;
}

// Subcomponent: Compact Unified Order Card
function SingleOrderCard({
  order,
  catalog,
}: {
  order: TrackOrderResponse;
  catalog: CatalogResponse | null;
}) {
  const [showBill, setShowBill] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  // Match photo from catalog or use sensible homestyle fallback
  const foodImageUrl = useMemo(() => {
    const itemName = order.items?.[0]?.name?.toLowerCase() || '';
    if (itemName.includes('khichdi') || itemName.includes('bowl')) {
      return 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80';
    }
    if (itemName.includes('phulka') || itemName.includes('roti')) {
      return 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80';
    }
    if (catalog?.categories) {
      const allItems = catalog.categories.flatMap((c) => c.items);
      const match = allItems.find((i) => i.name.toLowerCase() === itemName);
      if (match?.imageUrl) return match.imageUrl;
    }
    return DEFAULT_FOOD_IMAGE;
  }, [order, catalog]);

  const handleCopyPin = (pin: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const currentStep = getProgressIndex(order.status);
  const progressPercent = Math.min(100, Math.max(12, (currentStep / 3) * 100));

  let statusBadge = 'Cooking on Tawa 🔥';
  let statusDesc = 'Fresh rotis & dal simmering for dispatch';
  if (order.status === 'DELIVERED') {
    statusBadge = 'Delivered Fresh 🎉';
    statusDesc = 'Handed over and verified via PIN';
  } else if (order.status === 'OUT_FOR_DELIVERY') {
    statusBadge = 'Out for Delivery 🛵';
    statusDesc = `${order.riderName || 'Rider'} is on the way to your door`;
  } else if (order.status === 'READY_FOR_PICKUP') {
    statusBadge = 'Packed & Ready 🍱';
    statusDesc = 'Sealed warm in spill-proof trays';
  } else if (order.status === 'ACCEPTED' || order.status === 'PLACED') {
    statusBadge = 'Confirmed by Chef 🍳';
    statusDesc = 'Order confirmed for upcoming delivery batch';
  }

  const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
  const totalItemCount = order.items ? order.items.reduce((acc, i) => acc + (i.quantity || 1), 0) : 1;

  return (
    <div className="bg-white rounded-3xl shadow-xs border border-[#EEE7DC] overflow-hidden flex flex-col transition-all">
      {/* 1. Header Section: Food Thumbnail + Status + PIN */}
      <div className="p-4 sm:p-5 flex flex-col gap-3.5">
        <div className="flex items-start gap-3.5">
          {/* Dish Photo Thumbnail (72px) with Veg Dot Badge */}
          <div className="relative w-[72px] h-[72px] min-w-[72px] max-w-[72px] rounded-2xl overflow-hidden bg-[#FFF9F0] border border-[#EEE7DC] shrink-0 shadow-xs">
            <img
              src={foodImageUrl}
              alt={firstItem?.name || 'Meal'}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_FOOD_IMAGE;
              }}
            />
            <span className="absolute top-1 left-1 w-3 h-3 rounded-xs border border-[#38754A] bg-white p-0.5 flex items-center justify-center shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38754A] block"></span>
            </span>
          </div>

          {/* Order Details & Status */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-[#38754A] bg-[#EAF4ED] px-2 py-0.5 rounded-full border border-[#38754A]/20 truncate">
                  #{order.orderNumber}
                </span>
                <span className="text-[10px] text-[#77786F] shrink-0 font-medium">
                  {order.deliverySlot}
                </span>
              </div>

              <div className="font-headline font-bold text-base text-[#292D26] mt-1 leading-tight">
                {statusBadge}
              </div>
              <p className="text-[11px] text-[#77786F] leading-snug line-clamp-1 mt-0.5">
                {statusDesc}
              </p>
            </div>

            {/* Dish Title & Handover PIN Row */}
            <div className="mt-2 pt-2 border-t border-[#EEE7DC]/60 flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="text-xs font-bold text-[#292D26] block truncate">
                  {firstItem?.name || 'Homestyle Special Thali'}
                </span>
                <span className="text-[10px] text-[#77786F]">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Handover PIN (OTP) */}
              <div className="shrink-0">
                {order.deliveryOtp && order.status !== 'DELIVERED' ? (
                  <button
                    onClick={() => handleCopyPin(order.deliveryOtp!)}
                    className="bg-[#FFF1DC] hover:bg-[#FFE7C4] border border-[#E99A32]/50 px-2.5 py-1 rounded-xl text-right transition-colors flex items-center gap-1.5 shadow-xs"
                    title="Tap to copy verbal PIN"
                  >
                    <div>
                      <span className="text-[9px] uppercase font-bold text-[#875200] block leading-none">
                        PIN
                      </span>
                      <span className="font-mono font-extrabold text-sm text-[#292D26] leading-none">
                        {order.deliveryOtp}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-[13px] text-[#875200]">
                      {copiedPin ? 'check' : 'content_copy'}
                    </span>
                  </button>
                ) : (
                  <span className="text-[10px] text-[#77786F] bg-[#FFF9F0] px-2 py-1 rounded-lg border border-[#EEE7DC] block font-medium">
                    {order.status === 'DELIVERED' ? 'Verified ✓' : 'PIN on dispatch'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Milestone Progress Bar */}
        <div className="pt-1">
          <div className="relative w-full h-2 bg-[#FFF9F0] border border-[#EEE7DC]/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#38754A] to-[#E99A32] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-4 text-center mt-2">
            {PROGRESS_STEPS.map((step, idx) => {
              const isDone = currentStep >= idx;
              const isCurrent = currentStep === idx;
              return (
                <div key={step.key} className="flex flex-col items-center gap-0.5">
                  <span
                    className={`material-symbols-outlined text-[15px] transition-colors ${
                      isCurrent
                        ? 'text-[#38754A] scale-110 animate-bounce'
                        : isDone
                        ? 'text-[#38754A]'
                        : 'text-[#C0C9BE]'
                    }`}
                  >
                    {step.icon}
                  </span>
                  <span
                    className={`text-[9px] sm:text-[10px] font-bold truncate max-w-full ${
                      isCurrent
                        ? 'text-[#38754A]'
                        : isDone
                        ? 'text-[#292D26]'
                        : 'text-[#77786F]'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Rider Phone Call Strip (When Out For Delivery) */}
        {order.status === 'OUT_FOR_DELIVERY' && (
          <div className="pt-2 border-t border-[#EEE7DC] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#EAF4ED] text-[#38754A] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">sports_motorsports</span>
              </span>
              <div>
                <span className="font-bold text-xs text-[#292D26] block leading-tight">
                  {order.riderName || 'Rider Sonu Kumar'}
                </span>
                <span className="text-[10px] text-[#77786F]">Delivery Partner</span>
              </div>
            </div>

            <a
              href={`tel:${order.riderPhone || '9876543210'}`}
              className="px-3.5 py-1.5 rounded-xl bg-[#38754A] hover:bg-[#285C38] text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">call</span>
              <span>Call Rider</span>
            </a>
          </div>
        )}
      </div>

      {/* 4. Bill & Details Accordion (Collapsed by Default) */}
      <div className="border-t border-[#EEE7DC] bg-[#FFF9F0]/60">
        <button
          onClick={() => setShowBill(!showBill)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[#FFF9F0] transition-colors"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-[#292D26]">
            <span className="material-symbols-outlined text-[17px] text-[#38754A]">receipt_long</span>
            <span>{showBill ? 'Hide Bill & Details' : 'View Bill & Order Details'}</span>
            <span className="text-[#77786F] font-normal">
              (₹{(order.totalAmountPaise / 100).toFixed(0)})
            </span>
          </div>

          <span
            className={`material-symbols-outlined text-[#77786F] text-base transition-transform duration-200 ${
              showBill ? 'rotate-180' : ''
            }`}
          >
            keyboard_arrow_down
          </span>
        </button>

        {showBill && (
          <div className="p-4 pt-1 border-t border-[#EEE7DC] flex flex-col gap-3 text-xs bg-white animate-fadeIn">
            {/* Dishes list */}
            <div>
              <span className="text-[10px] font-bold uppercase text-[#77786F] tracking-wider block mb-1">
                Dishes in Tiffin
              </span>
              <div className="flex flex-col divide-y divide-[#EEE7DC]">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-1.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#292D26]">
                        {item.quantity}x {item.name}
                      </span>
                      {item.variant && (
                        <span className="text-[10px] text-[#77786F] block">{item.variant}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Address & Instructions */}
            <div className="bg-[#FFF9F0] p-3 rounded-2xl border border-[#EEE7DC] flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[#38754A] text-[17px] shrink-0 mt-0.5">
                  location_on
                </span>
                <div className="text-[11px] text-[#292D26] leading-relaxed">
                  <strong className="block text-[#292D26]">Delivery Address:</strong>
                  {order.deliveryAddress ? (
                    <>
                      <span>{order.deliveryAddress.flat || ''} </span>
                      <span>{order.deliveryAddress.street || ''} </span>
                      {order.deliveryAddress.landmark && (
                        <span className="block text-[#77786F]">Landmark: {order.deliveryAddress.landmark}</span>
                      )}
                      <span className="text-[#38754A] font-semibold">Pincode: {order.deliveryAddress.pincode}</span>
                    </>
                  ) : (
                    <span>South &amp; Central Delhi Hub</span>
                  )}
                </div>
              </div>

              {order.deliveryNotes && (
                <div className="pt-1.5 border-t border-[#EEE7DC] flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#E99A32] text-[17px] shrink-0 mt-0.5">
                    notes
                  </span>
                  <div className="text-[11px] text-[#292D26]">
                    <strong className="block text-[#292D26]">Delivery Notes:</strong>
                    <span>{order.deliveryNotes}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bill Summary */}
            <div className="flex flex-col gap-1 border-t border-[#EEE7DC] pt-1">
              <div className="flex justify-between text-[#77786F] text-[11px]">
                <span>Item Total</span>
                <span>₹{(order.totalAmountPaise / 100).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-[#77786F] text-[11px]">
                <span>Delivery Fee</span>
                <span className="text-[#38754A] font-bold">FREE</span>
              </div>
              <div className="flex justify-between text-[#77786F] text-[11px]">
                <span>Payment Mode</span>
                <span className="font-medium">
                  {order.paymentMethod === 'COD' ? '💵 Cash on Delivery' : '💳 Paid Online'}
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-[#292D26] pt-1 border-t border-[#EEE7DC]">
                <span>Total Amount</span>
                <span className="text-[#38754A] font-bold">₹{(order.totalAmountPaise / 100).toFixed(0)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Share & Support Action Buttons */}
      <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#FFF9F0]/80 border-t border-[#EEE7DC]">
        <a
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
            `Tracking my Janki Rasoi meal (Order #${order.orderNumber}). Verbal Handover PIN: ${
              order.deliveryOtp || 'Unlocks upon arrival'
            }. Track live: https://jankirasoi.vercel.app/track?token=${order.orderNumber}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-1.5 px-2 rounded-xl bg-white text-[#38754A] font-bold text-[11px] flex items-center justify-center gap-1 border border-[#38754A]/20 hover:bg-[#EAF4ED] transition-colors shadow-xs"
        >
          <span className="material-symbols-outlined text-[15px] text-[#38754A]">share</span>
          <span>WhatsApp Share</span>
        </a>

        <a
          href="https://wa.me/919812345678?text=Hi%20Janki%20Rasoi,%20I%20have%20a%20query%20about%20Order%20"
          target="_blank"
          rel="noopener noreferrer"
          className="py-1.5 px-2 rounded-xl bg-white text-[#292D26] font-bold text-[11px] flex items-center justify-center gap-1 border border-[#EEE7DC] hover:bg-[#FFF9F0] transition-colors shadow-xs"
        >
          <span className="material-symbols-outlined text-[15px] text-[#38754A]">chat</span>
          <span>Kitchen Support</span>
        </a>
      </div>
    </div>
  );
}

// Main Page Content
function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token');

  const [orders, setOrders] = useState<TrackOrderResponse[]>([]);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch catalog once for dish photos
  useEffect(() => {
    api.getCatalog().then((cat) => setCatalog(cat)).catch(() => {});
  }, []);

  // Load and sync orders from URL and localStorage
  const loadOrders = useCallback(async (isSilent = false) => {
    if (typeof window === 'undefined') return;
    if (!isSilent) setLoading(true);

    try {
      const tokensToFetch: string[] = [];

      if (urlToken) {
        tokensToFetch.push(urlToken);
      }

      try {
        const stored = JSON.parse(window.localStorage.getItem('jr_recent_orders') || '[]');
        if (Array.isArray(stored)) {
          stored.slice(0, 5).forEach((item: any) => {
            const tok = item.trackingToken || item.orderNumber;
            if (tok && !tokensToFetch.includes(tok)) {
              tokensToFetch.push(tok);
            }
          });
        }
      } catch {}

      const lastToken = window.localStorage.getItem('jr_last_tracking_token');
      if (lastToken && !tokensToFetch.includes(lastToken)) {
        tokensToFetch.unshift(lastToken);
      }

      if (tokensToFetch.length === 0) {
        setOrders([]);
        if (!isSilent) setLoading(false);
        return;
      }

      const results = await Promise.allSettled(
        tokensToFetch.map((t) => api.trackOrder(t))
      );

      const fetchedOrders: TrackOrderResponse[] = [];
      results.forEach((res) => {
        if (res.status === 'fulfilled' && res.value?.orderNumber) {
          if (!fetchedOrders.some((o) => o.orderNumber === res.value.orderNumber)) {
            fetchedOrders.push(res.value);
          }
        }
      });

      setOrders(fetchedOrders);
      setError(null);
    } catch (err: any) {
      if (!isSilent) setError(err.message || 'Unable to fetch order status');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [urlToken]);

  useEffect(() => {
    loadOrders(false);

    // Fast polling every 4 seconds for live updates
    const interval = setInterval(() => loadOrders(true), 4000);

    // Instant sync on focus / visibility
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadOrders(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [loadOrders]);

  // Handle Search Submission
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setLoading(true);
    setError(null);
    try {
      const data = await api.trackOrder(query);
      if (data?.orderNumber) {
        setOrders((prev) => {
          const filtered = prev.filter((o) => o.orderNumber !== data.orderNumber);
          return [data, ...filtered];
        });
        setSelectedOrderIndex(0);
        setShowSearch(false);
        setSearchQuery('');
      }
    } catch (err: any) {
      setError(err.message || 'Order not found for given number or phone.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Empty State
  if (!loading && orders.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[60vh] pt-20 pb-28 px-4 bg-[#FFF9F0]">
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-[#EEE7DC] max-w-sm w-full text-center flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[#EAF4ED] text-[#38754A] flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px]">receipt_long</span>
          </div>
          <h2 className="font-headline font-bold text-lg text-[#292D26]">No Active Order Found</h2>
          <p className="text-xs text-[#77786F] leading-relaxed">
            You haven't placed an order yet, or your tracking session has expired.
          </p>
          <Link
            href="/menu"
            className="mt-2 h-10 px-6 rounded-full bg-[#38754A] hover:bg-[#285C38] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Order Food Now</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </main>
    );
  }

  // 2. Loading State
  if (loading && orders.length === 0) {
    return (
      <main className="pt-20 pb-28 max-w-lg mx-auto px-4 bg-[#FFF9F0]">
        <div className="h-64 rounded-3xl bg-white border border-[#EEE7DC] animate-pulse mb-4"></div>
      </main>
    );
  }

  const activeOrder = orders[selectedOrderIndex] || orders[0];

  return (
    <main className="flex flex-col relative w-full pt-16 pb-28 bg-[#FFF9F0] min-h-screen">
      <div className="flex flex-col w-full max-w-lg mx-auto px-3 sm:px-4 pb-6 gap-3.5">
        {/* Top Bar: Back to Home + Order Switcher Pills + Search Button */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs font-bold text-[#77786F] hover:text-[#292D26] bg-white px-3 py-1.5 rounded-full border border-[#EEE7DC] shadow-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Home</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#292D26]">
              {orders.length > 1 ? `${orders.length} Orders` : 'Live Order'}
            </span>

            <button
              onClick={() => setShowSearch(!showSearch)}
              aria-label="Search order"
              className="w-8 h-8 rounded-full bg-white border border-[#EEE7DC] flex items-center justify-center text-[#77786F] hover:text-[#292D26] shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
            </button>
          </div>
        </div>

        {/* Expandable Search Input */}
        {showSearch && (
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white p-2.5 rounded-2xl border border-[#EEE7DC] shadow-xs flex gap-2 animate-fadeIn"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter Order # or 10-digit Phone"
              className="flex-1 bg-[#FFF9F0] border border-[#EEE7DC] rounded-xl px-3 py-1.5 text-xs text-[#292D26] placeholder-[#77786F] focus:outline-none focus:border-[#38754A]"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-[#38754A] hover:bg-[#285C38] text-white text-xs font-bold transition-colors"
            >
              Find
            </button>
          </form>
        )}

        {/* Multi-Order Tabs Switcher (If user has multiple recent orders) */}
        {orders.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
            {orders.map((ord, idx) => {
              const isSelected = idx === selectedOrderIndex;
              return (
                <button
                  key={ord.orderNumber}
                  onClick={() => setSelectedOrderIndex(idx)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-[#38754A] text-white border-[#38754A] shadow-xs'
                      : 'bg-white text-[#77786F] border-[#EEE7DC] hover:border-[#38754A]/40'
                  }`}
                >
                  #{ord.orderNumber}
                </button>
              );
            })}
          </div>
        )}

        {/* Error Notification Banner if present */}
        {error && (
          <div className="p-2.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* THE UNIFIED COMPACT CARD */}
        {activeOrder && (
          <SingleOrderCard order={activeOrder} catalog={catalog} />
        )}
      </div>
    </main>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-24 text-center text-xs font-bold text-[#77786F]">
          Loading live tracking...
        </div>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}
