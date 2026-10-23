'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api, MenuItem, CatalogResponse, DEFAULT_FOOD_IMAGE } from '../lib/api';
import { useCart } from '../context/CartContext';

export default function HomePage() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const { items, addItem, updateQty, showToast } = useCart();

  useEffect(() => {
    // Safely load cached data after hydration
    const cached = api.getCachedCatalog();
    if (cached?.categories?.length) {
      setCatalog(cached);
      setLoading(false);
    }

    async function loadData() {
      try {
        const catalogData = await api.getCatalog().catch(() => null);
        if (catalogData?.categories?.length) {
          setCatalog(catalogData as CatalogResponse);
        }
      } catch (err) {
        console.error('Failed to load catalog data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
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
    showToast(`Added ${item.name} to plate!`);
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

  // Top specials dynamically resolved to real database products
  const topSpecials = useMemo(() => {
    const list = [
      {
        slug: 'janaki-special-full-thali',
        fallbackId: '09f67dad-2306-49b7-88c7-cae050592f14',
        name: 'Janaki Special Full Thali',
        pricePaise: 18000,
        badge: "Chef's Special",
        tag: 'Wholesome & Hearty',
        desc: '4 Soft Rotis, 1 Paneer Sabzi, 1 Seasonal Sabzi, Dal Tadka, Jeera Rice, Curd & Sweet.',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDS9UZxeQL2XEwyu0K3PCfLt6xcAGFdQTQk0Ms6V2E_dNfemHxFYbIONpeD6RzRRoWWDyO18R_xwGBdtSE7xBHjmyObtY6kkODeMHHLUBjBohji3E4P1D7CsA6o0vz6TtyD5iFo0-ftcqqVkGA5aPZ6gqonSl0tiLeWavjPSF7RoRAjy-R35op1kvBkcA6DHoxU8eSbBL0OcSYbkU4Gi0pIkUstEckNKwAK8RsxyMFSxFnUKcwd2Fok',
      },
      {
        slug: 'regular-home-thali',
        fallbackId: 'cd02708b-cf9d-460a-878d-3597115602b7',
        name: 'Regular Home Thali',
        pricePaise: 13000,
        badge: 'Daily Essential',
        tag: 'Light on Stomach',
        desc: '4 Rotis, Seasonal Veg Sabzi, Dal Fry, Steamed Rice, Pickle & Salad.',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBTHONkUFMlDOhbV8ZAksbZ3MFW81rMV0imOKG7b6sJsRN2StBpZW54kblxWOMQylv1X4vOJzgSkTy4gM3Z1ypQAk3U9TjdYZiZpd2e4RLirD0HL58J8DokQiAG_gm6CX5lrfbRwel5UXuvUoP3AD4f9T_s8Buuq22rghfLWtl-gHYATlEEnfvUW1xXaDUHTd2ri-3nRNvGFfssW_Zka0tU0w_egIYYxQTa--nhGHmHOM0tD0QbDU9C',
      },
      {
        slug: 'roti-sabzi-duo',
        fallbackId: 'a1c1e8ff-8f9e-4a82-98f3-876bd6f9e0f3',
        name: 'Roti & Sabzi Duo',
        pricePaise: 9500,
        badge: 'Quick Bite',
        tag: 'Fresh Tawa Hot',
        desc: '4 Phulkas with spiced, fresh cottage cheese Paneer Bhurji.',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuD7FyfUzzLfU1zFeV9Kj0MuGwv3uOnBcOQnd59q3rdLwp86vcmEMSGNPqMzXfDxESKSt57aby9gMNqThGtOkZzquiH8qAUb7Q4LWqTabE2_IWIAegP4TTTbmASnzNA2PcgQXre_ZQX-PJSiJaIgicviQpj0iPuITd_o1l0YYcymiDaTeFNel4PUpcf2khbY4suRtZ6_PBLoP87PJ02DZFeDKOYWiT7pAPJI2hs4AakxWt8Ry9pUsjMS',
      },
    ];

    return list.map((item) => {
      const match = allDishes.find(
        (d) => d.slug === item.slug || d.name.toLowerCase() === item.name.toLowerCase()
      );
      const defaultVariant = match?.variants?.find((v) => v.isDefault) || match?.variants?.[0];
      return {
        ...item,
        id: match?.id || item.fallbackId,
        variantId: defaultVariant?.id,
        variantName: defaultVariant?.name,
        pricePaise: match ? match.basePricePaise : item.pricePaise,
        image: match?.imageUrl || item.image,
      };
    });
  }, [allDishes]);

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

          {/* Hero Actions & Prominent Explore Button */}
          <div className="p-4 sm:p-5 flex flex-col gap-3 bg-white">
            <p className="text-xs sm:text-sm text-[#77786F] leading-relaxed">
              Freshly prepared meals for your everyday lunch and dinner. Cooked daily with mild spices, pure ghee &amp; zero preservatives.
            </p>
            <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
              {/* Primary button matching user image exactly */}
              <Link
                href="/menu"
                className="h-12 flex-1 rounded-xl bg-[#38754A] hover:bg-[#285C38] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
              >
                <span>Explore today's menu</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
              <Link
                href="/menu?slot=dinner"
                className="h-12 sm:w-52 rounded-xl bg-[#EEE7DC] hover:bg-[#e4ddd1] text-[#292D26] font-semibold text-sm flex items-center justify-center gap-1 active:scale-[0.98] transition-all"
              >
                <span>Explore Dinner</span>
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 3. Meal Slot Selection (Lunch / Dinner Split) */}
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl text-[#292D26] font-bold font-headline">Daily Meals Schedule</h2>
            <Link
              href="/menu"
              className="text-xs sm:text-sm text-[#38754A] font-semibold flex items-center gap-0.5 hover:underline"
            >
              Today's Menu
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. Lunch Card */}
            <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between gap-3.5 border border-[#EEE7DC]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#38754A] text-white text-[11px] uppercase font-bold tracking-wider shrink-0 shadow-xs">
                      Available Now
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#292D26] font-semibold whitespace-nowrap bg-[#FFF9F0] px-2.5 py-0.5 rounded-lg border border-[#EEE7DC]">
                      <span className="material-symbols-outlined text-[15px] text-[#38754A]">schedule</span>
                      12:00 PM – 2:30 PM
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg text-[#292D26] font-bold mt-1">Lunch Meal</h3>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#EAF4ED] border border-[#38754A]/20 flex items-center justify-center text-[#38754A] shrink-0">
                  <span className="material-symbols-outlined text-[24px]">wb_sunny</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#77786F] leading-relaxed">
                Fresh Chapati, Dal Makhani, Aloo Gobi &amp; fragrant Jeera Pulao cooked in pure sunflower oil.
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-[#EEE7DC]/60">
                <div>
                  <span className="text-[11px] text-[#77786F] block">Starts from</span>
                  <span className="text-base font-bold text-[#292D26]">₹130</span>
                </div>
                <Link
                  href="/menu"
                  className="h-10 px-4 rounded-xl bg-[#38754A] hover:bg-[#285C38] text-white text-xs sm:text-sm flex items-center gap-1.5 active:scale-95 transition-transform shadow-xs font-semibold"
                >
                  <span className="material-symbols-outlined text-[18px]">restaurant</span>
                  Order Lunch
                </Link>
              </div>
            </div>

            {/* 2. Dinner Card */}
            <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between gap-3.5 border border-[#EEE7DC]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#E99A32] text-white text-[11px] uppercase font-bold tracking-wider shrink-0 shadow-xs">
                      Pre-order Open
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#292D26] font-semibold whitespace-nowrap bg-[#FFF9F0] px-2.5 py-0.5 rounded-lg border border-[#EEE7DC]">
                      <span className="material-symbols-outlined text-[15px] text-[#E99A32]">schedule</span>
                      7:30 PM – 10:00 PM
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg text-[#292D26] font-bold mt-1">Dinner Meal</h3>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#FFF1DC] border border-[#E99A32]/30 flex items-center justify-center text-[#E99A32] shrink-0">
                  <span className="material-symbols-outlined text-[24px]">nights_stay</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFF1DC] text-[#292D26] text-xs font-medium">
                <span className="material-symbols-outlined text-[16px] text-[#E99A32]">alarm</span>
                Book by 6:30 PM for on-time night delivery
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#EEE7DC]/60">
                <div>
                  <span className="text-[11px] text-[#77786F] block">Starts from</span>
                  <span className="text-base font-bold text-[#292D26]">₹130</span>
                </div>
                <Link
                  href="/menu?slot=dinner"
                  className="h-10 px-4 rounded-xl bg-[#EEE7DC] hover:bg-[#e4ddd1] text-[#292D26] text-xs sm:text-sm flex items-center gap-1 active:scale-95 transition-transform font-semibold"
                >
                  Explore Dinner
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Featured Combos & Today's Specials */}
        <div className="mt-7 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg sm:text-xl text-[#292D26] font-bold font-headline">Today's Specials &amp; Combos</h2>
              <p className="text-xs sm:text-sm text-[#77786F]">Cooked daily with mild spices &amp; zero preservatives</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FFF1DC] text-[#E99A32] shrink-0 uppercase tracking-wide">
              TOP PICKS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {topSpecials.map((spec) => {
              const qty = getItemQuantity(spec.id);
              return (
                <div
                  key={spec.id}
                  className="rounded-2xl bg-white shadow-xs overflow-hidden flex flex-col border border-[#EEE7DC] hover:shadow-md transition-shadow"
                >
                  <div className="relative h-44 w-full bg-[#FFF9F0]">
                    <img
                      className="w-full h-full object-cover"
                      alt={spec.name}
                      src={spec.image}
                    />
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#E99A32] text-white text-[11px] font-bold shadow-xs flex items-center gap-1">
                      <span
                        className="material-symbols-outlined text-[13px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                      {spec.badge}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col gap-2 flex-1 justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded-[2px] bg-white border border-[#EEE7DC] flex items-center justify-center shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#38754A]"></span>
                          </span>
                          <h3 className="text-sm sm:text-base text-[#292D26] font-bold">{spec.name}</h3>
                        </div>
                        <span className="text-sm sm:text-base font-bold text-[#292D26] shrink-0">
                          ₹{(spec.pricePaise / 100).toFixed(0)}
                        </span>
                      </div>
                      <p className="text-xs text-[#77786F] leading-relaxed mt-1">
                        {spec.desc}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#EEE7DC]/60 mt-1">
                      <span className="text-[11px] text-[#38754A] font-semibold flex items-center gap-1 bg-[#EAF4ED] px-2 py-0.5 rounded-md">
                        <span className="material-symbols-outlined text-[13px]">eco</span>
                        {spec.tag}
                      </span>

                      {qty > 0 ? (
                        <div className="flex items-center bg-[#38754A] text-white rounded-full px-2 py-0.5 shadow-xs gap-2">
                          <button
                            onClick={() => handleDecrease(spec.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 active:scale-90 font-bold"
                          >
                            -
                          </button>
                          <span className="font-bold text-xs min-w-[14px] text-center">{qty}</span>
                          <button
                            onClick={() =>
                              handleIncrease({
                                id: spec.id,
                                name: spec.name,
                                pricePaise: spec.pricePaise,
                                imageUrl: spec.image,
                                variantId: spec.variantId,
                                variantName: spec.variantName,
                              })
                            }
                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 active:scale-90 font-bold"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            handleAdd({
                              id: spec.id,
                              name: spec.name,
                              pricePaise: spec.pricePaise,
                              imageUrl: spec.image,
                              variantId: spec.variantId,
                              variantName: spec.variantName,
                            })
                          }
                          className="h-8 px-4 rounded-xl bg-[#38754A] hover:bg-[#285C38] text-white text-xs flex items-center gap-1 active:scale-95 transition-transform shadow-xs font-semibold"
                          type="button"
                        >
                          <span>Add</span>
                          <span className="material-symbols-outlined text-[15px]">add</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dynamic items from API */}
          {allDishes.length > 0 && (
            <div className="mt-5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-[#292D26]">Kitchen Fresh Additions</h3>
                <Link href="/menu" className="text-xs text-[#38754A] font-bold hover:underline">
                  View Full Menu →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {allDishes.slice(0, 4).map((dish) => {
                  const qty = getItemQuantity(dish.id);
                  return (
                    <div
                      key={dish.id}
                      className="rounded-2xl bg-white p-4 shadow-xs flex items-center justify-between gap-3 border border-[#EEE7DC] hover:shadow-xs transition-shadow"
                    >
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded-[2px] bg-white border border-[#EEE7DC] flex items-center justify-center shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#38754A]"></span>
                          </span>
                          <h4 className="text-sm font-bold text-[#292D26] truncate">
                            {dish.name}
                          </h4>
                        </div>
                        <p className="text-xs text-[#77786F] line-clamp-2">
                          {dish.description || 'Prepared fresh in hygienic home kitchen with pure ghee.'}
                        </p>
                        <span className="text-sm font-bold text-[#292D26] mt-1">
                          ₹{(dish.basePricePaise / 100).toFixed(0)}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#FFF9F0] border border-[#EEE7DC]/50 relative">
                          <img
                            className="w-full h-full object-cover"
                            src={dish.imageUrl || DEFAULT_FOOD_IMAGE}
                            alt={dish.name}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = DEFAULT_FOOD_IMAGE;
                            }}
                          />
                        </div>
                        {qty > 0 ? (
                          <div className="flex items-center bg-[#38754A] text-white rounded-full px-2 py-0.5 shadow-xs gap-2">
                            <button
                              onClick={() => handleDecrease(dish.id)}
                              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 active:scale-90 font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="font-bold text-xs min-w-[12px] text-center">{qty}</span>
                            <button
                              onClick={() =>
                                handleIncrease({
                                  id: dish.id,
                                  name: dish.name,
                                  pricePaise: dish.basePricePaise,
                                  imageUrl: dish.imageUrl,
                                })
                              }
                              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 active:scale-90 font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              handleAdd({
                                id: dish.id,
                                name: dish.name,
                                pricePaise: dish.basePricePaise,
                                imageUrl: dish.imageUrl,
                              })
                            }
                            className="h-8 px-4 rounded-xl bg-[#38754A] hover:bg-[#285C38] text-white text-xs flex items-center gap-1 active:scale-95 transition-transform shadow-xs font-semibold"
                            type="button"
                          >
                            <span>Add</span>
                            <span className="material-symbols-outlined text-[14px]">add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 5. Trust Badges Section */}
        <div className="mt-8">
          <div className="rounded-2xl bg-white p-5 flex flex-col gap-4 border border-[#EEE7DC] shadow-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#38754A] text-[22px]">verified</span>
              <h4 className="text-base sm:text-lg text-[#292D26] font-bold font-headline">The Janki Promise</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Pure Veg */}
              <div className="flex items-start gap-3 bg-[#FFF9F0] p-3.5 rounded-xl border border-[#EEE7DC]">
                <div className="w-9 h-9 rounded-lg bg-[#EAF4ED] flex items-center justify-center text-[#38754A] shrink-0">
                  <span className="material-symbols-outlined text-[20px]">spa</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-[#292D26]">100% Pure Vegetarian</span>
                  <span className="text-xs text-[#77786F] mt-0.5 leading-snug">
                    Separate dedicated kitchen space with strict culinary purity.
                  </span>
                </div>
              </div>

              {/* 2. Ghee & Fresh Veggies */}
              <div className="flex items-start gap-3 bg-[#FFF9F0] p-3.5 rounded-xl border border-[#EEE7DC]">
                <div className="w-9 h-9 rounded-lg bg-[#FFF1DC] flex items-center justify-center text-[#E99A32] shrink-0">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    nutrition
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-[#292D26]">Desi Ghee &amp; Farm Veggies</span>
                  <span className="text-xs text-[#77786F] mt-0.5 leading-snug">
                    Procured fresh daily every dawn from local mandis. No stale stock.
                  </span>
                </div>
              </div>

              {/* 3. Clean Packaging */}
              <div className="flex items-start gap-3 bg-[#FFF9F0] p-3.5 rounded-xl border border-[#EEE7DC]">
                <div className="w-9 h-9 rounded-lg bg-[#EAF4ED] flex items-center justify-center text-[#38754A] shrink-0">
                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-[#292D26]">Stainless &amp; Odor-Free</span>
                  <span className="text-xs text-[#77786F] mt-0.5 leading-snug">
                    Food-grade hygienic foil &amp; insulated containers. Zero plastic smell.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Subscription Micro-Teaser */}
        <div className="mt-5 p-5 rounded-2xl bg-[#38754A] text-white flex items-center justify-between gap-3 shadow-md">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#EAF4ED]">
              Save 20% Monthly
            </span>
            <h4 className="text-base sm:text-lg font-bold leading-snug">Subscribe to Daily Tiffin</h4>
            <p className="text-xs text-white/90 mt-0.5">Pause or cancel anytime with 1 tap</p>
          </div>
          <Link
            href="/menu"
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#EAF4ED] text-[#38754A] text-xs font-bold shrink-0 active:scale-95 transition-transform shadow-xs"
          >
            Plans
          </Link>
        </div>
      </div>
    </main>
  );
}
