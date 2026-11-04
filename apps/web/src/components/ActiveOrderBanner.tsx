'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, TrackOrderResponse, DEFAULT_FOOD_IMAGE } from '../lib/api';

interface ActiveOrderBannerProps {
  className?: string;
}

export default function ActiveOrderBanner({ className = '' }: ActiveOrderBannerProps) {
  const [order, setOrder] = useState<TrackOrderResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchOrder() {
      if (typeof window === 'undefined') return;
      let tokenToUse = window.localStorage.getItem('jr_last_tracking_token');

      // Fallback 1: check recent orders in local storage
      if (!tokenToUse) {
        try {
          const stored = JSON.parse(window.localStorage.getItem('jr_recent_orders') || '[]');
          if (Array.isArray(stored) && stored.length > 0) {
            tokenToUse = stored[0].trackingToken || stored[0].orderNumber;
          }
        } catch {}
      }

      // Fallback 2: check active orders by customer phone
      if (!tokenToUse) {
        const phone = window.localStorage.getItem('jr_customer_phone');
        if (phone) {
          try {
            const customerOrders = await api.getCustomerOrders(phone);
            const active = customerOrders.find((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
            if (active) tokenToUse = active.trackingToken || active.orderNumber;
          } catch {}
        }
      }

      if (!tokenToUse) {
        if (isMounted) setOrder(null);
        return;
      }

      try {
        const data = await api.trackOrder(tokenToUse);
        if (!isMounted) return;

        // Only show if order is active (not delivered or cancelled)
        if (data && data.status !== 'DELIVERED' && data.status !== 'CANCELLED') {
          setOrder(data);
          setToken(tokenToUse);
        } else {
          setOrder(null);
        }
      } catch {
        if (isMounted) setOrder(null);
      }
    }

    fetchOrder();
    const interval = setInterval(fetchOrder, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!order || !token) return null;

  // Status mapping matching Blinkit style
  const statusConfig: Record<string, { title: string; subtitle: string; icon: string; badgeBg: string }> = {
    PLACED: {
      title: 'Order Received & Confirmed',
      subtitle: 'Kitchen assigned • Cooking soon',
      icon: 'receipt_long',
      badgeBg: 'bg-[#38754A]',
    },
    ACCEPTED: {
      title: 'Order Confirmed by Chef',
      subtitle: 'Preparing fresh homestyle ingredients',
      icon: 'check_circle',
      badgeBg: 'bg-[#38754A]',
    },
    PREPARING: {
      title: 'Cooking on Fresh Tawa 🔥',
      subtitle: 'Homestyle rotis & thali being packed',
      icon: 'skillet',
      badgeBg: 'bg-[#E85D04]',
    },
    READY_FOR_PICKUP: {
      title: 'Packed & Ready for Rider 🍱',
      subtitle: 'Insulated cask packed at kitchen',
      icon: 'takeout_dining',
      badgeBg: 'bg-[#E99A32]',
    },
    OUT_FOR_DELIVERY: {
      title: 'Out for Delivery 🛵',
      subtitle: `Rider ${order.riderName || 'on bike'} is on the way`,
      icon: 'moped',
      badgeBg: 'bg-[#38754A]',
    },
  };

  const currentConfig = statusConfig[order.status] || {
    title: 'Active Order in Progress',
    subtitle: order.deliverySlot || 'Homestyle Delivery',
    icon: 'moped',
    badgeBg: 'bg-[#38754A]',
  };

  const firstItem = order.items?.[0]?.name || 'Homestyle Pure Veg Meal';
  const itemCount = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;

  // Real-time Dynamic ETA Calculation based on Prep Time + Distance
  const etaText = (() => {
    // 1. Kitchen prep / packaging time based on items:
    // - Parathas, Sabzis, Dals: ~6-8 min cook time
    // - Rice, Poha, Chai, Thalis: ~2-4 min packaging only
    const items = order.items || [];
    let prepMinutes = 4; // default packaging buffer
    const hasFreshCookItem = items.some((i) => {
      const n = (i.name || '').toLowerCase();
      return n.includes('paratha') || n.includes('sabzi') || n.includes('paneer') || n.includes('tadka');
    });
    if (hasFreshCookItem) {
      prepMinutes = 7;
    }

    // 2. Distance in KM from Sagore Kitchen (22.6288, 75.5684)
    let distanceKm = 2.5; // default within Sagore town
    if (order.coordinates?.latitude && order.coordinates?.longitude) {
      const lat1 = (22.6288 * Math.PI) / 180;
      const lat2 = (order.coordinates.latitude * Math.PI) / 180;
      const dLat = ((order.coordinates.latitude - 22.6288) * Math.PI) / 180;
      const dLng = ((order.coordinates.longitude - 75.5684) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceKm = Math.min(15, Math.max(0.5, 6371 * c));
    } else if (order.deliveryAddress?.pincode === '454774') {
      distanceKm = 2.0;
    } else if (order.deliveryAddress?.pincode === '454775') {
      distanceKm = 5.0;
    }

    // 3. Travel time: ~2 minutes per km + 2 min dispatch buffer
    const travelMinutes = Math.round(distanceKm * 2.0 + 2);

    // 4. Elapsed time since order creation
    let elapsedMinutes = 0;
    if (order.createdAt) {
      const createdTs = new Date(order.createdAt).getTime();
      if (!isNaN(createdTs)) {
        elapsedMinutes = Math.max(0, Math.floor((Date.now() - createdTs) / 60000));
      }
    }

    if (order.status === 'DELIVERED') return 'Delivered ✓';

    if (order.status === 'OUT_FOR_DELIVERY') {
      const transitElapsed = Math.floor(elapsedMinutes * 0.5);
      const remaining = Math.max(3, travelMinutes - transitElapsed);
      return `Arriving in ${remaining} mins`;
    }

    if (order.status === 'READY_FOR_PICKUP') {
      const remaining = Math.max(5, travelMinutes + 2);
      return `Arriving in ${remaining} mins`;
    }

    if (order.status === 'PREPARING') {
      const remaining = Math.max(6, prepMinutes + travelMinutes - elapsedMinutes);
      return `Delivering in ${remaining} mins`;
    }

    // PLACED / ACCEPTED
    const remaining = Math.max(10, prepMinutes + travelMinutes - elapsedMinutes);
    return `Delivering in ${remaining} mins`;
  })();

  return (
    <div className={`w-full ${className}`}>
      <Link
        href={`/track?token=${token}`}
        id="active-order-tracking-banner"
        aria-label="View live kitchen order tracking"
        className="group relative flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#38754A]/30 shadow-md hover:shadow-lg active:scale-[0.99] transition-all overflow-hidden cursor-pointer"
      >
        {/* Subtle decorative left accent stripe */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#38754A] via-[#5BAB74] to-[#285C38] rounded-l-2xl" />

        {/* Left Section: Pulsing Icon & Status Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
          {/* Animated Status Icon */}
          <div className="relative shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#EAF4ED] border border-[#38754A]/20 flex items-center justify-center text-[#38754A]">
            <span
              className="material-symbols-outlined text-[24px] sm:text-[26px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {currentConfig.icon}
            </span>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#38754A] border-2 border-white animate-ping" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#38754A] border-2 border-white" />
          </div>

          {/* Texts */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-extrabold text-[#292D26] truncate">
                {currentConfig.title}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF4ED] text-[#38754A] border border-[#38754A]/20">
                <span className="material-symbols-outlined text-[12px]">schedule</span>
                <span>{etaText}</span>
              </span>
            </div>

            <div className="text-[11px] sm:text-xs text-[#77786F] truncate mt-0.5">
              <strong className="text-[#292D26] font-semibold">{firstItem}</strong>
              {itemCount > 1 ? ` +${itemCount - 1} more` : ''} &bull; Order #{order.orderNumber}
            </div>
          </div>
        </div>

        {/* Right Section: Action Button with Chevron */}
        <div className="shrink-0 flex items-center gap-1.5 pl-2">
          <div className="hidden sm:flex flex-col items-end mr-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#77786F]">Live Status</span>
            <span className="text-xs font-bold text-[#38754A]">Track Order</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#38754A] group-hover:bg-[#285C38] text-white flex items-center justify-center shadow-xs transition-colors">
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
              chevron_right
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
