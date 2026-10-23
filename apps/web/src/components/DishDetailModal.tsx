'use client';

import React, { useState, useEffect } from 'react';
import { MenuItem, PortionVariant, DEFAULT_FOOD_IMAGE } from '../lib/api';
import { useCart } from '../context/CartContext';

interface DishDetailModalProps {
  dish: MenuItem | null;
  onClose: () => void;
}

export default function DishDetailModal({ dish, onClose }: DishDetailModalProps) {
  const { items, addItem, updateQty } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<PortionVariant | null>(null);

  // Initialize selected variant when dish opens
  useEffect(() => {
    if (dish && dish.variants && dish.variants.length > 0) {
      const defaultVar = dish.variants.find((v) => v.isDefault) || dish.variants[0];
      setSelectedVariant(defaultVar);
    } else {
      setSelectedVariant(null);
    }
  }, [dish]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!dish) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [dish]);

  if (!dish) return null;

  // Calculate current effective price
  const priceModifier = selectedVariant ? selectedVariant.priceModifierPaise : 0;
  const currentPricePaise = dish.basePricePaise + priceModifier;
  const displayPrice = (currentPricePaise / 100).toFixed(0);

  // Find if current item/variant is in cart
  const cartIndex = items.findIndex(
    (i) => i.productId === dish.id && (!selectedVariant || i.variantId === selectedVariant.id)
  );
  const currentCartItem = cartIndex >= 0 ? items[cartIndex] : null;
  const qty = currentCartItem ? currentCartItem.quantity : 0;

  const handleAdd = () => {
    addItem({
      productId: dish.id,
      name: dish.name,
      pricePaise: currentPricePaise,
      imageUrl: dish.imageUrl || DEFAULT_FOOD_IMAGE,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      quantity: 1,
    });
  };

  const handleIncrease = () => {
    if (cartIndex >= 0) {
      updateQty(cartIndex, 1);
    } else {
      handleAdd();
    }
  };

  const handleDecrease = () => {
    if (cartIndex >= 0) {
      updateQty(cartIndex, -1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Floating Close Button at top (matches reference screenshot) */}
      <div className="w-full max-w-md flex justify-center mb-2 px-4 pointer-events-auto">
        <button
          onClick={onClose}
          type="button"
          aria-label="Close dialog"
          className="w-10 h-10 rounded-full bg-[#2A2E2B]/90 hover:bg-black text-white flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer border border-white/20"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Bottom Sheet Card */}
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-250 border border-[#EEE7DC]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Large Bleed Hero Image */}
        <div className="relative w-full h-64 sm:h-72 bg-[#FFF9F0] shrink-0 overflow-hidden">
          <img
            src={dish.imageUrl || DEFAULT_FOOD_IMAGE}
            alt={dish.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_FOOD_IMAGE;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

          {/* Top Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-sm text-[#38754A] font-bold text-xs shadow-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#38754A] animate-pulse"></span>
              Fresh Batch Ready
            </span>
          </div>
        </div>

        {/* Details & Inclusions Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-3.5 bg-white">
          {/* Veg Mark & Bestseller Tag & Rating */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Green Veg Icon Square */}
            <div className="w-4 h-4 rounded-[3px] bg-white flex items-center justify-center p-0.5 shadow-2xs border border-green-600 shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-600"></span>
            </div>

            <span className="text-xs font-bold text-[#D9381E] flex items-center gap-1 uppercase tracking-wider">
              <span
                className="material-symbols-outlined text-[15px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              Bestseller
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EAF4ED] text-[#38754A] text-xs font-bold">
              ★ 4.9 (50+ ratings)
            </span>
          </div>

          {/* Dish Name, Price & ADD Button Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-[#292D26] leading-tight font-headline">
                {dish.name}
              </h2>
              <div className="text-lg sm:text-xl font-extrabold text-[#292D26] mt-1">
                ₹{displayPrice}
              </div>
            </div>

            {/* Action / Add to Cart Button (matches reference screenshot) */}
            <div className="flex flex-col items-center shrink-0">
              {qty > 0 ? (
                <div className="flex items-center bg-[#38754A] text-white rounded-xl px-3 py-2 shadow-xs gap-3.5 font-bold text-sm min-w-[110px] justify-between">
                  <button
                    onClick={handleDecrease}
                    type="button"
                    aria-label="Decrease quantity"
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 active:scale-90 font-bold text-base cursor-pointer"
                  >
                    -
                  </button>
                  <span className="min-w-[14px] text-center">{qty}</span>
                  <button
                    onClick={handleIncrease}
                    type="button"
                    aria-label="Increase quantity"
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 active:scale-90 font-bold text-base cursor-pointer"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAdd}
                  type="button"
                  className="min-w-[110px] py-2 px-6 rounded-xl border-2 border-[#38754A] bg-white hover:bg-[#EAF4ED] text-[#38754A] font-extrabold text-sm sm:text-base shadow-xs active:scale-95 transition-all text-center cursor-pointer"
                >
                  ADD
                </button>
              )}
              {dish.variants && dish.variants.length > 1 && (
                <span className="text-[11px] text-[#77786F] font-medium mt-1">
                  Customisable
                </span>
              )}
            </div>
          </div>

          {/* Inclusions & Description */}
          <div className="pt-2 border-t border-[#EEE7DC]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#77786F] block mb-1">
              What's in this Thali:
            </span>
            <p className="text-xs sm:text-sm text-[#4A4B44] leading-relaxed">
              {dish.description ||
                'Prepared fresh with pure desi ghee and mild spices. Includes seasonal greens, homestyle daal, fluffy rotis, fragrant rice, salad & pickle.'}
            </p>
          </div>

          {/* Portion / Variant Selector if applicable */}
          {dish.variants && dish.variants.length > 1 && (
            <div className="pt-2 border-t border-[#EEE7DC] flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#77786F]">
                Choose Portion / Variant:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {dish.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
                        isSelected
                          ? 'border-[#38754A] bg-[#EAF4ED] text-[#38754A]'
                          : 'border-[#EEE7DC] bg-[#FFF9F0] text-[#292D26] hover:bg-[#F5EFE6]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{v.name}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-[#38754A]"></span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#77786F]">
                        {v.priceModifierPaise > 0
                          ? `+₹${v.priceModifierPaise / 100}`
                          : 'Base Price'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kitchen Purity & Hygiene Guarantees */}
          <div className="mt-1 pt-3 border-t border-[#EEE7DC] flex items-center justify-between text-[11px] text-[#77786F]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#38754A]">verified</span>
              100% Desi Ghee
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#38754A]">nest_eco_leaf</span>
              Mild Spices
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#38754A]">sanitizer</span>
              Spill-Proof Tray
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
