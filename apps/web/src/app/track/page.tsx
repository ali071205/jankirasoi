'use client';

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  Suspense,
} from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, TrackOrderResponse, CatalogResponse, DEFAULT_FOOD_IMAGE } from '../../lib/api';

// ── Delivery timeline steps ─────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { key: 'PLACED',            label: 'Order Placed',        icon: 'receipt_long' },
  { key: 'ACCEPTED',          label: 'Order Confirmed',      icon: 'check_circle' },
  { key: 'PREPARING',         label: 'Food Being Prepared',  icon: 'skillet' },
  { key: 'READY_FOR_PICKUP',  label: 'Ready for Pickup',     icon: 'inventory_2' },
  { key: 'OUT_FOR_DELIVERY',  label: 'Out for Delivery',     icon: 'moped' },
  { key: 'DELIVERED',         label: 'Delivered',            icon: 'task_alt' },
] as const;

type TimelineKey = typeof TIMELINE_STEPS[number]['key'];

const STATUS_ORDER: TimelineKey[] = [
  'PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED',
];

function getTimelineIndex(status: string): number {
  const idx = STATUS_ORDER.indexOf(status as TimelineKey);
  return idx === -1 ? 0 : idx;
}

// ETA string from status
function getEtaLabel(status: string, slot: string): string {
  if (status === 'DELIVERED') return 'Delivered ✓';
  if (status === 'OUT_FOR_DELIVERY') return '10–20 min away';
  if (status === 'READY_FOR_PICKUP') return 'Departing soon';
  if (status === 'PREPARING') return 'Cooking in progress';
  if (status === 'ACCEPTED') return 'Kitchen confirmed';
  if (status === 'PLACED') return 'Awaiting kitchen';
  return slot || 'On schedule';
}

// Status headline
function getStatusHeadline(status: string): string {
  if (status === 'DELIVERED') return 'Order Delivered! 🎉';
  if (status === 'OUT_FOR_DELIVERY') return 'Order is on the way!';
  if (status === 'READY_FOR_PICKUP') return 'Packed & Ready 🍱';
  if (status === 'PREPARING') return 'Cooking on Tawa 🔥';
  if (status === 'ACCEPTED') return 'Confirmed by Chef 🍳';
  return 'Order Received!';
}

