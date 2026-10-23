'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api, CatalogResponse, DEFAULT_FOOD_IMAGE } from '../../lib/api';
import { useCart } from '../../context/CartContext';

export default function MenuPage() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, { id: string; name: string; mod: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { items, addItem, updateQty, totalCount, totalPricePaise } = useCart();

  useEffect(() => {
    // Safely load cached data after hydration
    const cached = api.getCachedCatalog();
    if (cached) {
      setCatalog(cached);
      setLoading(false);
      const cachedVariants: Record<string, { id: string; name: string; mod: number }> = {};
      cached.categories.forEach((cat) => {
        cat.items.forEach((item) => {
          if (item.variants && item.variants.length > 0) {
            const def = item.variants.find((v) => v.isDefault) || item.variants[0];
            cachedVariants[item.id] = {
              id: def.id,
              name: def.name,
              mod: def.priceModifierPaise,
            };
          }
        });
      });
      setSelectedVariants(cachedVariants);
    }

    async function loadCatalog() {
      try {
        const data = await api.getCatalog();
        setCatalog(data);

        // Pre-select default variants
        const defaultVariants: Record<string, { id: string; name: string; mod: number }> = {};
        data.categories.forEach((cat) => {
          cat.items.forEach((item) => {
            if (item.variants && item.variants.length > 0) {
              const def = item.variants.find((v) => v.isDefault) || item.variants[0];
              defaultVariants[item.id] = {
                id: def.id,
                name: def.name,
                mod: def.priceModifierPaise,
              };
            }
          });
        });
        setSelectedVariants(defaultVariants);
      } catch (err: any) {
        if (!catalog) {
          setError(err.message || 'Could not connect to kitchen menu.');
        }
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const handleVariantChange = (productId: string, variantId: string, variants: any[]) => {
    const selected = variants.find((v) => v.id === variantId);
    if (selected) {
      setSelectedVariants((prev) => ({
        ...prev,
        [productId]: {
          id: selected.id,
          name: selected.name,
          mod: selected.priceModifierPaise,
        },
      }));
    }
  };

  const getItemQuantity = (productId: string, variantId?: string) => {
    const cartItem = items.find(
      (i) => i.productId === productId && (!variantId || i.variantId === variantId)
    );
    return cartItem ? cartItem.quantity : 0;
  };

  const handleAdd = (item: any) => {
    const variantInfo = selectedVariants[item.id];
    const finalPrice = item.basePricePaise + (variantInfo ? variantInfo.mod : 0);

    addItem({
      productId: item.id,
      name: item.name,
      pricePaise: finalPrice,
      variantId: variantInfo?.id,
      variantName: variantInfo?.name,
      imageUrl: item.imageUrl,
      quantity: 1,
    });
  };

  const handleIncrease = (item: any) => {
    const variantInfo = selectedVariants[item.id];
    const idx = items.findIndex(
      (i) => i.productId === item.id && (!variantInfo || i.variantId === variantInfo.id)
    );
    if (idx > -1) updateQty(idx, 1);
    else handleAdd(item);
  };

  const handleDecrease = (item: any) => {
    const variantInfo = selectedVariants[item.id];
    const idx = items.findIndex(
      (i) => i.productId === item.id && (!variantInfo || i.variantId === variantInfo.id)
    );
    if (idx > -1) updateQty(idx, -1);
  };

  // Filtered dishes
  const displayedCategories = useMemo(() => {
    if (!catalog?.categories) return [];
    if (activeCategory === 'all') return catalog.categories;
    return catalog.categories.filter((cat) => cat.id === activeCategory);
  }, [catalog, activeCategory]);

  const totalFilteredCount = useMemo(() => {
    return displayedCategories.reduce((acc, cat) => acc + cat.items.length, 0);
  }, [displayedCategories]);

  return (
    <main className="flex flex-col relative w-full pt-16 pb-28 bg-[#FFF9F0] min-h-screen">
      <div className="flex flex-col w-full max-w-4xl mx-auto pb-10">
        {/* 1. Culinary Service Announcement Bar */}
        <div className="px-4 pt-3 pb-1">
          <div className="relative overflow-hidden bg-[#FFF1DC] rounded-2xl p-4 shadow-xs border border-[#E99A32]/30">
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-[#E99A32] flex items-center justify-center shrink-0 shadow-xs text-white">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  skillet
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs uppercase tracking-wider text-[#292D26] font-bold">
                    Lunch Serving Window
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E99A32]"></span>
                  <span className="text-xs text-[#E99A32] font-bold">
                    Ends 12:30 PM
                  </span>
                </div>
                <p className="text-xs text-[#77786F] mt-0.5">
                  Fresh morning batch prepared in cold-pressed groundnut oil &amp; desi ghee. Homestyle purity guaranteed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Weekly Tiffin Schedule Mini-Bar */}
        <div className="px-4 pt-1 pb-2">
          <div className="flex items-center justify-between bg-white rounded-xl px-3.5 py-2 shadow-xs border border-[#EEE7DC]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#38754A] text-[18px]">calendar_today</span>
              <span className="text-xs text-[#292D26] font-semibold">
                Today: Fresh Homestyle Tiffin Menu
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF4ED] text-[#38754A] text-[11px] font-bold flex items-center gap-0.5">
              100% Desi Ghee
            </span>
          </div>
        </div>

        {/* 3. Category Filter Pills (Horizontal Ribbon) */}
        <div className="sticky top-16 z-30 bg-[#FFF9F0]/95 backdrop-blur-md py-2 border-b border-[#EEE7DC]">
          <div className="flex items-center gap-2 overflow-x-auto px-4 no-scrollbar">
            <button
              onClick={() => setActiveCategory('all')}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 ${
                activeCategory === 'all'
                  ? 'bg-[#38754A] text-white font-bold shadow-xs'
                  : 'bg-white text-[#292D26] border border-[#EEE7DC] hover:bg-[#FFF9F0]'
              }`}
              type="button"
            >
              <span
                className="material-symbols-outlined text-[16px]"
                style={activeCategory === 'all' ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                restaurant
              </span>
              All Items
            </button>

            {catalog?.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-[#38754A] text-white font-bold shadow-xs'
                    : 'bg-white text-[#292D26] border border-[#EEE7DC] hover:bg-[#FFF9F0]'
                }`}
                type="button"
              >
                <span>{cat.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
                  {cat.items.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Section Header */}
        <div className="px-margin pt-space-md pb-space-xs flex items-baseline justify-between">
          <div className="flex items-center gap-space-xs">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Curated Ghar Ka Khana</h2>
            <span className="font-label-sm text-label-sm text-primary font-bold px-2 py-0.5 rounded-full bg-primary-fixed/60">
              {totalFilteredCount} Fresh Ready
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Pure Vegetarian</span>
        </div>

        {/* 5. Menu Items Stack */}
        <div className="flex flex-col gap-space-md px-margin pt-space-xs">
          {loading ? (
            <div className="flex flex-col gap-4">
              <div className="h-44 rounded-xl bg-surface-container animate-pulse"></div>
              <div className="h-44 rounded-xl bg-surface-container animate-pulse"></div>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-surface-container-lowest text-center border border-error/20">
              <p className="text-error font-bold text-sm">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold"
              >
                Retry
              </button>
            </div>
          ) : (
            displayedCategories.map((cat) => (
              <div key={cat.id} className="flex flex-col gap-space-sm mb-4">
                <div className="flex items-center gap-2 pt-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">{cat.name}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  {cat.items.map((dish) => {
                    const variantInfo = selectedVariants[dish.id];
                    const currentPrice =
                      dish.basePricePaise + (variantInfo ? variantInfo.mod : 0);
                    const qty = getItemQuantity(dish.id, variantInfo?.id);

                    return (
                      <div
                        key={dish.id}
                        className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-xs flex flex-col justify-between border border-surface-container-high/60 transition-all hover:shadow-sm"
                      >
                        {/* Top Food Image */}
                        <div className="relative w-full h-44 bg-surface-container">
                          <img
                            className="w-full h-full object-cover"
                            alt={dish.name}
                            src={dish.imageUrl || DEFAULT_FOOD_IMAGE}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = DEFAULT_FOOD_IMAGE;
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/60 via-transparent to-transparent"></div>
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold shadow-xs uppercase tracking-wide">
                              Fresh Batch
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface font-label-sm text-label-sm flex items-center gap-1 font-semibold">
                              <span
                                className="material-symbols-outlined text-secondary text-[14px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                star
                              </span>
                              4.9
                            </span>
                          </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-space-md flex flex-col gap-space-xs flex-1 justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-space-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-xs bg-surface-container-lowest flex items-center justify-center p-0.5 shadow-xs border border-green-600">
                                  <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                                </div>
                                <h4 className="font-title-md text-title-md font-bold text-on-surface">
                                  {dish.name}
                                </h4>
                              </div>
                              <span className="font-title-md text-title-md font-bold text-on-surface shrink-0">
                                ₹{(currentPrice / 100).toFixed(0)}
                              </span>
                            </div>

                            <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-1">
                              {dish.description ||
                                'Made with whole wheat, cold-pressed oil and pure desi ghee. Light on the stomach.'}
                            </p>

                            {/* Portion / Variant Selector */}
                            {dish.variants && dish.variants.length > 1 && (
                              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                                {dish.variants.map((v) => (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => handleVariantChange(dish.id, v.id, dish.variants)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                      selectedVariants[dish.id]?.id === v.id
                                        ? 'bg-primary-container text-on-primary shadow-xs'
                                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                                    }`}
                                  >
                                    {v.name}
                                    {v.priceModifierPaise > 0
                                      ? ` (+₹${v.priceModifierPaise / 100})`
                                      : ''}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Price & Action Button */}
                          <div className="flex items-center justify-between pt-3 border-t border-surface-container-high/40 mt-3">
                            <span className="font-label-sm text-label-sm text-primary font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">eco</span>
                              Homestyle Pure
                            </span>

                            {qty > 0 ? (
                              <div className="flex items-center bg-primary-container text-on-primary rounded-full px-2.5 py-1 shadow-xs gap-3">
                                <button
                                  onClick={() => handleDecrease(dish)}
                                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 active:scale-90 font-bold"
                                >
                                  -
                                </button>
                                <span className="font-bold text-xs min-w-[14px] text-center">{qty}</span>
                                <button
                                  onClick={() => handleIncrease(dish)}
                                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 active:scale-90 font-bold"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAdd(dish)}
                                className="h-9 px-5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-1 active:scale-95 transition-transform shadow-xs font-semibold"
                                type="button"
                              >
                                <span>Add</span>
                                <span className="material-symbols-outlined text-[16px]">add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
