'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api, MenuItem, CatalogResponse, TrackOrderResponse, DEFAULT_FOOD_IMAGE } from '../lib/api';
import { useCart } from '../context/CartContext';
import DishDetailModal from '../components/DishDetailModal';
import ActiveOrderBanner from '../components/ActiveOrderBanner';

export default function HomePage() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<'lunch' | 'dinner'>('lunch');
  const [selectedDishModal, setSelectedDishModal] = useState<MenuItem | null>(null);

  const { items, addItem, updateQty } = useCart();

  useEffect(() => {
    // Safely load cached data after hydration
    const cached = api.getCachedCatalog();
    if (cached?.categories?.length) {
      setCatalog(cached);
      setLoading(false);
    }

    async function loadData(force = true) {
      try {
        const catalogData = await api.getCatalog(undefined, force).catch(() => null);
        if (catalogData?.categories?.length) {
          setCatalog(catalogData as CatalogResponse);
        }
      } catch (err) {
        console.error('Failed to load catalog data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData(true);

    // Subscribe to cross-tab updates & focus revalidation
    const unsubscribe = api.subscribeToCatalogUpdates(() => {
      loadData(true);
    });

    const interval = setInterval(() => {
      loadData(true);
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const allDishes = useMemo(() => {
    if (!catalog?.categories) return [];
    return catalog.categories.flatMap((cat) => cat.items);
  }, [catalog]);

  const getItemQuantity = (productId: string) => {
    const cartItem = items.find((i) => i.productId === productId);
    return cartItem ? cartItem.quantity : 0;
  };

  const handleAdd = (item: {
    id: string;
    name: string;
    pricePaise: number;
    imageUrl?: string;
    variantId?: string;
    variantName?: string;
  }) => {
    addItem({
      productId: item.id,
      name: item.name,
      pricePaise: item.pricePaise,
      imageUrl: item.imageUrl,
      variantId: item.variantId,
      variantName: item.variantName,
      quantity: 1,
    });
  };

  const handleIncrease = (item: {
    id: string;
    name: string;
    pricePaise: number;
    imageUrl?: string;
    variantId?: string;
    variantName?: string;
  }) => {
    const idx = items.findIndex((i) => i.productId === item.id);
    if (idx > -1) updateQty(idx, 1);
    else handleAdd(item);
  };

  const handleDecrease = (productId: string) => {
    const idx = items.findIndex((i) => i.productId === productId);
    if (idx > -1) updateQty(idx, -1);
  };

  // Recommended count
  const recommendedCount = allDishes.length;

  return (
    <main className="flex flex-col relative w-full pt-16 pb-28 bg-[#FFF9F0] min-h-screen">
      <div className="flex flex-col w-full max-w-4xl mx-auto px-4 pb-8">
        {/* 1. Delivery Notice Banner */}
        <div className="mt-3 bg-[#FFF1DC] border border-[#E99A32]/30 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="material-symbols-outlined text-[#E99A32] text-[20px] shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
            <p className="text-xs sm:text-sm font-medium text-[#292D26] truncate">
              <span className="font-bold text-[#E99A32]">Free delivery</span> within 4km • Lunch closes 12:30 PM
            </p>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#38754A] text-white shrink-0">
            LIVE
          </span>
        </div>

        {/* 2. Hero Visual & Headline Card */}
        <div className="mt-4 rounded-2xl bg-white border border-[#EEE7DC] overflow-hidden shadow-sm">
          <div className="relative h-60 sm:h-72 w-full">
            <img
              className="w-full h-full object-cover"
              alt="Indian royal vegetarian thali overhead view"
              fetchPriority="high"
              decoding="async"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmNaJ5ALgFMsHGc_5ZSAC4yWBAEsiB_kuk55Pd1H9gFrmgaGDcNyEl7tf2oRF-iskUz0TCTd0EaaujsArEQT0yE1XaYDWkZldDdaZ6ZZk1hH_CzReVsHLDdPMRSTstB8uXB5RagmdAg9paaPnyYuEFONYhWSpAjxa8hH_ZGLxTvoz-QKjPwoSoJ0ZIznftCy3FX_hZl1ThZniWwlAiFwCLgQMR67wwmb8szFdmwZy7ZVkb6QhQMw6H"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>

            {/* Top Badges Overlay */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-xs text-[#38754A] font-bold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#38754A] animate-pulse"></span>
                Fresh Batch Ready
              </span>
            </div>

            {/* Hero Bottom Content */}
            <div className="absolute bottom-4 inset-x-4 text-white">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-4 h-4 rounded-[3px] bg-white flex items-center justify-center p-0.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#38754A]"></span>
                </span>
                <span className="text-[11px] text-[#EAF4ED] tracking-wide uppercase font-bold">
                  Home-Style Vegetarian Kitchen
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight drop-shadow-sm font-headline">
                Ghar Jaisa Khana, Har Din!
              </h1>
            </div>
          </div>

        </div>

        {/* Active Order Tracking Banner (Home-only, hidden when no order) */}
        <ActiveOrderBanner />

        {/* 3. Meal Slot Segmented Pill Filter matching reference UI */}
        <div className="mt-4 flex flex-col gap-2">
          {/* Segmented Capsule Track matching reference UI exactly */}
          <div className="w-full bg-[#EFECE4] p-1 rounded-full flex items-center border border-[#E2DBD0] shadow-2xs">
            {/* Lunch Tab */}
            <button
              type="button"
              onClick={() => setSelectedSlot('lunch')}
              className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-full text-center transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                selectedSlot === 'lunch'
                  ? 'bg-white text-[#E85D04] shadow-xs font-extrabold'
                  : 'text-[#2D312E] hover:text-black font-bold'
              }`}
            >
              <span className="text-[11px] sm:text-xs uppercase tracking-wide truncate">
                LUNCH &bull; 12:00 PM &ndash; 2:30 PM
              </span>
            </button>

            {/* Dinner Tab */}
            <button
              type="button"
              onClick={() => setSelectedSlot('dinner')}
              className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-full text-center transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                selectedSlot === 'dinner'
                  ? 'bg-white text-[#E85D04] shadow-xs font-extrabold'
                  : 'text-[#2D312E] hover:text-black font-bold'
              }`}
            >
              <span className="text-[11px] sm:text-xs uppercase tracking-wide truncate">
                DINNER &bull; 7:30 PM &ndash; 10:00 PM
              </span>
            </button>
          </div>
        </div>

        {/* 4. Swiggy Quick Filter Pills Ribbon */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-600 bg-emerald-50 text-emerald-800 text-xs font-bold shadow-2xs">
            <span className="w-3.5 h-3.5 rounded-2xs border border-emerald-600 flex items-center justify-center p-0.5 bg-white">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            </span>
            <span>Pure Veg</span>
          </div>
          <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-2xs">
            <span className="text-red-500 text-xs">♥</span>
            <span>EatRight</span>
          </div>
          <div className="shrink-0 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-2xs">
            <span>Ratings 4.0+</span>
          </div>
          <div className="shrink-0 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-2xs">
            <span>Bestseller</span>
          </div>
        </div>

        {/* 5. Recommended (Count) Header */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1 cursor-pointer">
            <h2 className="text-base sm:text-lg font-extrabold text-[#292D26] font-headline">
              Recommended ({recommendedCount > 0 ? recommendedCount : '...'})
            </h2>
          </div>
          <Link
            href={`/menu?slot=${selectedSlot}`}
            className="text-xs text-[#38754A] font-bold hover:underline flex items-center gap-0.5"
          >
            <span>View All ({recommendedCount})</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* 6. Food Card Grid (Zero mock data, 100% database items) */}
        {loading && allDishes.length === 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-2.5 sm:p-3 border border-[#EEE7DC] shadow-xs flex flex-col justify-between animate-pulse"
              >
                <div
                  className="w-full rounded-xl bg-[#EFECE4]"
                  style={{ aspectRatio: '1 / 1' }}
                />
                <div className="flex flex-col gap-1.5 mt-2.5">
                  <div className="w-16 h-3 bg-[#EFECE4] rounded" />
                  <div className="w-3/4 h-4 bg-[#EFECE4] rounded mt-1" />
                  <div className="w-1/2 h-3 bg-[#EFECE4] rounded" />
                  <div className="w-full h-7 bg-[#EFECE4] rounded mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
            {allDishes.map((dish) => {
              const qty = getItemQuantity(dish.id);
              return (
                <div
                  key={dish.id}
                  onClick={() => setSelectedDishModal(dish)}
                  className="bg-white rounded-2xl p-2.5 sm:p-3 border border-[#EEE7DC] shadow-xs hover:border-[#38754A]/40 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer select-none"
                >
                  {/* Square Food Image */}
                  <div
                    className="relative w-full rounded-xl overflow-hidden bg-[#FFF9F0] border border-[#EEE7DC]/70 shadow-2xs"
                    style={{ aspectRatio: '1 / 1' }}
                  >
                    <img
                      className={`w-full h-full object-cover group-hover:scale-104 transition-transform duration-300 ${dish.isSoldOut ? 'grayscale contrast-75 opacity-60' : ''}`}
                      style={{ aspectRatio: '1 / 1' }}
                      loading="lazy"
                      decoding="async"
                      src={dish.imageUrl || DEFAULT_FOOD_IMAGE}
                      alt={dish.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_FOOD_IMAGE;
                      }}
                    />
                    {dish.isSoldOut && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-2">
                        <span className="px-2.5 py-1 rounded-full bg-stone-900/90 text-stone-100 text-[10px] font-extrabold uppercase tracking-wider border border-white/20 shadow-sm text-center">
                          Sold Out Today
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content below image */}
                  <div className="flex flex-col gap-1 mt-2.5 flex-1 justify-between">
                    <div>
                      {/* Veg Mark + Bestseller Badge */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="w-3.5 h-3.5 rounded-2xs border border-[#38754A] flex items-center justify-center p-0.5 bg-white shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#38754A]"></span>
                        </span>
                        {dish.isSoldOut ? (
                          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wide">
                            Currently Unavailable
                          </span>
                        ) : (
                          <>
                            <span className="text-[10px] font-bold text-[#E85D04] flex items-center gap-0.5 uppercase tracking-wide">
                              <span className="text-[11px]">&starf;</span> Bestseller
                            </span>
                            <span className="text-[10px] font-bold text-[#38754A] bg-[#EAF4ED] px-1.5 py-0.2 rounded border border-[#38754A]/20">
                              ★ 4.8
                            </span>
                          </>
                        )}
                      </div>

                      {/* Dish Name */}
                      <h3 className="font-bold text-xs sm:text-sm text-[#292D26] line-clamp-2 leading-snug mt-1 h-8 sm:h-9 group-hover:text-[#38754A] transition-colors">
                        {dish.name}
                      </h3>

                      {/* Subtitle / Description */}
                      <p className="text-[11px] text-[#77786F] line-clamp-1 mt-0.5 font-medium">
                        {dish.description || 'Cooked fresh with pure desi ghee • Homestyle'}
                      </p>
                    </div>

                    {/* Price & ADD Button */}
                    <div className="flex items-center justify-between pt-1 mt-auto">
                      <span className="font-extrabold text-xs sm:text-sm text-[#292D26]">
                        ₹{(dish.basePricePaise / 100).toFixed(0)}
                      </span>

                      {dish.isSoldOut ? (
                        <span className="px-3 py-1 rounded-lg bg-stone-100 text-stone-400 font-extrabold text-[11px] border border-stone-200 cursor-not-allowed">
                          SOLD OUT
                        </span>
                      ) : qty > 0 ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center bg-[#38754A] text-white rounded-lg px-2 py-0.5 shadow-xs gap-2 font-bold text-xs"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDecrease(dish.id);
                            }}
                            className="w-5 h-5 flex items-center justify-center hover:bg-black/10 active:scale-90 font-bold"
                          >
                            -
                          </button>
                          <span className="min-w-[12px] text-center font-bold">{qty}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleIncrease({
                                id: dish.id,
                                name: dish.name,
                                pricePaise: dish.basePricePaise,
                                imageUrl: dish.imageUrl,
                              });
                            }}
                            className="w-5 h-5 flex items-center justify-center hover:bg-black/10 active:scale-90 font-bold"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdd({
                              id: dish.id,
                              name: dish.name,
                              pricePaise: dish.basePricePaise,
                              imageUrl: dish.imageUrl,
                            });
                          }}
                          className="px-4 py-1 rounded-lg border border-[#38754A] text-[#38754A] bg-white hover:bg-[#EAF4ED] font-extrabold text-xs shadow-2xs active:scale-95 transition-all cursor-pointer"
                        >
                          ADD
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating ITEMS Quick Menu Button (Matching 2nd Image) */}
        <Link
          href={`/menu?slot=${selectedSlot}`}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-[#1C1C1C] text-white shadow-xl flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform border border-white/20"
        >
          <span className="material-symbols-outlined text-[18px]">menu_book</span>
          <span className="text-[9px] font-extrabold tracking-wider uppercase">ITEMS</span>
        </Link>


      </div>

      {/* Food Item Detail Bottom Sheet / Modal matching reference screenshot */}
      <DishDetailModal
        dish={selectedDishModal}
        onClose={() => setSelectedDishModal(null)}
      />
    </main>
  );
}
