'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, CatalogResponse, DEFAULT_FOOD_IMAGE } from '../../lib/api';
import { useCart } from '../../context/CartContext';

export default function MenuPage() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(() => api.getCachedCatalog());
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, { id: string; name: string; mod: number }>>(() => {
    const cached = api.getCachedCatalog();
    if (!cached) return {};
    const defaultVariants: Record<string, { id: string; name: string; mod: number }> = {};
    cached.categories.forEach((cat) => {
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
    return defaultVariants;
  });
  const [loading, setLoading] = useState(() => !api.getCachedCatalog());
  const [error, setError] = useState<string | null>(null);

  const { items, addItem, updateQty, totalCount, totalPricePaise } = useCart();

  useEffect(() => {
    async function loadCatalog() {
      try {
        const data = await api.getCatalog();
        setCatalog(data);

        // Pre-select default portion variants
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
    const cartItem = items.find((i) => i.productId === productId && (!variantId || i.variantId === variantId));
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
    const idx = items.findIndex((i) => i.productId === item.id && (!variantInfo || i.variantId === variantInfo.id));
    if (idx > -1) {
      updateQty(idx, 1);
    } else {
      handleAdd(item);
    }
  };

  const handleDecrease = (item: any) => {
    const variantInfo = selectedVariants[item.id];
    const idx = items.findIndex((i) => i.productId === item.id && (!variantInfo || i.variantId === variantInfo.id));
    if (idx > -1) {
      updateQty(idx, -1);
    }
  };

  const filteredCategories = !catalog
    ? []
    : activeCategory === 'all'
    ? catalog.categories
    : catalog.categories.filter((c) => c.id === activeCategory);

  return (
    <main className="flex-1 pt-20 pb-44 max-w-3xl mx-auto w-full px-4 flex flex-col gap-4">
      {/* Sticky Category Scroller (Swiggy / Zomato Pattern) */}
      <div className="sticky top-16 z-30 bg-surface/95 backdrop-blur-md py-2 overflow-x-auto no-scrollbar flex items-center gap-2 border-b border-gray-100">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
            activeCategory === 'all'
              ? 'bg-primary text-white shadow-xs'
              : 'bg-white text-on-surface-variant border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All Dishes
        </button>
        {catalog?.categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeCategory === cat.id
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white text-on-surface-variant border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Live Menu Items Container */}
      <div className="flex flex-col gap-6">
        {loading ? (
          <>
            <div className="p-6 rounded-2xl bg-white shadow-xs animate-pulse h-40"></div>
            <div className="p-6 rounded-2xl bg-white shadow-xs animate-pulse h-40"></div>
          </>
        ) : error ? (
          <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl">
            <p className="font-bold">Could not connect to kitchen menu.</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div key={cat.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <h2 className="font-headline font-bold text-lg text-on-surface">
                  {cat.name} ({cat.items.length})
                </h2>
                <span className="text-xs text-primary font-semibold">Ghar Ka Khana</span>
              </div>

              {/* Swiggy/Zomato Signature Split Dish Cards */}
              <div className="flex flex-col divide-y divide-gray-100 bg-white rounded-2xl border border-black/5 p-2 shadow-xs">
                {cat.items.map((item) => {
                  const currentVar = selectedVariants[item.id];
                  const currentPrice = item.basePricePaise + (currentVar ? currentVar.mod : 0);
                  const qty = getItemQuantity(item.id, currentVar?.id);

                  return (
                    <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                      {/* Left: Dish Information */}
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-2">
                        {/* Veg Badge & Bestseller */}
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 border border-green-600 rounded-xs flex items-center justify-center p-0.5 bg-white shrink-0">
                            <span className="w-2 h-2 rounded-full bg-green-600 block"></span>
                          </span>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            ★ Bestseller
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">Pure Desi Ghee</span>
                        </div>

                        {/* Dish Name */}
                        <h3 className="font-headline font-bold text-base text-on-surface leading-snug">
                          {item.name}
                        </h3>

                        {/* Price */}
                        <div className="flex items-baseline gap-2">
                          <span className="font-headline font-bold text-sm sm:text-base text-on-surface">
                            ₹{(currentPrice / 100).toFixed(2)}
                          </span>
                        </div>

                        {/* Description */}
                        {item.description && (
                          <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        {/* Portion Variant Selector */}
                        {item.variants && item.variants.length > 1 && (
                          <div className="flex items-center gap-1.5 mt-2 max-w-full">
                            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider shrink-0">Portion:</span>
                            <div className="relative max-w-[150px] sm:max-w-[190px]">
                              <select
                                value={currentVar?.id || ''}
                                onChange={(e) => handleVariantChange(item.id, e.target.value, item.variants)}
                                className="w-full truncate border border-stone-200 rounded-xl pl-2.5 pr-7 py-1 text-[11px] bg-stone-50 font-semibold text-stone-800 focus:outline-hidden focus:border-primary shadow-2xs appearance-none"
                              >
                                {item.variants.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.name} {v.priceModifierPaise > 0 ? `(+₹${(v.priceModifierPaise / 100).toFixed(0)})` : ''}
                                  </option>
                                ))}
                              </select>
                              <span className="material-symbols-outlined text-[14px] text-stone-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                expand_more
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Dish Photo & Overlapping Swiggy-Style ADD Button */}
                      <div className="relative flex flex-col items-center shrink-0">
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-gray-100 shadow-xs border border-gray-100">
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

                        {/* Overlapping ADD + / - QTY + Controller */}
                        <div className="absolute -bottom-2.5 inset-x-0 flex justify-center">
                          {qty === 0 ? (
                            <button
                              onClick={() => handleAdd(item)}
                              className="px-6 h-8 rounded-xl bg-white border-2 border-primary text-primary font-headline font-bold text-xs uppercase tracking-wider shadow-md hover:bg-orange-50 active:scale-95 transition-all flex items-center justify-center gap-1"
                            >
                              <span>ADD</span>
                              <span className="text-sm font-bold">+</span>
                            </button>
                          ) : (
                            <div className="h-8 px-2 rounded-xl bg-primary text-white font-headline font-bold text-xs shadow-md flex items-center justify-between gap-3 min-w-[90px]">
                              <button
                                onClick={() => handleDecrease(item)}
                                className="w-5 h-5 flex items-center justify-center text-sm font-bold hover:bg-white/20 rounded active:scale-90"
                              >
                                −
                              </button>
                              <span className="font-mono text-sm">{qty}</span>
                              <button
                                onClick={() => handleIncrease(item)}
                                className="w-5 h-5 flex items-center justify-center text-sm font-bold hover:bg-white/20 rounded active:scale-90"
                              >
                                +
                              </button>
                            </div>
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
    </main>
  );
}
