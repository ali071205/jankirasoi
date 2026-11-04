'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { DEFAULT_FOOD_IMAGE } from '../lib/api';

export interface DeliveryStatusPillProps {
  orderNumber: string;
  token?: string;
  status: string;
  createdAt?: string;
  imageUrl?: string;
  itemName?: string;
  deliveryAddress?: {
    flat?: string;
    street?: string;
    landmark?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
  };
  onClick?: (e?: React.MouseEvent) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

// Sagore Central Kitchen Coordinates
const SAGORE_KITCHEN_LAT = 22.6288;
const SAGORE_KITCHEN_LNG = 75.5684;

/**
 * Calculates dynamic delivery estimate based on:
 * - Kitchen prep status (Cooking, Queued, Packed)
 * - Rider travel time & distance from Sagore Kitchen
 * - Elapsed minutes since order creation
 */
export function calculateDynamicDeliveryEstimate(
  status: string,
  createdAt?: string,
  address?: { pincode?: string; latitude?: number; longitude?: number }
): {
  displayText: string;
  subText: string;
  remainingMinutes: number;
} {
  const normStatus = (status || '').toUpperCase();

  if (normStatus === 'DELIVERED') {
    return { displayText: 'Delivered', subText: 'Order completed', remainingMinutes: 0 };
  }
  if (normStatus === 'CANCELLED') {
    return { displayText: 'Cancelled', subText: 'Order cancelled', remainingMinutes: 0 };
  }

  // 1. Distance Calculation from Kitchen (Haversine or Pincode)
  let distanceKm = 2.5; // default Sagore area distance
  if (address?.latitude && address?.longitude) {
    const lat1 = (SAGORE_KITCHEN_LAT * Math.PI) / 180;
    const lat2 = (address.latitude * Math.PI) / 180;
    const dLat = ((address.latitude - SAGORE_KITCHEN_LAT) * Math.PI) / 180;
    const dLng = ((address.longitude - SAGORE_KITCHEN_LNG) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distanceKm = Math.min(15, Math.max(0.5, 6371 * c));
  } else if (address?.pincode) {
    if (address.pincode === '454774') distanceKm = 2.0;
    else if (address.pincode === '454775') distanceKm = 7.5;
    else if (address.pincode === '453331') distanceKm = 12.0;
    else if (address.pincode === '453001') distanceKm = 14.0;
  }

  // 2. Rider Travel Time (~2.5 mins per km + 3 mins dispatch/arrival buffer)
  const riderTravelTime = Math.round(distanceKm * 2.5 + 3);

  // 3. Elapsed Time since order was placed
  let elapsedMinutes = 0;
  if (createdAt) {
    const createdTs = new Date(createdAt).getTime();
    if (!isNaN(createdTs)) {
      elapsedMinutes = Math.max(0, Math.floor((Date.now() - createdTs) / 60000));
    }
  }

  let remainingMinutes = 15;
  let subText = 'Cooking fresh';

  switch (normStatus) {
    case 'OUT_FOR_DELIVERY': {
      // Rider on the way to delivery address
      const transitDeduction = Math.min(riderTravelTime - 2, Math.floor(elapsedMinutes * 0.4));
      remainingMinutes = Math.max(3, riderTravelTime - transitDeduction);
      subText = 'Rider on the way';
      break;
    }
    case 'READY_FOR_PICKUP': {
      // Meal cooked and packed warm in trays; rider pickup + travel
      remainingMinutes = Math.max(5, riderTravelTime + 2);
      subText = 'Packed & waiting pickup';
      break;
    }
    case 'PREPARING': {
      // Fresh rotis on tawa and dal simmering
      const remainingCooking = Math.max(4, 16 - elapsedMinutes);
      remainingMinutes = remainingCooking + riderTravelTime;
      subText = 'Cooking in kitchen';
      break;
    }
    case 'ACCEPTED':
    case 'PLACED':
    default: {
      // Queued at chef station
      const remainingQueue = Math.max(6, 20 - elapsedMinutes);
      remainingMinutes = remainingQueue + riderTravelTime;
      subText = 'Order confirmed';
      break;
    }
  }

  return {
    displayText: `Delivering in ${remainingMinutes} min`,
    subText,
    remainingMinutes,
  };
}

/**
 * Resolves the food thumbnail image for an order item using catalog fallback
 */
export function resolveOrderFoodImage(itemName?: string, fallbackUrl?: string): string {
  if (fallbackUrl && fallbackUrl !== DEFAULT_FOOD_IMAGE) {
    return fallbackUrl;
  }

  if (!itemName) return DEFAULT_FOOD_IMAGE;
  const lower = itemName.toLowerCase();

  // Common homestyle dish category images
  if (lower.includes('thali') || lower.includes('special')) {
    return 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80';
  }
  if (lower.includes('khichdi') || lower.includes('bowl')) {
    return 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('phulka') || lower.includes('roti') || lower.includes('paratha')) {
    return 'https://images.unsplash.com/photo-1606471191009-63994c53433b?auto=format&fit=crop&w=400&q=80';
  }

  return DEFAULT_FOOD_IMAGE;
}

export default function DeliveryStatusPill({
  orderNumber,
  token,
  status,
  createdAt,
  imageUrl,
  itemName,
  deliveryAddress,
  onClick,
  className = '',
  size = 'sm',
  interactive = true,
}: DeliveryStatusPillProps) {
  // Real-time ticking estimate updater
  const [, setTick] = useState(0);

  useEffect(() => {
    // Re-evaluate dynamic time every 15 seconds
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  const estimate = useMemo(() => {
    return calculateDynamicDeliveryEstimate(status, createdAt, deliveryAddress);
  }, [status, createdAt, deliveryAddress]);

  const foodImage = useMemo(() => {
    return resolveOrderFoodImage(itemName, imageUrl);
  }, [itemName, imageUrl]);

  const [imgSrc, setImgSrc] = useState(foodImage);
  useEffect(() => {
    setImgSrc(foodImage);
  }, [foodImage]);

  const isLarge = size === 'lg';
  const normStatus = (status || '').toUpperCase();
  const isDelivered = normStatus === 'DELIVERED';
  const isCancelled = normStatus === 'CANCELLED';
  const isActive = !isDelivered && !isCancelled;

  const bgBorderStyles = isLarge
    ? isActive
      ? 'bg-[#EAF4ED] hover:bg-[#DCEDE0] border-[#38754A]/30 text-[#292D26] shadow-xs'
      : isDelivered
      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 shadow-2xs'
      : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800'
    : 'bg-white hover:bg-[#FFF9F0] border-[#EEE7DC] text-[#292D26] shadow-2xs hover:border-[#38754A]/30';

  const containerPadding = isLarge
    ? 'pl-2 pr-3.5 py-2 sm:pl-2.5 sm:pr-4 sm:py-2.5 rounded-2xl'
    : 'pl-1 pr-2.5 py-1 rounded-xl';

  const containerClasses = `inline-flex items-center gap-2.5 border transition-all group shrink-0 ${containerPadding} ${bgBorderStyles} ${className}`;

  const targetUrl = `/track?token=${encodeURIComponent(token || orderNumber)}`;

  const content = (
    <>
      {/* 1. Food Thumbnail on the Left */}
      <div
        className={`relative ${
          isLarge ? 'w-10 h-10 sm:w-11 sm:h-11 rounded-xl shadow-2xs' : 'w-7 h-7 sm:w-8 sm:h-8 rounded-lg'
        } overflow-hidden bg-[#FFF9F0] border border-[#EEE7DC]/80 shrink-0`}
      >
        <img
          src={imgSrc}
          alt={itemName || 'Order meal'}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          onError={() => setImgSrc(DEFAULT_FOOD_IMAGE)}
        />
      </div>

      {/* 2. Delivery Information on the Right */}
      <div className="flex flex-col text-left leading-tight min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2 shrink-0">
            {isActive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38754A] opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isDelivered ? 'bg-slate-400' : isCancelled ? 'bg-rose-500' : 'bg-[#38754A]'
              }`}
            ></span>
          </span>
          <span
            className={`${
              isLarge ? 'text-xs sm:text-sm font-black' : 'text-[11px] sm:text-xs font-bold'
            } text-[#292D26] tracking-tight whitespace-nowrap`}
          >
            {estimate.displayText}
          </span>
        </div>
        <span
          className={`${
            isLarge ? 'text-[10px] sm:text-xs font-semibold' : 'text-[9px] sm:text-[10px] font-medium'
          } text-[#77786F] truncate max-w-[130px] sm:max-w-[180px] mt-0.5`}
        >
          {estimate.subText}
        </span>
      </div>

      {/* 3. Subtle chevron arrow if interactive or requested */}
      {interactive && (
        <span className="material-symbols-outlined text-[16px] text-[#77786F] group-hover:text-[#38754A] group-hover:translate-x-0.5 transition-all ml-0.5 shrink-0">
          chevron_right
        </span>
      )}
    </>
  );

  if (!interactive) {
    return (
      <div className={containerClasses} aria-label={`Order status: ${estimate.displayText}`}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={targetUrl}
      onClick={onClick}
      className={containerClasses}
      aria-label={`Order status: ${estimate.displayText}`}
    >
      {content}
    </Link>
  );
}
