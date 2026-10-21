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
  const showActiveOrderPill = activeOrder !== null && pathname !== '/track';

  // If there are no items in cart and no active order, return null
  if (!showCartPill && !showActiveOrderPill) return null;

  return (
    <aside aria-label="Order Status and Cart" className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40 flex flex-col pointer-events-none animate-fadeIn">
      {/* Show ONLY ONE floating card at any time in semi-transparent frosted glass style */}
      {showActiveOrderPill && activeOrder ? (
        <Link
          href={`/track?token=${activeOrder.token}`}
          className="pointer-events-auto bg-white/90 backdrop-blur-md text-stone-900 p-2.5 sm:p-3 rounded-2xl shadow-xl shadow-stone-900/10 border border-stone-200/90 flex items-center justify-between hover:border-primary transition-all group active:scale-[0.99]"
        >
          {/* Purchased Food Item Thumbnail + Veg Square */}
          <div className="flex items-center gap-3 min-w-0">
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
          </div>

          {/* Right Action: Clean Green Pill */}
          <div className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-primary text-white font-bold text-xs shadow-xs group-hover:bg-emerald-800 transition-colors shrink-0 ml-2">
            <span>Track</span>
            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
              chevron_right
            </span>
          </div>
        </Link>
      ) : showCartPill ? (
        <Link
          href="/cart"
          className="pointer-events-auto bg-white/90 backdrop-blur-md text-stone-900 p-2.5 sm:p-3 rounded-2xl shadow-xl shadow-stone-900/10 border border-stone-200/90 flex items-center justify-between hover:border-primary transition-all group active:scale-[0.99]"
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
      ) : null}
    </aside>
  );
}
