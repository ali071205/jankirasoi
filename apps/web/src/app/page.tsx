'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, DeliverySlot, MenuItem } from '../lib/api';

export default function HomePage() {
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [slotsData, catalogData] = await Promise.all([
          api.getSlots(today).catch(() => ({ slots: [] })),
          api.getCatalog().catch(() => ({ categories: [] })),
        ]);

        if (slotsData && slotsData.slots) {
          setSlots(slotsData.slots);
        }

        if (catalogData && catalogData.categories) {
          const allItems = catalogData.categories.flatMap((c) => c.items);
          setFeaturedItems(allItems.slice(0, 2));
        }
      } catch (err) {
        console.error('Failed to load home page live data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <main className="flex-1 pt-20 pb-20 max-w-4xl mx-auto w-full px-4 flex flex-col gap-5">
      {/* Free Delivery Notice */}
      <div className="bg-surface-container-low rounded-xl px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[22px]">bolt</span>
          <p className="text-xs sm:text-sm font-medium text-on-surface">
            <span className="font-bold text-secondary">Free delivery</span> on orders above ₹299 in South & Central Delhi
          </p>
        </div>
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary font-bold">
          LIVE
        </span>
      </div>

      {/* Hero Card */}
      <div className="rounded-2xl bg-surface-container-lowest overflow-hidden shadow-sm border border-black/5">
        <div className="relative h-64 w-full">
          <img
            className="w-full h-full object-cover"
            alt="Janki Rasoi Traditional Thali"
            src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-xs text-primary font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Fresh Afternoon Batch
            </span>
          </div>
          <div className="absolute bottom-4 inset-x-4 text-white">
            <span className="text-xs uppercase tracking-wider text-green-200 font-bold block mb-1">
              Ghar Jaisa Swad
            </span>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold leading-tight">
              Ghar Ka Shuddh Khana, Har Din!
            </h1>
            <p className="text-xs sm:text-sm text-gray-200 mt-1">
              Homestyle North Indian tiffins prepared in pure desi ghee and cold-pressed oil.
            </p>
          </div>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3 bg-white">
          <Link
            href="/menu"
            className="h-11 rounded-full bg-primary-container text-on-primary font-semibold text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform"
          >
            <span>Order Lunch Now</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
          <Link
            href="/menu?slot=dinner"
            className="h-11 rounded-full bg-surface-container text-on-surface font-semibold text-sm flex items-center justify-center gap-1 active:scale-95 transition-transform"
          >
            <span>Explore Dinner</span>
          </Link>
        </div>
      </div>

      {/* Live Slots Available (Live from Supabase via NestJS API) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-headline font-bold text-lg text-on-surface">Daily Delivery Windows</h2>
          <span className="text-xs text-primary font-bold">Delhi NCR Service</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {loading ? (
            <>
              <div className="p-4 rounded-xl bg-surface-container-lowest shadow-xs border border-black/5 animate-pulse h-28"></div>
              <div className="p-4 rounded-xl bg-surface-container-lowest shadow-xs border border-black/5 animate-pulse h-28"></div>
            </>
          ) : slots.length > 0 ? (
            slots.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl bg-surface-container-lowest shadow-xs border border-black/5 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-primary/10">
                      {s.mealType}
                    </span>
                    <h3 className="font-headline font-bold text-base mt-1 text-on-surface">{s.label}</h3>
                  </div>
                  <span className="material-symbols-outlined text-primary text-[24px]">schedule</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-xs">
                  <span className="text-on-surface-variant">
                    Capacity: <strong>{s.remainingCapacity} tiffins left</strong>
                  </span>
                  <span className="text-secondary font-bold">Cutoff: {s.cutoffTime}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-4 rounded-xl bg-white text-xs text-gray-500 text-center">
              Delivery slots are being scheduled for today.
            </div>
          )}
        </div>
      </section>

      {/* Quick Menu Preview */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-headline font-bold text-lg text-on-surface">Featured Thalis Today</h2>
          <Link href="/menu" className="text-xs text-primary font-bold hover:underline">
            View All &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {loading ? (
            <>
              <div className="p-4 rounded-xl bg-surface-container-lowest shadow-xs border border-black/5 animate-pulse h-28"></div>
              <div className="p-4 rounded-xl bg-surface-container-lowest shadow-xs border border-black/5 animate-pulse h-28"></div>
            </>
          ) : (
            featuredItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-surface-container-lowest shadow-xs border border-black/5 flex gap-3"
              >
                <img
                  className="w-24 h-24 rounded-lg object-cover bg-gray-100 shrink-0"
                  src={item.imageUrl || 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=400&q=80'}
                  alt={item.name}
                />
                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <div>
                    <span className="w-3.5 h-3.5 border border-green-600 flex items-center justify-center p-0.5 rounded-xs inline-block mb-1">
                      <span className="w-2 h-2 rounded-full bg-green-600 block"></span>
                    </span>
                    <h3 className="font-headline font-bold text-sm text-on-surface truncate">{item.name}</h3>
                    <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{item.description || ''}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-sm text-on-surface">
                      ₹{(item.basePricePaise / 100).toFixed(2)}
                    </span>
                    <Link
                      href="/menu"
                      className="px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-colors"
                    >
                      Customize
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