// ── Map Placeholder ──────────────────────────────────────────────────────────
function MapPlaceholder({ status }: { status: string }) {
  const isMoving = status === 'OUT_FOR_DELIVERY';
  return (
    <div className="relative w-full h-52 sm:h-64 bg-gradient-to-br from-[#EAF4ED] via-[#F0F7F2] to-[#E8F0EB] rounded-2xl overflow-hidden border border-[#38754A]/15 shadow-inner">
      {/* Decorative grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#38754A" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>

      {/* Road line illustration */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
        <path d="M0,140 Q100,100 200,120 T400,100" stroke="#C8DCC8" strokeWidth="18" fill="none" strokeLinecap="round"/>
        <path d="M0,140 Q100,100 200,120 T400,100" stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="20 15" strokeLinecap="round"/>
      </svg>

      {/* Destination marker */}
      <div className="absolute right-8 top-8 flex flex-col items-center">
        <div className="w-9 h-9 rounded-full bg-[#38754A] shadow-lg flex items-center justify-center border-3 border-white">
          <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-[#38754A] mt-0.5" />
      </div>

      {/* Rider marker — animated when out for delivery */}
      {isMoving && (
        <div className="absolute left-1/4 bottom-12 flex flex-col items-center animate-bounce">
          <div className="w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-[#38754A]">
            <span className="material-symbols-outlined text-[#38754A] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>moped</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-[#38754A] mt-0.5" />
        </div>
      )}

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 flex flex-col items-center gap-0.5 shadow-sm border border-[#38754A]/10">
          <span className="text-[11px] font-bold text-[#38754A] uppercase tracking-wide">
            {isMoving ? 'Rider En Route' : 'Live Map'}
          </span>
          <span className="text-[10px] text-[#77786F]">
            {isMoving ? 'Heading to your location' : 'Map updates when rider departs'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Delivery Timeline ────────────────────────────────────────────────────────
function DeliveryTimeline({ status }: { status: string }) {
  const currentIdx = getTimelineIndex(status);
  return (
    <div className="bg-white rounded-2xl border border-[#EEE7DC] p-4 shadow-xs">
      <h3 className="text-xs font-extrabold text-[#292D26] uppercase tracking-wider mb-4">Delivery Progress</h3>
      <div className="flex flex-col gap-0">
        {TIMELINE_STEPS.map((step, idx) => {
          const isDone = currentIdx > idx;
          const isCurrent = currentIdx === idx;
          const isFuture = currentIdx < idx;
          return (
            <div key={step.key} className="flex items-start gap-3">
              {/* Icon + line */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCurrent
                      ? 'bg-[#38754A] border-[#38754A] shadow-md shadow-[#38754A]/30'
                      : isDone
                      ? 'bg-[#EAF4ED] border-[#38754A]'
                      : 'bg-[#F5F3EF] border-[#D8D2C8]'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[15px] ${
                      isCurrent ? 'text-white' : isDone ? 'text-[#38754A]' : 'text-[#BBBAB6]'
                    }`}
                    style={isCurrent ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {isDone ? 'check' : step.icon}
                  </span>
                </div>
                {/* Connector line */}
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={`w-0.5 h-7 mt-0.5 rounded-full ${
                      isDone ? 'bg-[#38754A]' : isCurrent ? 'bg-gradient-to-b from-[#38754A] to-[#D8D2C8]' : 'bg-[#E2DBD0]'
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <div className="pb-7 flex-1 min-w-0">
                <span
                  className={`text-xs font-bold block leading-tight ${
                    isCurrent
                      ? 'text-[#38754A]'
                      : isDone
                      ? 'text-[#292D26]'
                      : 'text-[#BBBAB6]'
                  }`}
                >
                  {step.label}
                </span>
                {isCurrent && (
                  <span className="text-[10px] text-[#77786F] mt-0.5 block">In progress</span>
                )}
                {isDone && (
                  <span className="text-[10px] text-[#38754A] mt-0.5 block">Completed ✓</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Rider Card ────────────────────────────────────────────────────────────────
function RiderCard({ order }: { order: TrackOrderResponse }) {
  // Only show when OUT_FOR_DELIVERY
  if (order.status !== 'OUT_FOR_DELIVERY') return null;

  const hasRider = !!order.riderName;
  const hasPhone = !!order.riderPhone;

  return (
    <div className="bg-white rounded-2xl border border-[#EEE7DC] p-4 shadow-xs flex items-center gap-3">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-[#EAF4ED] border-2 border-[#38754A]/20 flex items-center justify-center shrink-0 overflow-hidden">
        <span className="material-symbols-outlined text-[#38754A] text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          sports_motorsports
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {hasRider ? (
          <>
            <div className="text-sm font-extrabold text-[#292D26] truncate">{order.riderName}</div>
            <div className="text-[11px] text-[#77786F]">Delivery Partner • Heading your way</div>
          </>
        ) : (
          <>
            <div className="text-sm font-bold text-[#292D26]">Rider Assigned</div>
            <div className="text-[11px] text-[#77786F]">Partner details loading…</div>
          </>
        )}
      </div>

      {/* Call button — only when we have a real phone number */}
      {hasRider && hasPhone && (
        <a
          href={`tel:${order.riderPhone}`}
          className="shrink-0 w-10 h-10 rounded-full bg-[#38754A] text-white flex items-center justify-center shadow-sm hover:bg-[#285C38] active:scale-95 transition-all"
          aria-label={`Call ${order.riderName}`}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>call</span>
        </a>
      )}
    </div>
  );
}

// ── Order Details Card ────────────────────────────────────────────────────────
function OrderDetailsCard({ order }: { order: TrackOrderResponse }) {
  const [showItems, setShowItems] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  const handleCopyPin = () => {
    if (order.deliveryOtp && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(order.deliveryOtp);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const hasAddress =
    order.deliveryAddress &&
    (order.deliveryAddress.flat || order.deliveryAddress.street || order.deliveryAddress.pincode);

  return (
    <div className="bg-white rounded-2xl border border-[#EEE7DC] shadow-xs overflow-hidden">
      {/* Delivery Address */}
      <div className="p-4 flex items-start gap-3 border-b border-[#EEE7DC]">
        <div className="w-9 h-9 rounded-xl bg-[#EAF4ED] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[#38754A] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-[#77786F] uppercase tracking-wide mb-0.5">Delivering To</div>
          {hasAddress ? (
            <div className="text-xs text-[#292D26] leading-relaxed">
              {[order.deliveryAddress!.flat, order.deliveryAddress!.street, order.deliveryAddress!.landmark]
                .filter(Boolean)
                .join(', ')}
              {order.deliveryAddress!.pincode && (
                <span className="text-[#38754A] font-semibold"> – {order.deliveryAddress!.pincode}</span>
              )}
            </div>
          ) : (
            <div className="text-xs text-[#77786F]">South & Central Delhi Hub</div>
          )}
          {order.customerName && (
            <div className="text-[11px] text-[#77786F] mt-0.5">{order.customerName}</div>
          )}
        </div>
      </div>

      {/* Order ID + OTP row */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#EEE7DC]">
        <div>
          <div className="text-[11px] text-[#77786F]">Order ID</div>
          <div className="text-xs font-extrabold text-[#292D26]">#{order.orderNumber}</div>
        </div>
        {order.deliveryOtp && order.status !== 'DELIVERED' ? (
          <button
            onClick={handleCopyPin}
            className="flex items-center gap-1.5 bg-[#FFF1DC] border border-[#E99A32]/50 px-3 py-1.5 rounded-xl hover:bg-[#FFE7C4] transition-colors shadow-xs"
            title="Tap to copy verbal handover PIN"
          >
            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-[#875200] block leading-none">PIN</span>
              <span className="font-mono font-extrabold text-sm text-[#292D26] leading-none">{order.deliveryOtp}</span>
            </div>
            <span className="material-symbols-outlined text-[13px] text-[#875200]">
              {copiedPin ? 'check' : 'content_copy'}
            </span>
          </button>
        ) : order.status === 'DELIVERED' ? (
          <span className="text-[11px] text-[#38754A] font-bold bg-[#EAF4ED] px-2.5 py-1 rounded-lg">Verified ✓</span>
        ) : null}
      </div>

      {/* Items accordion */}
      <button
        onClick={() => setShowItems(!showItems)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#FFF9F0] transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-[#292D26]">
          <span className="material-symbols-outlined text-[17px] text-[#38754A]">receipt_long</span>
          <span>{showItems ? 'Hide Items' : 'View Ordered Items'}</span>
          <span className="text-[#77786F] font-normal">
            ({order.items.reduce((acc, i) => acc + (i.quantity || 1), 0)} items)
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-[#77786F] shrink-0 transition-transform duration-200 ${showItems ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showItems && (
        <div className="px-4 pb-4 pt-0 border-t border-[#EEE7DC] flex flex-col gap-2">
          {/* Items list */}
          <div className="flex flex-col divide-y divide-[#EEE7DC] mt-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#292D26]">{item.quantity}x {item.name}</span>
                  {item.variant && (
                    <span className="text-[10px] text-[#77786F] block">{item.variant}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bill summary */}
          <div className="flex flex-col gap-1 border-t border-[#EEE7DC] pt-2">
            <div className="flex justify-between text-[11px] text-[#77786F]">
              <span>Item Total</span>
              <span>₹{(order.totalAmountPaise / 100).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-[#77786F]">
              <span>Delivery Fee</span>
              <span className="text-[#38754A] font-bold">FREE</span>
            </div>
            <div className="flex justify-between text-xs font-extrabold text-[#292D26] pt-1 border-t border-[#EEE7DC]">
              <span>Total Paid</span>
              <span className="text-[#38754A]">₹{(order.totalAmountPaise / 100).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-[#77786F]">
              <span>Payment</span>
              <span>{order.paymentMethod === 'COD' ? '💵 Cash on Delivery' : '💳 Paid Online'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Food image helper ────────────────────────────────────────────────────────
function useFoodImage(order: TrackOrderResponse, catalog: CatalogResponse | null): string {
  return useMemo(() => {
    const itemName = order.items?.[0]?.name?.toLowerCase() || '';
    if (catalog?.categories) {
      const allItems = catalog.categories.flatMap((c) => c.items);
      const match = allItems.find((i) => i.name.toLowerCase() === itemName);
      if (match?.imageUrl) return match.imageUrl;
    }
    return DEFAULT_FOOD_IMAGE;
  }, [order, catalog]);
}

// ── Main tracking content ─────────────────────────────────────────────────────
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

      if (urlToken) tokensToFetch.push(urlToken);

      try {
        const stored = JSON.parse(window.localStorage.getItem('jr_recent_orders') || '[]');
        if (Array.isArray(stored)) {
          stored.slice(0, 5).forEach((item: any) => {
            const tok = item.trackingToken || item.orderNumber;
            if (tok && !tokensToFetch.includes(tok)) tokensToFetch.push(tok);
          });
        }
      } catch {}

      const lastToken = window.localStorage.getItem('jr_last_tracking_token');
      if (lastToken && !tokensToFetch.includes(lastToken)) tokensToFetch.unshift(lastToken);

      if (tokensToFetch.length === 0) {
        setOrders([]);
        if (!isSilent) setLoading(false);
        return;
      }

      const results = await Promise.allSettled(tokensToFetch.map((t) => api.trackOrder(t)));

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
    const interval = setInterval(() => loadOrders(true), 4000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadOrders(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [loadOrders]);

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

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading && orders.length === 0) {
    return (
      <main className="flex flex-col relative w-full pt-16 min-h-screen bg-[#FFF9F0]">
        <div className="w-full max-w-lg mx-auto px-4 pt-4 flex flex-col gap-4">
          {/* Skeleton header */}
          <div className="h-32 rounded-2xl bg-gradient-to-br from-[#EAF4ED] to-[#D4EBD9] animate-pulse" />
          <div className="h-52 rounded-2xl bg-white border border-[#EEE7DC] animate-pulse" />
          <div className="h-20 rounded-2xl bg-white border border-[#EEE7DC] animate-pulse" />
          <div className="h-64 rounded-2xl bg-white border border-[#EEE7DC] animate-pulse" />
        </div>
      </main>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!loading && orders.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[70vh] pt-20 pb-28 px-4 bg-[#FFF9F0]">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#EEE7DC] max-w-sm w-full text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#EAF4ED] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#38754A] text-[34px]">receipt_long</span>
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-[#292D26] font-headline">No Active Orders</h2>
            <p className="text-xs text-[#77786F] mt-1 leading-relaxed">
              You haven't placed an order yet, or your tracking session has expired.
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="w-full flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Order # or 10-digit phone"
              className="flex-1 bg-[#FFF9F0] border border-[#EEE7DC] rounded-xl px-3 py-2 text-xs text-[#292D26] placeholder-[#77786F] focus:outline-none focus:border-[#38754A]"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#38754A] text-white text-xs font-bold hover:bg-[#285C38] transition-colors"
            >
              Find
            </button>
          </form>

          {error && (
            <p className="text-xs text-red-600 font-medium">{error}</p>
          )}

          <Link
            href="/menu"
            className="w-full h-11 rounded-full bg-[#38754A] hover:bg-[#285C38] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <span>Order Food Now</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </main>
    );
  }

  const activeOrder = orders[selectedOrderIndex] || orders[0];

  return <TrackingView order={activeOrder} catalog={catalog} orders={orders} selectedOrderIndex={selectedOrderIndex} setSelectedOrderIndex={setSelectedOrderIndex} showSearch={showSearch} setShowSearch={setShowSearch} searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleSearchSubmit={handleSearchSubmit} error={error} />;
}

// ── Main tracking view ────────────────────────────────────────────────────────
function TrackingView({
  order,
  catalog,
  orders,
  selectedOrderIndex,
  setSelectedOrderIndex,
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
  handleSearchSubmit,
  error,
}: {
  order: TrackOrderResponse;
  catalog: CatalogResponse | null;
  orders: TrackOrderResponse[];
  selectedOrderIndex: number;
  setSelectedOrderIndex: (i: number) => void;
  showSearch: boolean;
  setShowSearch: (v: boolean) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  handleSearchSubmit: (e: React.FormEvent) => void;
  error: string | null;
}) {
  const foodImage = useFoodImage(order, catalog);
  const etaLabel = getEtaLabel(order.status, order.deliverySlot);
  const headline = getStatusHeadline(order.status);
  const firstItem = order.items?.[0]?.name ?? 'Homestyle Thali';
  const totalItems = order.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) ?? 1;
  const isDelivered = order.status === 'DELIVERED';

  return (
    <main className="flex flex-col relative w-full min-h-screen bg-[#FFF9F0]">
      {/* ── Green ETA Header ─────────────────────────────────────────────── */}
      <div className={`w-full pt-16 pb-6 px-4 ${isDelivered ? 'bg-[#38754A]' : 'bg-gradient-to-br from-[#38754A] via-[#2F6340] to-[#235030]'}`}>
        <div className="max-w-lg mx-auto">
          {/* Top bar: back + order switcher + search */}
          <div className="flex items-center justify-between mb-5">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
              aria-label="Back to Home"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
              <span className="text-xs font-bold">Home</span>
            </Link>

            <div className="flex items-center gap-2">
              {orders.length > 1 && (
                <span className="text-xs font-bold text-white/70">{orders.length} Orders</span>
              )}
              <button
                onClick={() => setShowSearch(!showSearch)}
                aria-label="Search order"
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
              </button>
            </div>
          </div>

          {/* Search input */}
          {showSearch && (
            <form
              onSubmit={handleSearchSubmit}
              className="mb-4 bg-white/15 backdrop-blur p-2.5 rounded-2xl border border-white/20 flex gap-2"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Order # or 10-digit phone"
                className="flex-1 bg-white/20 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/60 focus:outline-none focus:border-white/60"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-white text-[#38754A] text-xs font-bold transition-colors"
              >
                Find
              </button>
            </form>
          )}

          {/* Multi-order pills */}
          {orders.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
              {orders.map((ord, idx) => (
                <button
                  key={ord.orderNumber}
                  onClick={() => setSelectedOrderIndex(idx)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    idx === selectedOrderIndex
                      ? 'bg-white text-[#38754A] border-white shadow-sm'
                      : 'bg-white/15 text-white/70 border-white/20 hover:border-white/40'
                  }`}
                >
                  #{ord.orderNumber}
                </button>
              ))}
            </div>
          )}

          {/* Headline */}
          <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight mb-1">
            {headline}
          </h1>

          {/* ETA pill */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
              <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isDelivered ? 'task_alt' : 'schedule'}
              </span>
              <span className="text-white font-extrabold text-sm">{etaLabel}</span>
            </div>
          </div>

          {/* Food item row */}
          <div className="mt-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/30 shrink-0">
              <img
                src={foodImage}
                alt={firstItem}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_FOOD_IMAGE;
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-sm truncate">{firstItem}</div>
              <div className="text-white/70 text-[11px]">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} &bull; {order.deliverySlot}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable content below header ─────────────────────────────── */}
      <div className="flex-1 w-full max-w-lg mx-auto px-4 py-4 pb-28 flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Map area */}
        <MapPlaceholder status={order.status} />

        {/* Rider card */}
        <RiderCard order={order} />

        {/* Order details */}
        <OrderDetailsCard order={order} />

        {/* Delivery timeline */}
        <DeliveryTimeline status={order.status} />

        {/* Support / share */}
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              `Tracking Janki Rasoi order #${order.orderNumber}. PIN: ${order.deliveryOtp || 'On dispatch'}. Track: https://jankirasoi.in/track?token=${order.orderNumber}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 rounded-xl bg-white text-[#38754A] font-bold text-[11px] flex items-center justify-center gap-1.5 border border-[#38754A]/20 hover:bg-[#EAF4ED] transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[15px]">share</span>
            <span>Share on WhatsApp</span>
          </a>
          <a
            href="https://wa.me/919812345678?text=Hi%20Janki%20Rasoi%2C%20I%20need%20help%20with%20my%20order."
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 rounded-xl bg-white text-[#292D26] font-bold text-[11px] flex items-center justify-center gap-1.5 border border-[#EEE7DC] hover:bg-[#FFF9F0] transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[15px] text-[#38754A]">chat</span>
            <span>Kitchen Support</span>
          </a>
        </div>
      </div>
    </main>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────
export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#FFF9F0]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#EAF4ED] flex items-center justify-center animate-pulse">
              <span className="material-symbols-outlined text-[#38754A] text-[24px]">moped</span>
            </div>
            <span className="text-xs font-bold text-[#77786F]">Loading live tracking…</span>
          </div>
        </div>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}
