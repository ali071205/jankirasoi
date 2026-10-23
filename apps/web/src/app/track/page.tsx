'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, TrackOrderResponse, CatalogResponse, DEFAULT_FOOD_IMAGE } from '../../lib/api';

const PROGRESS_STEPS = [
  { key: 'ACCEPTED', label: 'Confirmed', icon: 'check_circle' },
  { key: 'PREPARING', label: 'Cooking', icon: 'skillet' },
  { key: 'READY_FOR_PICKUP', label: 'Packed', icon: 'inventory_2' },
  { key: 'OUT_FOR_DELIVERY', label: 'On Way', icon: 'moped' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'task_alt' },
];

function getProgressIndex(status: string) {
  if (status === 'DELIVERED') return 4;
  if (status === 'OUT_FOR_DELIVERY') return 3;
  if (status === 'READY_FOR_PICKUP') return 2;
  if (status === 'PREPARING') return 1;
  return 0;
}

// Subcomponent: Individual Order Card
function SingleOrderCard({
  order,
  catalog,
}: {
  order: TrackOrderResponse;
  catalog: CatalogResponse | null;
}) {
  const [showBill, setShowBill] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  // Reliable, dish-specific high-resolution photography
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
  const progressPercent = Math.min(100, Math.max(10, (currentStep / 4) * 100));

  let statusBadge = 'Cooking on Tawa 🔥';
  let statusDesc = 'Fresh phulkas & dal simmering on order';
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
    statusDesc = 'Prep started for today’s batch dispatch';
  }

  const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-stone-200/90 overflow-hidden flex flex-col transition-all">
      {/* Top Section: Food Image on LEFT side + Order Info on RIGHT side */}
      <div className="p-4 sm:p-5 flex flex-col gap-3.5">
        <div className="flex items-start gap-3.5">
          {/* Left Side: Real Food Photo with Pure Veg Green Dot (Strict 72px thumbnail) */}
          <div className="relative w-[72px] h-[72px] min-w-[72px] max-w-[72px] rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 shadow-xs">
            <img
              src={foodImageUrl}
              alt={firstItem?.name || 'Meal'}
              className="w-full h-full object-cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_FOOD_IMAGE;
              }}
            />
            <span className="absolute top-1 left-1 w-2.5 h-2.5 rounded-xs border border-green-600 bg-white p-0.5 flex items-center justify-center shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 block"></span>
            </span>
          </div>

          {/* Right Side: Order #, Status, Dish Name & Handover PIN */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-primary bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 truncate">
                  #{order.orderNumber}
                </span>
                <span className="text-[10px] text-stone-400 shrink-0">
                  {order.deliverySlot}
                </span>
              </div>

              <div className="font-headline font-bold text-base text-stone-900 mt-1 leading-tight">
                {statusBadge}
              </div>
              <p className="text-[11px] text-stone-500 leading-snug line-clamp-1 mt-0.5">
                {statusDesc}
              </p>
            </div>

            {/* Dish Title & PIN Row */}
            <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="text-xs font-bold text-stone-800 block truncate">
                  {firstItem?.name || 'Homestyle Special Thali'}
                </span>
                <span className="text-[10px] text-stone-400">
                  {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Handover PIN (OTP) */}
              <div className="shrink-0">
                {order.deliveryOtp ? (
                  <button
                    onClick={() => handleCopyPin(order.deliveryOtp!)}
                    className="bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-xl text-right transition-colors flex items-center gap-1.5 shadow-2xs"
                    title="Tap to copy PIN"
                  >
                    <div>
                      <span className="text-[9px] uppercase font-bold text-amber-800 block leading-none">
                        PIN
                      </span>
                      <span className="font-mono font-extrabold text-sm text-stone-900 leading-none">
                        {order.deliveryOtp}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-[13px] text-amber-700">
                      {copiedPin ? 'check' : 'content_copy'}
                    </span>
                  </button>
                ) : (
                  <span className="text-[10px] text-stone-400 bg-stone-50 px-2 py-1 rounded-lg border border-stone-200 block">
                    PIN on dispatch
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Flow & Icons */}
        <div className="pt-1">
          <div className="relative w-full h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 via-primary to-amber-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-5 text-center mt-2">
            {PROGRESS_STEPS.map((step, idx) => {
              const isDone = currentStep >= idx;
              const isCurrent = currentStep === idx;
              return (
                <div key={step.key} className="flex flex-col items-center gap-0.5">
                  <span
                    className={`material-symbols-outlined text-[15px] transition-colors ${
                      isCurrent
                        ? 'text-primary scale-110 animate-bounce'
                        : isDone
                        ? 'text-emerald-700'
                        : 'text-stone-300'
                    }`}
                  >
                    {step.icon}
                  </span>
                  <span
                    className={`text-[9px] sm:text-[10px] font-bold truncate max-w-full ${
                      isCurrent
                        ? 'text-primary'
                        : isDone
                        ? 'text-stone-800'
                        : 'text-stone-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rider Phone Call Strip (When Out For Delivery) */}
        {order.status === 'OUT_FOR_DELIVERY' && (
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">sports_motorsports</span>
              </span>
              <div>
                <span className="font-bold text-xs text-stone-900 block leading-tight">
                  {order.riderName || 'Rider Sonu Kumar'}
                </span>
                <span className="text-[10px] text-stone-500">Delivery Partner</span>
              </div>
            </div>

            <a
              href={`tel:${order.riderPhone || '9876543210'}`}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">call</span>
              <span>Call Rider</span>
            </a>
          </div>
        )}
      </div>

      {/* Bill Description & Order Details (Appears ONLY AFTER Click) */}
      <div className="border-t border-stone-200/90 bg-stone-50/60">
        <button
          onClick={() => setShowBill(!showBill)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-stone-100/70 transition-colors"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
            <span className="material-symbols-outlined text-[17px] text-primary">receipt_long</span>
            <span>{showBill ? 'Hide Bill & Details' : 'View Bill & Order Details'}</span>
            <span className="text-stone-400 font-normal">
              (₹{(order.totalAmountPaise / 100).toFixed(0)})
            </span>
          </div>

          <span
            className={`material-symbols-outlined text-stone-400 text-base transition-transform duration-200 ${
              showBill ? 'rotate-180' : ''
            }`}
          >
            keyboard_arrow_down
          </span>
        </button>

        {/* Collapsed by default: ONLY APPEARS AFTER CLICK */}
        {showBill && (
          <div className="p-4 pt-1 border-t border-stone-200/70 flex flex-col gap-3 text-xs bg-white animate-in fade-in duration-150">
            {/* Dishes */}
            <div>
              <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider block mb-1">
                Dishes in Tiffin
              </span>
              <div className="flex flex-col divide-y divide-stone-100">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-1.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-stone-900">
                        {item.quantity}x {item.name}
                      </span>
                      {item.variant && (
                        <span className="text-[10px] text-stone-500 block">{item.variant}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Address & Instructions */}
            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[17px] shrink-0 mt-0.5">
                  location_on
                </span>
                <div className="text-[11px] text-stone-700 leading-relaxed">
                  <strong className="block text-stone-900">Delivery Address:</strong>
                  {order.deliveryAddress ? (
                    <>
                      <span>{order.deliveryAddress.flat || ''} </span>
                      <span>{order.deliveryAddress.street || ''} </span>
                      {order.deliveryAddress.landmark && (
                        <span className="block text-stone-500">Landmark: {order.deliveryAddress.landmark}</span>
                      )}
                      <span className="text-primary font-semibold">Pincode: {order.deliveryAddress.pincode}</span>
                    </>
                  ) : (
                    <span>South &amp; Central Delhi Hub</span>
                  )}
                </div>
              </div>

              <div className="pt-1.5 border-t border-stone-200/60 flex items-start gap-2">
                <span className="material-symbols-outlined text-amber-700 text-[17px] shrink-0 mt-0.5">
                  notes
                </span>
                <div className="text-[11px] text-stone-700">
                  <strong className="block text-stone-900">Delivery Notes:</strong>
                  <span>{order.deliveryNotes || 'Ring bell once & leave warm tray at doorstep.'}</span>
                </div>
              </div>
            </div>

            {/* Bill Summary */}
            <div className="flex flex-col gap-1 border-t border-stone-100 pt-1">
              <div className="flex justify-between text-stone-600 text-[11px]">
                <span>Item Total</span>
                <span>₹{(order.totalAmountPaise / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600 text-[11px]">
                <span>Delivery Fee</span>
                <span className="text-emerald-700 font-bold">FREE</span>
              </div>
              <div className="flex justify-between text-stone-600 text-[11px]">
                <span>Payment Mode</span>
                <span className="font-medium">
                  {order.paymentMethod === 'COD' ? '💵 Cash on Delivery' : '💳 Paid Online (UPI)'}
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-stone-900 pt-1 border-t border-stone-200">
                <span>Total Amount</span>
                <span className="text-primary font-bold">₹{(order.totalAmountPaise / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Share & Support Action Buttons */}
      <div className="grid grid-cols-2 gap-2 p-2.5 bg-stone-50/80 border-t border-stone-200/70">
        <a
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
            `Tracking my Janki Rasoi meal (Order #${order.orderNumber}). Verbal Handover PIN: ${
              order.deliveryOtp || 'Unlocks upon arrival'
            }. Track live: http://10.103.206.252:3001/track?token=${order.orderNumber}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-1.5 px-2 rounded-xl bg-white text-emerald-800 font-bold text-[11px] flex items-center justify-center gap-1 border border-emerald-200 hover:bg-emerald-50 transition-colors shadow-2xs"
        >
          <span className="material-symbols-outlined text-[15px] text-emerald-600">share</span>
          <span>WhatsApp Share</span>
        </a>

        <a
          href="https://wa.me/919812345678?text=Hi%20Janki%20Rasoi,%20I%20have%20a%20query%20about%20Order%20"
          target="_blank"
          rel="noopener noreferrer"
          className="py-1.5 px-2 rounded-xl bg-white text-stone-800 font-bold text-[11px] flex items-center justify-center gap-1 border border-stone-200 hover:bg-stone-50 transition-colors shadow-2xs"
        >
          <span className="material-symbols-outlined text-[15px] text-primary">chat</span>
          <span>Kitchen Help</span>
        </a>
      </div>
    </div>
  );
}

// Main Page Content
function TrackContent() {
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token');

  const [orders, setOrders] = useState<TrackOrderResponse[]>([]);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Initial load + Real-time auto sync for order tracking
  useEffect(() => {
    let isMounted = true;

    async function loadAllOrders(isSilent = false) {
      if (typeof window === 'undefined') return;

      if (!isSilent) {
        setLoading(true);
      }

      try {
        // Fetch catalog for food images (only on initial load)
        if (!isSilent) {
          api.getCatalog().then((cat) => {
            if (isMounted) setCatalog(cat);
          }).catch(() => {});
        }

        // Gather order tokens from URL, recent orders array, and last token
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
          if (isMounted) {
            setOrders([]);
            setLoading(false);
          }
          return;
        }

        // Fetch all orders in parallel
        const results = await Promise.allSettled(
          tokensToFetch.map((t) => api.trackOrder(t))
        );

        if (!isMounted) return;

        const fetchedOrders: TrackOrderResponse[] = [];
        results.forEach((res) => {
          if (res.status === 'fulfilled' && res.value?.orderNumber) {
            // Deduplicate by orderNumber
            if (!fetchedOrders.some((o) => o.orderNumber === res.value.orderNumber)) {
              fetchedOrders.push(res.value);
            }
          }
        });

        setOrders(fetchedOrders);
        if (fetchedOrders.length === 0 && tokensToFetch.length > 0 && !isSilent) {
          setError('Could not find active order. Please check order number or phone.');
        }
      } catch (err: any) {
        if (isMounted && !isSilent) setError(err.message || 'Failed to load live tracking.');
      } finally {
        if (isMounted && !isSilent) setLoading(false);
      }
    }

    // 1. Initial full fetch
    loadAllOrders(false);

    // 2. Silent polling interval every 3.5 seconds
    const interval = setInterval(() => {
      loadAllOrders(true);
    }, 3500);

    // 3. Instant sync on tab visibility or window focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadAllOrders(true);
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
  }, [urlToken]);

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
        setShowSearch(false);
        setSearchQuery('');
      }
    } catch (err: any) {
      setError(err.message || 'Order not found for given number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 pt-20 pb-28 max-w-lg mx-auto w-full px-4 flex flex-col gap-3.5">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between py-1">
        <Link
          href="/"
          className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white px-3 py-1.5 rounded-full border border-stone-200/80 shadow-2xs transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-700">
            {orders.length > 0 ? `${orders.length} Order${orders.length > 1 ? 's' : ''}` : 'Live Tracking'}
          </span>

          <button
            onClick={() => setShowSearch(!showSearch)}
            aria-label="Search order"
            className="w-8 h-8 rounded-full bg-white border border-stone-200/80 flex items-center justify-center text-stone-600 hover:text-stone-900 shadow-2xs transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
          </button>
        </div>
      </div>

      {/* Expandable Search Input */}
      {showSearch && (
        <form onSubmit={handleSearchSubmit} className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs flex gap-2 animate-in fade-in">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter Order # or 10-digit Phone"
            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-emerald-800"
          >
            Track
          </button>
        </form>
      )}

      {/* Loading Skeleton */}
      {loading && orders.length === 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-stone-200/80 animate-pulse flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="w-[72px] h-[72px] min-w-[72px] bg-stone-200 rounded-2xl shrink-0"></div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-5 bg-stone-200 rounded w-3/4"></div>
              <div className="h-4 bg-stone-100 rounded w-1/2"></div>
            </div>
          </div>
          <div className="h-2 bg-stone-100 rounded-full w-full"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <div className="bg-white rounded-3xl p-8 text-center flex flex-col items-center gap-3 shadow-xs border border-stone-200/80">
          <span className="material-symbols-outlined text-[44px] text-primary">moped</span>
          <h2 className="font-headline font-bold text-base text-stone-900">No Orders Found</h2>
          <p className="text-xs text-stone-500 max-w-xs">
            {error || 'Place a homestyle tiffin meal from our menu to track your fresh batch delivery.'}
          </p>
          <Link
            href="/menu"
            className="mt-2 px-5 py-2.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-emerald-800 shadow-sm"
          >
            Order Lunch or Dinner
          </Link>
        </div>
      )}

      {/* ORDERS DISPLAYED ONE BY ONE IN A ROW / LIST */}
      {orders.length > 0 && (
        <div className="flex flex-col gap-4">
          {orders.map((ord) => (
            <SingleOrderCard
              key={ord.orderNumber}
              order={ord}
              catalog={catalog}
            />
          ))}
        </div>
      )}
    </main>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-xs text-stone-500">
          Loading live tracking console...
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
