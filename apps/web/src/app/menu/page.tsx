'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, CatalogResponse } from '../../lib/api';
import { useCart } from '../../context/CartContext';

export default function MenuPage() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, { id: string; name: string; mod: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { addItem, totalCount } = useCart();

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
        setError(err.message || 'Could not connect to kitchen menu.');
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

  const handleAddToCart = (item: any) => {
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

  const filteredCategories = !catalog
    ? []
    : activeCategory === 'all'
    ? catalog.categories
    : catalog.categories.filter((c) => c.id === activeCategory);

  return (
    <main className="flex-1 pt-20 pb-28 max-w-4xl mx-auto w-full px-4 flex flex-col gap-4">
      {/* Notice Bar */}
      <div className="bg-secondary/10 rounded-xl p-3.5 flex items-center gap-2.5">
        <span className="material-symbols-outlined text-secondary text-[22px]">restaurant</span>
        <p className="text-xs sm:text-sm text-on-surface">
          <span className="font-bold text-secondary">Today&apos;s Fresh Batch:</span> Prepared in pure desi ghee and groundnut oil. Homestyle goodness delivered warm.
        </p>
      </div>

      {/* Category Filter Ribbon */}
      <div className="sticky top-16 z-30 bg-surface/95 backdrop-blur-md py-2 overflow-x-auto no-scrollbar flex items-center gap-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
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
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
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
      <div className="flex flex-col gap-4">
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
              <h2 className="font-headline font-bold text-lg text-on-surface border-b border-gray-200 pb-1 mt-2">
                {cat.name}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cat.items.map((item) => {
                  const currentVar = selectedVariants[item.id];
                  const currentPrice = item.basePricePaise + (currentVar ? currentVar.mod : 0);

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-white shadow-xs border border-black/5 overflow-hidden flex flex-col justify-between"
                    >
                      <div className="relative h-44 w-full bg-gray-100">
                        <img
                          className="w-full h-full object-cover"
                          src={
                            item.imageUrl ||
                            'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'
                          }
                          alt={item.name}
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-1">
                          <span className="w-4 h-4 bg-white rounded-xs flex items-center justify-center p-0.5 shadow-sm">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-600"></span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-white/90 text-primary font-bold text-[10px] uppercase shadow-xs">
                            Pure Veg
                          </span>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-headline font-bold text-base text-on-surface">{item.name}</h3>
                            <span className="font-headline font-bold text-base text-primary whitespace-nowrap">
                              ₹{(currentPrice / 100).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                            {item.description || ''}
                          </p>
                        </div>

                        {/* Portion Variant Selector if available */}
                        {item.variants && item.variants.length > 1 && (
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="font-semibold text-gray-700">Portion:</span>
                            <select
                              value={currentVar?.id || ''}
                              onChange={(e) =>
                                handleVariantChange(item.id, e.target.value, item.variants)
                              }
                              className="border border-gray-200 rounded-lg p-1.5 text-xs bg-gray-50 font-medium"
                            >
                              {item.variants.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name}{' '}
                                  {v.priceModifierPaise > 0
                                    ? `(+₹${(v.priceModifierPaise / 100).toFixed(2)})`
                                    : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <button
                          onClick={() => handleAddToCart(item)}
                          className="w-full h-10 rounded-full bg-primary text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs hover:bg-primary-container active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                          <span>Add to Tray</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sticky Bottom Cart Summary */}
      {totalCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 py-3 px-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <span className="text-xs text-on-surface-variant block">
                <span>{totalCount}</span> Items in Tray
              </span>
              <span className="font-bold text-base text-primary">View Order &amp; Checkout</span>
            </div>
            <Link
              href="/cart"
              className="px-6 py-2.5 rounded-full bg-primary text-white font-bold text-sm shadow-sm hover:bg-primary-container flex items-center gap-1.5"
            >
              <span>Proceed</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
