'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { api, TrackOrderResponse, DEFAULT_FOOD_IMAGE } from '../lib/api';

export default function BottomNav() {
  const pathname = usePathname();
  const { totalCount, totalPricePaise } = useCart();
  const [activeOrder, setActiveOrder] = useState<{
    token: string;
    orderNumber: string;
    status: string;
    punchyLine: string;
    firstItemName: string;
    totalItems: number;
    imageUrl?: string;
  } | null>(null);

  const [dismissedOrderId, setDismissedOrderId] = useState<string | null>(null);

  // Poll / check for active customer orders
  useEffect(() => {
    let isMounted = true;

    async function checkActiveOrder() {
      if (typeof window === 'undefined') return;
      try {
        const lastToken = window.localStorage.getItem('jr_last_tracking_token');
        if (!lastToken) {
          if (isMounted) setActiveOrder(null);
          return;
        }

        const data: TrackOrderResponse = await api.trackOrder(lastToken);
        if (!isMounted) return;

        // If the order is still ongoing (not yet delivered or cancelled)
        if (data.status !== 'DELIVERED' && data.status !== 'CANCELLED') {
          let punchyLine = 'Preparing your Ghar Jaisa Lunch 🥘';
          if (data.status === 'OUT_FOR_DELIVERY') {
            punchyLine = 'Rider is on the way with your tiffin 🛵';
          } else if (data.status === 'READY_FOR_PICKUP') {
            punchyLine = 'Packed warm in spill-proof sealed tray 🍱';
          } else if (data.status === 'PREPARING') {
            punchyLine = 'Piping hot tawa phulkas on flame 🔥';
          } else if (data.status === 'ACCEPTED') {
            punchyLine = 'Chef confirmed your meal batch 🍳';
          } else if (data.status === 'PLACED') {
            punchyLine = 'Order received by kitchen station 👨‍🍳';
          }

          const firstItem = data.items && data.items.length > 0 ? data.items[0].name : 'Homestyle Thali';
          const totalQty = data.items ? data.items.reduce((acc, i) => acc + (i.quantity || 1), 0) : 1;

          setActiveOrder({
            token: lastToken,
            orderNumber: data.orderNumber,
            status: data.status,
            punchyLine,
            firstItemName: firstItem,
            totalItems: totalQty,
            imageUrl: DEFAULT_FOOD_IMAGE,
          });
        } else {
          setActiveOrder(null);
        }
      } catch (err) {
        if (isMounted) setActiveOrder(null);
      }
    }

    checkActiveOrder();
    const interval = setInterval(checkActiveOrder, 12000); // Check every 12s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pathname]);

  // Don't show floating bar on rider interface
  if (pathname.startsWith('/rider')) return null;

  const showCartPill = totalCount > 0 && pathname !== '/cart';
  const showActiveOrderPill =
    activeOrder !== null &&
    pathname !== '/track' &&
    dismissedOrderId !== activeOrder.orderNumber;

  // If there are no items in cart and no active order, return null
  if (!showCartPill && !showActiveOrderPill) return null;

  return (
    <aside
      aria-label="Order Status and Cart"
      className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40 flex flex-col gap-2 pointer-events-none animate-fadeIn"
    >
      {/* 1. If user added items to cart, the Cart Bar always takes top priority for the primary action */}
      {showCartPill ? (
        <>
          {/* Mini dismissible active order status pill when shopping */}
          {showActiveOrderPill && activeOrder && (
            <div className="pointer-events-auto bg-stone-900/95 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full shadow-lg border border-stone-800/80 flex items-center justify-between text-xs self-center max-w-md w-full animate-fadeIn">
              <Link
                href={`/track?token=${activeOrder.token}`}
                className="flex items-center gap-2 truncate hover:text-emerald-400 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="text-[11px] truncate font-medium">
                  Active Order #{activeOrder.orderNumber}:{' '}
                  <span className="text-emerald-300 font-bold">{activeOrder.status}</span>
                </span>
              </Link>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <Link
                  href={`/track?token=${activeOrder.token}`}
                  className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Track</span>
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDismissedOrderId(activeOrder.orderNumber);
                  }}
                  className="w-4 h-4 rounded-full text-stone-400 hover:text-white flex items-center justify-center text-xs"
                  title="Dismiss alert"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Primary Action: View Cart / Tray */}
          <Link
            href="/cart"
            className="pointer-events-auto bg-white/95 backdrop-blur-md text-stone-900 p-2.5 sm:p-3 rounded-2xl shadow-xl shadow-stone-900/10 border border-stone-200/90 flex items-center justify-between hover:border-primary transition-all group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-orange-500/30 shrink-0">
                <span className="material-symbols-outlined text-[20px]">lunch_dining</span>
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                  {totalCount}
                </span>
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-stone-900 leading-tight">
                  {totalCount} {totalCount === 1 ? 'Meal' : 'Meals'} in Tray • ₹{(totalPricePaise / 100).toFixed(0)}
                </div>
                <div className="text-[11px] text-stone-500 truncate mt-0.5">Fresh Tawa Homestyle Meals</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/25 group-hover:scale-102 transition-all shrink-0 ml-2">
              <span>View Tray</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </div>
          </Link>
        </>
      ) : showActiveOrderPill && activeOrder ? (
        /* 2. If Cart is empty, show the floating Live Order Card with Track and Dismiss actions */
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md text-stone-900 p-2.5 sm:p-3 rounded-2xl shadow-xl shadow-stone-900/10 border border-stone-200/90 flex items-center justify-between transition-all group relative">
          <Link
            href={`/track?token=${activeOrder.token}`}
            className="flex items-center gap-3 min-w-0 flex-1"
          >
            {/* Purchased Food Item Thumbnail + Veg Square */}
            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-stone-100 border border-stone-200/80 shrink-0 shadow-2xs">
              <img
                src={activeOrder.imageUrl || DEFAULT_FOOD_IMAGE}
                alt={activeOrder.firstItemName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_FOOD_IMAGE;
                }}
              />
              <span className="absolute top-1 left-1 w-2.5 h-2.5 rounded-xs border border-green-600 bg-white p-0.5 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 block"></span>
              </span>
            </div>

            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="text-xs font-extrabold text-stone-900 truncate">
                  {activeOrder.punchyLine}
                </span>
              </div>
              <div className="text-[11px] text-stone-500 truncate mt-0.5">
                <span className="font-medium text-stone-700">{activeOrder.firstItemName}</span>
                {activeOrder.totalItems > 1 ? ` (+${activeOrder.totalItems - 1} more)` : ''} • Order #{activeOrder.orderNumber}
              </div>
            </div>
          </Link>

          {/* Right Action: Clean Green Pill + Dismiss */}
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <Link
              href={`/track?token=${activeOrder.token}`}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-primary text-white font-bold text-xs shadow-xs hover:bg-emerald-800 transition-colors"
            >
              <span>Track</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
            <button
              onClick={() => setDismissedOrderId(activeOrder.orderNumber)}
              className="w-6 h-6 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center text-xs transition-colors"
              title="Dismiss tracking card"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
