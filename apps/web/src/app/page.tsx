'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api, DeliverySlot, MenuItem, CatalogResponse, DEFAULT_FOOD_IMAGE } from '../lib/api';
import { useCart } from '../context/CartContext';

export default function HomePage() {
  const [activeMealType, setActiveMealType] = useState<'LUNCH' | 'DINNER'>('LUNCH');
  const [currentSlide, setCurrentSlide] = useState(0);

  const [slots, setSlots] = useState<DeliverySlot[]>(() => {
    return api.getCachedSlots()?.slots || [];
  });
  const [catalog, setCatalog] = useState<CatalogResponse | null>(() => api.getCachedCatalog());
  const [loading, setLoading] = useState(() => {
    const cachedSlots = api.getCachedSlots()?.slots?.length;
    const cachedCat = api.getCachedCatalog()?.categories?.length;
    return !(cachedSlots && cachedCat);
  });

  const { items, addItem, updateQty } = useCart();

  useEffect(() => {
    async function loadData() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [slotsData, catalogData] = await Promise.all([
          api.getSlots(today).catch(() => null),
          api.getCatalog().catch(() => null),
        ]);

        if (slotsData?.slots?.length) {
          setSlots(slotsData.slots);
        }

        if (catalogData?.categories?.length) {
          setCatalog(catalogData as CatalogResponse);
        }
      } catch (err) {
        console.error('Failed to load home page live data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Banner Slides for the Rectangle Slider
  const slides = useMemo(
    () => [
      {
        id: 1,
        tag: 'Pure Cow Desi Ghee',
        title: 'Ghar Ka Khana, Har Din!',
        subtitle: 'Authentic homestyle North Indian meals made fresh on tawa. Zero palm oil.',
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
        badge: 'Special Lunch & Dinner Batches',
      },
      {
        id: 2,
        tag: 'Fresh Chakki Atta',
        title: 'Tawa Phulkas & Dal Tadka',
        subtitle: 'Piping hot whole-wheat rotis cooked only after your order is confirmed.',
        image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1000&q=80',
        badge: '100% Homestyle Veg',
      },
      {
        id: 3,
        tag: 'Spill-Proof Warm Trays',
        title: 'Delivered Fresh To Your Door',
        subtitle: 'Dedicated batch dispatch across South & Central Delhi.',
        image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1000&q=80',
        badge: 'Free Delivery > ₹299',
      },
    ],
    []
  );

  // Auto-slide banner every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Current slot details based on toggle
  const activeSlot = useMemo(() => {
    return slots.find((s) => s.mealType.toUpperCase() === activeMealType) || null;
  }, [slots, activeMealType]);

  // Flattened all catalog items
  const allDishes = useMemo(() => {
    if (!catalog?.categories) return [];
    return catalog.categories.flatMap((cat) => cat.items);
  }, [catalog]);

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
    <main className="flex-1 pt-20 pb-32 max-w-4xl mx-auto w-full px-4 flex flex-col gap-4">
      {/* 1. SLIDING MENU RECTANGLE BANNER */}
      <div className="relative rounded-3xl overflow-hidden shadow-sm border border-stone-200/80 bg-stone-900 h-52 sm:h-64">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_FOOD_IMAGE;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
            
            {/* Top Pill */}
            <div className="absolute top-3.5 left-3.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-xs text-primary font-bold shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                {slide.badge}
              </span>
            </div>

            {/* Bottom Content */}
            <div className="absolute bottom-4 inset-x-4 text-white">
              <span className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold block mb-1">
                {slide.tag}
              </span>
              <h2 className="font-headline text-xl sm:text-2xl font-bold leading-tight">
                {slide.title}
              </h2>
              <p className="text-xs sm:text-sm text-stone-200 mt-1 line-clamp-2 max-w-md">
                {slide.subtitle}
              </p>
            </div>
          </div>
        ))}

        {/* Carousel Slider Indicators */}
        <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 4. DISHES CARDS (STREAMLINED HOMESTYLE MENU FEED) */}
      <section className="flex flex-col gap-3 mt-1">
        <div className="flex items-center justify-between">
          <h2 className="font-headline font-bold text-lg text-on-surface">
            Today’s Specials
          </h2>
          <Link href="/menu" className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5">
            <span>Explore All</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>

        {/* Dishes Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {loading ? (
            <>
              <div className="p-4 rounded-2xl bg-white shadow-xs border border-stone-200/80 animate-pulse h-32"></div>
              <div className="p-4 rounded-2xl bg-white shadow-xs border border-stone-200/80 animate-pulse h-32"></div>
            </>
          ) : allDishes.length > 0 ? (
            allDishes.map((dish) => {
              const qty = getItemQuantity(dish.id);

              return (
                <div
                  key={dish.id}
                  className="p-3.5 rounded-2xl bg-white shadow-xs border border-stone-200/80 flex items-center justify-between gap-3 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex flex-col justify-between flex-1 min-w-0 pr-2">
                    <div>
                      {/* Veg Icon & Rating */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-3.5 h-3.5 border border-green-600 flex items-center justify-center p-0.5 rounded-xs shrink-0">
                          <span className="w-2 h-2 rounded-full bg-green-600 block"></span>
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          ★ 4.9
                        </span>
                      </div>
                      <h3 className="font-headline font-bold text-sm text-on-surface truncate">{dish.name}</h3>
                      <p className="text-xs text-stone-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {dish.description || 'Cooked fresh on order with pure cow desi ghee and premium whole wheat.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="font-bold text-sm text-stone-900">
                        ₹{(dish.basePricePaise / 100).toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Food Photo + Overlapping ADD button */}
                  <div className="relative flex flex-col items-center shrink-0">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-stone-100 shadow-xs border border-stone-100">
                      <img
                        className="w-full h-full object-cover"
                        src={dish.imageUrl || DEFAULT_FOOD_IMAGE}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_FOOD_IMAGE;
                        }}
                        alt={dish.name}
                      />
                    </div>
                    
                    <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                      {qty === 0 ? (
                        <button
                          onClick={() => handleAdd(dish)}
                          className="px-4 h-7 rounded-lg bg-white border border-primary text-primary font-headline font-bold text-[11px] uppercase tracking-wider shadow-sm hover:bg-emerald-50 active:scale-95 transition-all flex items-center justify-center gap-0.5"
                        >
                          <span>ADD</span>
                          <span className="text-xs font-bold">+</span>
                        </button>
                      ) : (
                        <div className="h-7 px-2 rounded-lg bg-primary text-white font-headline font-bold text-[11px] shadow-sm flex items-center justify-between gap-2 min-w-[75px]">
                          <button
                            onClick={() => handleDecrease(dish)}
                            className="w-4 h-4 flex items-center justify-center text-xs font-bold hover:bg-white/20 rounded active:scale-90"
                          >
                            −
                          </button>
                          <span className="font-mono text-xs">{qty}</span>
                          <button
                            onClick={() => handleIncrease(dish)}
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
          ) : (
            <div className="col-span-2 p-6 rounded-2xl bg-white text-center text-xs text-stone-500 border border-stone-200/80">
              Loading fresh homestyle kitchen dishes...
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
