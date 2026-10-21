'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, DeliverySlot, MenuItem, DEFAULT_FOOD_IMAGE } from '../lib/api';
import { useCart } from '../context/CartContext';

export default function HomePage() {
  const [slots, setSlots] = useState<DeliverySlot[]>(() => {
    return api.getCachedSlots()?.slots || [];
  });
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>(() => {
    const cat = api.getCachedCatalog();
    return cat?.categories ? cat.categories.flatMap((c) => c.items).slice(0, 4) : [];
  });
  const [loading, setLoading] = useState(() => {
    const cachedSlots = api.getCachedSlots()?.slots?.length;
    const cachedCat = api.getCachedCatalog()?.categories?.length;
    return !(cachedSlots && cachedCat);
  });

  const { items, addItem, updateQty, totalCount, totalPricePaise } = useCart();

  useEffect(() => {
    async function loadData() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [slotsData, catalogData] = await Promise.all([
          api.getSlots(today).catch(() => ({ slots: [] })),
          api.getCatalog().catch(() => ({ categories: [] })),
        ]);

        if (slotsData && slotsData.slots && slotsData.slots.length > 0) {
          setSlots(slotsData.slots);
        }

        if (catalogData && catalogData.categories && catalogData.categories.length > 0) {
          const allItems = catalogData.categories.flatMap((c) => c.items);
          setFeaturedItems(allItems.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load home page live data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getItemQuantity = (productId: string) => {
    const cartItem = items.find((i) => i.productId === productId);
    return cartItem ? cartItem.quantity : 0;
  };

  const handleAdd = (item: MenuItem) => {
    addItem({
      productId: item.id,
      name: item.name,
      pricePaise: item.basePricePaise,
      imageUrl: item.imageUrl,
      quantity: 1,
    });
  };

  const handleIncrease = (item: MenuItem) => {
    const idx = items.findIndex((i) => i.productId === item.id);
    if (idx > -1) updateQty(idx, 1);
    else handleAdd(item);
  };

  const handleDecrease = (item: MenuItem) => {
    const idx = items.findIndex((i) => i.productId === item.id);
    if (idx > -1) updateQty(idx, -1);
  };

  return (
    <main className="flex-1 pt-20 pb-36 max-w-4xl mx-auto w-full px-4 flex flex-col gap-5">
      {/* Location & Free Delivery Banner (Swiggy / Zomato Pattern) */}
      <div className="bg-white rounded-2xl p-3 shadow-xs border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">near_me</span>
          <div>
            <span className="text-xs font-bold text-on-surface flex items-center gap-1">
              Delivering to: <span className="text-primary font-semibold">South &amp; Central Delhi</span>
            </span>
            <span className="text-[11px] text-gray-500 block">Malviya Nagar, Hauz Khas, Saket, Green Park, Lajpat Nagar</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
            Free Delivery &gt; ₹299
          </span>
        </div>
      </div>

      {/* Hero Card with Ghar Ka Khana Thesis */}
      <div className="rounded-3xl bg-surface-container-lowest overflow-hidden shadow-sm border border-black/5 relative">
        <div className="relative h-64 sm:h-72 w-full bg-surface-container">
          <img
            className="w-full h-full object-cover"
            alt="Janki Rasoi Traditional Thali"
            src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_FOOD_IMAGE;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent"></div>
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-xs text-primary font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Fresh Afternoon &amp; Evening Batches
            </span>
          </div>
          <div className="absolute bottom-4 inset-x-4 text-white">
            <span className="text-xs uppercase tracking-wider text-green-300 font-bold block mb-1">
              Ghar Jaisa Shuddh Swad
            </span>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold leading-tight">
              Ghar Ka Khana, Har Din!
            </h1>
            <p className="text-xs sm:text-sm text-gray-200 mt-1 max-w-lg">
              Authentic homestyle North Indian thalis prepared fresh in pure cow desi ghee and cold-pressed oil.
            </p>
          </div>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3 bg-white">
          <Link
            href="/menu"
            className="h-11 rounded-2xl bg-primary text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform"
          >
            <span>Order Lunch Tiffin</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
          <Link
            href="/menu?slot=dinner"
            className="h-11 rounded-2xl bg-surface-container text-on-surface font-bold text-xs sm:text-sm flex items-center justify-center gap-1 active:scale-95 transition-transform"
          >
            <span>Dinner Menu</span>
          </Link>
        </div>
      </div>

      {/* Purity & Trust Badges (Why Janki Rasoi?) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-white rounded-2xl border border-black/5 shadow-xs flex flex-col gap-1 text-center items-center">
          <span className="text-2xl">🧈</span>
          <span className="font-bold text-xs text-on-surface">100% Desi Ghee</span>
          <span className="text-[10px] text-gray-500">Zero palm oil &amp; soda</span>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-black/5 shadow-xs flex flex-col gap-1 text-center items-center">
          <span className="text-2xl">🌾</span>
          <span className="font-bold text-xs text-on-surface">Chakki Atta</span>
          <span className="text-[10px] text-gray-500">100% whole wheat phulkas</span>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-black/5 shadow-xs flex flex-col gap-1 text-center items-center">
          <span className="text-2xl">🔥</span>
          <span className="font-bold text-xs text-on-surface">Fresh on Tawa</span>
          <span className="text-[10px] text-gray-500">Cooked only after order</span>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-black/5 shadow-xs flex flex-col gap-1 text-center items-center">
          <span className="text-2xl">🍱</span>
          <span className="font-bold text-xs text-on-surface">Sealed Trays</span>
          <span className="text-[10px] text-gray-500">100% spill-proof &amp; warm</span>
        </div>
      </section>

      {/* Daily Delivery Windows (Live from Supabase) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline font-bold text-lg text-on-surface">Daily Delivery Windows</h2>
            <p className="text-xs text-gray-500">Freshly prepared and dispatched in dedicated batches</p>
          </div>
          <span className="text-xs text-primary font-bold">Delhi NCR</span>
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
                className="p-4 rounded-2xl bg-white shadow-xs border border-black/5 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                      {s.mealType} BATCH
                    </span>
                    <h3 className="font-headline font-bold text-sm text-on-surface mt-0.5">{s.label}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                    {s.remainingCapacity} tiffins left
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                  <span className="text-gray-500">Order Cutoff: <strong>{s.cutoffTime}</strong></span>
                  <Link
                    href={`/menu?slot=${s.mealType.toLowerCase()}`}
                    className="font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Reserve</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 rounded-xl bg-white text-xs text-gray-500">
              Kitchen is currently loading today&apos;s meal slots...
            </div>
          )}
        </div>
      </section>

      {/* Featured Thalis & Bowls Showcase with Swiggy/Zomato ADD Button */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline font-bold text-lg text-on-surface">Most Loved Homestyle Meals</h2>
            <p className="text-xs text-gray-500">Cooked fresh daily with pure cow ghee</p>
          </div>
          <Link href="/menu" className="text-xs text-primary font-bold hover:underline flex items-center">
            <span>View All</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {loading ? (
            <>
              <div className="p-4 rounded-xl bg-surface-container-lowest shadow-xs border border-black/5 animate-pulse h-28"></div>
              <div className="p-4 rounded-xl bg-surface-container-lowest shadow-xs border border-black/5 animate-pulse h-28"></div>
            </>
          ) : (
            featuredItems.map((item) => {
              const qty = getItemQuantity(item.id);

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-white shadow-xs border border-black/5 flex items-center justify-between gap-3"
                >
                  <div className="flex flex-col justify-between flex-1 min-w-0 pr-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-3.5 h-3.5 border border-green-600 flex items-center justify-center p-0.5 rounded-xs shrink-0">
                          <span className="w-2 h-2 rounded-full bg-green-600 block"></span>
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          ★ 4.9
                        </span>
                      </div>
                      <h3 className="font-headline font-bold text-sm text-on-surface truncate">{item.name}</h3>
                      <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{item.description || ''}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-sm text-on-surface">
                        ₹{(item.basePricePaise / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Food Photo + Overlapping ADD button */}
                  <div className="relative flex flex-col items-center shrink-0">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 shadow-xs border border-gray-100">
                      <img
                        className="w-full h-full object-cover"
                        src={item.imageUrl || DEFAULT_FOOD_IMAGE}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_FOOD_IMAGE;
                        }}
                        alt={item.name}
                      />
                    </div>
                    <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                      {qty === 0 ? (
                        <button
                          onClick={() => handleAdd(item)}
                          className="px-4 h-7 rounded-lg bg-white border border-primary text-primary font-headline font-bold text-[11px] uppercase tracking-wider shadow-sm hover:bg-orange-50 active:scale-95 transition-all flex items-center justify-center gap-0.5"
                        >
                          <span>ADD</span>
                          <span className="text-xs font-bold">+</span>
                        </button>
                      ) : (
                        <div className="h-7 px-2 rounded-lg bg-primary text-white font-headline font-bold text-[11px] shadow-sm flex items-center justify-between gap-2 min-w-[75px]">
                          <button
                            onClick={() => handleDecrease(item)}
                            className="w-4 h-4 flex items-center justify-center text-xs font-bold hover:bg-white/20 rounded active:scale-90"
                          >
                            −
                          </button>
                          <span className="font-mono text-xs">{qty}</span>
                          <button
                            onClick={() => handleIncrease(item)}
                            className="w-4 h-4 flex items-center justify-center text-xs font-bold hover:bg-white/20 rounded active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Floating Bottom Cart Bar */}
      {totalCount > 0 && (
        <aside aria-label="Cart summary" className="fixed bottom-16 inset-x-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom duration-200">
          <Link
            href="/cart"
            className="w-full h-13 rounded-2xl bg-gradient-to-r from-orange-600 via-primary to-amber-600 text-white px-4 py-3 flex items-center justify-between shadow-xl shadow-orange-950/20 active:scale-98 transition-transform"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center font-bold text-xs">
                {totalCount}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-tight">₹{(totalPricePaise / 100).toFixed(2)}</span>
                <span className="text-[10px] text-white/80">Meals in Tray</span>
              </div>
            </div>
            <div className="flex items-center gap-1 font-bold text-xs">
              <span>View Tray</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
          </Link>
        </aside>
      )}
    </main>
  );
}
