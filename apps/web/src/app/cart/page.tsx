'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, DeliverySlot, QuoteResponse, DEFAULT_FOOD_IMAGE, UserProfile } from '../../lib/api';
import { useCart } from '../../context/CartContext';
import CustomerAuthModal from '../../components/CustomerAuthModal';

export default function CartPage() {
  const router = useRouter();
  const { items, addItem, updateQty, clearCart, showToast } = useCart();

  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const quoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Address & Customer form state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'PROFILE' | 'ORDERS' | 'EDIT'>('PROFILE');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [flat, setFlat] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState('110017');
  const [detectedCity, setDetectedCity] = useState<string | null>('New Delhi');
  const [checkingPin, setCheckingPin] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isCutleryNeeded, setIsCutleryNeeded] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [showCookingInput, setShowCookingInput] = useState(false);
  const [pinStatusMsg, setPinStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'RAZORPAY'>('COD');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [riderTab, setRiderTab] = useState<'DELIVERY_TYPE' | 'TIP' | 'INSTRUCTIONS'>('INSTRUCTIONS');
  const [selectedRiderInstructions, setSelectedRiderInstructions] = useState<string[]>([]);
  const [directionsToReach, setDirectionsToReach] = useState('');
  const [showDirectionsInput, setShowDirectionsInput] = useState(false);
  const [tipPaise, setTipPaise] = useState(0);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Fetch Delivery Slots
  useEffect(() => {
    const cached = api.getCachedSlots();
    if (cached?.slots?.length) {
      setSlots(cached.slots);
      setSelectedSlotId(cached.slots[0].id);
    }

    async function fetchSlots() {
      try {
        const data = await api.getSlots(today);
        if (data && data.slots && data.slots.length > 0) {
          setSlots(data.slots);
          setSelectedSlotId((prev) => prev || data.slots[0].id);
        }
      } catch (err) {
        console.error('Failed to load slots', err);
      }
    }
    fetchSlots();
  }, [today]);

  // Fetch logged in customer and prefill address, or prompt auth modal
  useEffect(() => {
    api.getCurrentUser().then((user) => {
      if (user && user.role === 'CUSTOMER') {
        setCurrentUser(user);
        if (user.name) setCustomerName(user.name);
        if (user.phone) setCustomerPhone(user.phone);
        if (user.savedAddress) {
          if (user.savedAddress.flat) setFlat(user.savedAddress.flat);
          if (user.savedAddress.street) setStreet(user.savedAddress.street);
          if (user.savedAddress.landmark) setLandmark(user.savedAddress.landmark);
          if (user.savedAddress.pincode) setPincode(user.savedAddress.pincode);
        }
      } else {
        setCurrentUser(null);
        // Prompt login & delivery address when user navigates to cart without active session
        setAuthModalTab('PROFILE');
        setIsAuthOpen(true);
      }
    });
  }, []);

  // Request Server-Authoritative Quote
  const requestQuote = useCallback(async () => {
    if (items.length === 0 || !selectedSlotId) return;

    setQuoteLoading(true);
    try {
      const q = await api.calculateQuote({
        serviceDate: today,
        deliverySlotId: selectedSlotId,
        pincode: pincode.trim() || '110017',
        items: items.map((i) => {
          let pid = i.productId;
          if (pid === 'spec-full-thali') pid = '09f67dad-2306-49b7-88c7-cae050592f14';
          if (pid === 'spec-home-thali') pid = 'cd02708b-cf9d-460a-878d-3597115602b7';
          if (pid === 'spec-roti-sabzi') pid = 'a1c1e8ff-8f9e-4a82-98f3-876bd6f9e0f3';
          return {
            productId: pid,
            variantId: i.variantId,
            quantity: i.quantity,
            selectedAddonOptionIds: i.selectedAddonOptionIds,
          };
        }),
      });
      setQuote(q);
    } catch (err: any) {
      console.warn('Quotation notice:', err.message);
      showToast(err.message || 'Could not fetch quote for selected items', true);
    } finally {
      setQuoteLoading(false);
    }
  }, [items, selectedSlotId, pincode, today, showToast]);

  const debouncedRequestQuote = useCallback(() => {
    if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    quoteDebounceRef.current = setTimeout(() => {
      requestQuote();
    }, 700);
  }, [requestQuote]);

  useEffect(() => {
    if (items.length > 0 && selectedSlotId) {
      debouncedRequestQuote();
    }
  }, [items, selectedSlotId, debouncedRequestQuote]);

  // Automated Pincode Verification & City Loader
  useEffect(() => {
    const cleanPin = pincode.trim().replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setPinStatusMsg(null);
      setDetectedCity(null);
      return;
    }

    let isMounted = true;
    setCheckingPin(true);

    const timer = setTimeout(async () => {
      try {
        const res = await api.checkPincode(cleanPin);
        if (!isMounted) return;

        if (res.city) {
          setDetectedCity(res.city);
        }

        if (res.serviceable) {
          setPinStatusMsg({
            text: `✓ Serviceable zone: ${res.zoneName || res.city || 'Delhi'} (Delivery Fee: ₹${((res.deliveryFeePaise || 0) / 100).toFixed(0)})`,
            isError: false,
          });
          requestQuote();
        } else {
          setPinStatusMsg({
            text: res.message || (res.city ? `We do not deliver to ${res.city} yet.` : 'Pincode outside delivery area.'),
            isError: true,
          });
        }
      } catch (err: any) {
        if (!isMounted) return;
        setPinStatusMsg({
          text: err.message || 'Error checking pincode',
          isError: true,
        });
      } finally {
        if (isMounted) setCheckingPin(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [pincode, requestQuote]);

  // Place Order Handler
  const handlePlaceOrder = async () => {
    if (!currentUser) {
      setAuthModalTab('PROFILE');
      setIsAuthOpen(true);
      showToast('Please enter your mobile number and address to proceed.', true);
      return;
    }

    if (
      !customerName.trim() ||
      !customerPhone.trim() ||
      !flat.trim() ||
      !street.trim() ||
      !pincode.trim()
    ) {
      setAuthModalTab('PROFILE');
      setIsAuthOpen(true);
      showToast('Please fill all required delivery details.', true);
      return;
    }

    setPlacingOrder(true);
    try {
      let activeQuoteToken = quote?.quoteToken;
      if (!activeQuoteToken) {
        const q = await api.calculateQuote({
          serviceDate: today,
          deliverySlotId: selectedSlotId || slots[0]?.id || 'slot-lunch',
          pincode: pincode.trim() || '110017',
          items: items.map((i) => {
            let pid = i.productId;
            if (pid === 'spec-full-thali') pid = '09f67dad-2306-49b7-88c7-cae050592f14';
            if (pid === 'spec-home-thali') pid = 'cd02708b-cf9d-460a-878d-3597115602b7';
            if (pid === 'spec-roti-sabzi') pid = 'a1c1e8ff-8f9e-4a82-98f3-876bd6f9e0f3';
            return {
              productId: pid,
              variantId: i.variantId,
              quantity: i.quantity,
              selectedAddonOptionIds: i.selectedAddonOptionIds,
            };
          }),
        });
        setQuote(q);
        activeQuoteToken = q.quoteToken;
      }

      const compiledNotes = [
        ...selectedRiderInstructions,
        directionsToReach.trim() ? `Directions: ${directionsToReach.trim()}` : null,
        deliveryNotes.trim(),
      ].filter(Boolean).join(' • ');

      const orderResult = await api.placeOrder(
        {
          quoteToken: activeQuoteToken,
          paymentMethod,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          deliveryAddress: {
            flat: flat.trim(),
            street: street.trim(),
            landmark: landmark.trim() || undefined,
            pincode: pincode.trim(),
          },
          deliveryNotes: compiledNotes || undefined,
        },
        'idem_' + Date.now()
      );

      clearCart();
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('jr_last_tracking_token', orderResult.trackingToken);
          window.localStorage.setItem('jr_last_order_number', orderResult.orderNumber);
          const recents = JSON.parse(window.localStorage.getItem('jr_recent_orders') || '[]');
          recents.unshift({
            orderNumber: orderResult.orderNumber,
            trackingToken: orderResult.trackingToken,
            placedAt: new Date().toISOString(),
          });
          window.localStorage.setItem('jr_recent_orders', JSON.stringify(recents.slice(0, 10)));
        } catch {}
      }

      api
        .loginCustomer(customerPhone.trim(), customerName.trim(), {
          flat: flat.trim(),
          street: street.trim(),
          landmark: landmark.trim() || undefined,
          pincode: pincode.trim(),
        })
        .catch(() => {});

      showToast('Order placed successfully!');
      setTimeout(() => {
        router.push(`/track?token=${orderResult.trackingToken}`);
      }, 800);
    } catch (err: any) {
      setPlacingOrder(false);
      showToast(err.message || 'Failed to place order', true);
    }
  };

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  // If cart is empty
  if (items.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[70vh] pt-20 pb-28 px-4 bg-[#F4F4F6]">
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 max-w-sm w-full text-center flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700">
            <span className="material-symbols-outlined text-[36px]">shopping_bag</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Your Cart is Empty</h2>
          <p className="text-xs text-slate-500">
            Explore fresh homestyle pure veg thalis, combo meals, and tawa rotis.
          </p>
          <Link
            href="/menu"
            className="mt-2 h-10 px-6 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Explore Menu</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </main>
    );
  }

  const itemsTotalPaise = items.reduce((acc, i) => acc + i.pricePaise * i.quantity, 0);
  const finalTotalPaise = (quote?.totalPaise ?? itemsTotalPaise + 1500) + tipPaise;

  const COMPLETE_MEAL_ADDONS = [
    {
      id: 'addon-roti-4',
      name: 'Plain Phulka Roti (4 Pcs)',
      pricePaise: 4000,
      imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&q=80',
    },
    {
      id: 'addon-paratha-plain',
      name: 'Plain Paratha (2 Pcs)',
      pricePaise: 5000,
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
    },
    {
      id: 'addon-boondi-raita',
      name: 'Boondi Raita (Fresh Curd)',
      pricePaise: 3500,
      imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
    },
    {
      id: 'addon-gulab-jamun',
      name: 'Gulab Jamun (2 Pcs)',
      pricePaise: 4500,
      imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&q=80',
    },
    {
      id: 'addon-papad-salad',
      name: 'Roasted Papad & Salad',
      pricePaise: 2000,
      imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&q=80',
    },
  ];

  return (
    <main className="flex flex-col relative w-full pb-36 bg-[#F4F4F6] min-h-screen">
      {/* 1. Top Header Bar with Back Button, Delivery Address, and Profile Action */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-3 sm:px-4 py-2.5 shadow-2xs">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
          {/* Back button & Address */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go Back"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-800 shrink-0 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] sm:text-[22px]">arrow_back</span>
            </button>
            <div
              onClick={() => setIsEditingAddress(!isEditingAddress)}
              className="cursor-pointer flex items-center gap-1.5 min-w-0 hover:opacity-85 transition-opacity"
              title="Click to view or edit delivery address"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[17px]">location_on</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                    {currentUser ? 'Delivering to' : 'Delivery Address'}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-slate-500 shrink-0">
                    {isEditingAddress ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 truncate max-w-[150px] sm:max-w-xs font-medium">
                  {flat ? `${flat}${street ? `, ${street}` : ''} • ${pincode}` : 'Tap to enter address'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Address toggle & Profile / Login button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsEditingAddress(!isEditingAddress)}
              className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200 transition-colors shrink-0"
            >
              {isEditingAddress ? 'Done' : 'Change'}
            </button>

            {/* Profile / Account Button */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  setAuthModalTab('PROFILE');
                  setIsAuthOpen(true);
                }}
                className="flex items-center gap-1.5 py-1 px-2 rounded-full hover:bg-slate-100 border border-slate-200 transition-colors shrink-0"
                title={`${currentUser.name} - View Profile & Orders`}
              >
                <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-bold text-slate-800 max-w-[70px] truncate hidden sm:inline">
                  {currentUser.name ? currentUser.name.split(' ')[0] : 'Profile'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthModalTab('PROFILE');
                  setIsAuthOpen(true);
                }}
                className="flex items-center gap-1 py-1.5 px-3 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">account_circle</span>
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-col w-full max-w-xl mx-auto pb-4">
        {/* 2. Top Savings Callout Banner */}
        <div className="px-3 pt-3">
          <div className="bg-[#E6F8F0] border border-emerald-300/70 rounded-xl px-3.5 py-2.5 flex items-center gap-2 text-[#008848] text-xs font-bold shadow-2xs">
            <span className="text-sm">✨</span>
            <span>₹59.85 saved! Including the applied coupon</span>
          </div>
        </div>

        {/* 3. Restaurant Pill Selector Badge */}
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-orange-500 bg-orange-50/70 text-orange-950 text-xs font-bold shadow-2xs">
              <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px]">✓</span>
              <span>Janki Rasoi</span>
              <span className="text-[11px] font-medium text-slate-700">
                {items.reduce((a, b) => a + b.quantity, 0)} item • ₹{(itemsTotalPaise / 100).toFixed(0)}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-orange-700 font-semibold mt-1.5 flex items-center gap-1 px-1">
            <span className="text-sm font-bold">↪</span> Enjoy your food choices. Order all at once!
          </p>
        </div>

        {/* 4. Restaurant Items Card */}
        <div className="px-3 pt-3">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col gap-3">
            {/* Restaurant Name & Delivery Time */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#8C3B2B] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  JR
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900 leading-tight">Janki Rasoi</h2>
                  <span className="text-[10px] text-emerald-600 font-semibold tracking-wide uppercase">100% Pure Vegetarian</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-700 border-b border-dashed border-slate-400">
                  {selectedSlot ? `${selectedSlot.startTime} – ${selectedSlot.endTime}` : '40-50 mins'}
                </span>
              </div>
            </div>

            {/* Promo Tag */}
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
              TRYNEW eligible items
            </div>

            {/* Items List */}
            <div className="flex flex-col divide-y divide-slate-100">
              {items.map((item, idx) => (
                <div
                  key={`${item.productId}-${item.variantId || 'base'}`}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <span className="w-3.5 h-3.5 rounded-xs border border-emerald-600 flex items-center justify-center p-0.5 mt-0.5 shrink-0 bg-white">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">{item.name}</p>
                      {item.variantName && (
                        <p className="text-[11px] text-slate-500">{item.variantName}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Stepper */}
                    <div className="flex items-center bg-white rounded-lg border border-slate-300 shadow-2xs h-7 px-1">
                      <button
                        type="button"
                        onClick={() => updateQty(idx, -1)}
                        className="w-5 h-5 flex items-center justify-center text-slate-700 font-bold hover:text-emerald-700 text-sm"
                      >
                        -
                      </button>
                      <span className="px-2 font-extrabold text-xs text-emerald-700">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(idx, 1)}
                        className="w-5 h-5 flex items-center justify-center text-slate-700 font-bold hover:text-emerald-700 text-sm"
                      >
                        +
                      </button>
                    </div>

                    {/* Price with strikethrough */}
                    <div className="text-right min-w-[54px]">
                      <span className="text-[10px] text-slate-400 line-through block leading-none">
                        ₹{(((item.pricePaise * item.quantity) / 100) + 40).toFixed(0)}
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                        ₹{((item.pricePaise * item.quantity) / 100).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 3 Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
              <Link
                href="/menu"
                className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
              >
                <span className="text-emerald-700 font-bold text-base leading-none">+</span>
                <span>Add Items</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowCookingInput(!showCookingInput)}
                className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl border text-[11px] font-bold transition-colors ${
                  showCookingInput || deliveryNotes
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>✎</span>
                <span>Cooking requests</span>
              </button>
              <label className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer hover:bg-slate-50 select-none">
                <input
                  type="checkbox"
                  checked={isCutleryNeeded}
                  onChange={(e) => setIsCutleryNeeded(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-600 rounded"
                />
                <span className="truncate">Cutlery Needed</span>
              </label>
            </div>

            {/* Cooking requests inline editor */}
            {showCookingInput && (
              <div className="pt-2">
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Less spicy dal, no onion-garlic, ring bell twice"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-600"
                />
              </div>
            )}
          </div>
        </div>

        {/* 5. Complete Your Meal Addons Horizontal Carousel */}
        <div className="px-3 pt-3">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5">
            <h3 className="text-[11px] uppercase font-extrabold tracking-wider text-slate-500 mb-2.5">
              COMPLETE YOUR MEAL
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {COMPLETE_MEAL_ADDONS.map((addon) => (
                <div key={addon.id} className="w-28 shrink-0 flex flex-col gap-1">
                  <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={addon.imageUrl} alt={addon.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        addItem({
                          productId: addon.id,
                          name: addon.name,
                          pricePaise: addon.pricePaise,
                          quantity: 1,
                          imageUrl: addon.imageUrl,
                        });
                        showToast(`Added ${addon.name}`);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-md bg-white text-emerald-700 font-extrabold text-sm flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform border border-emerald-600"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-2.5 h-2.5 rounded-2xs border border-emerald-600 flex items-center justify-center p-0.5 shrink-0 bg-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    </span>
                    <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{addon.name}</p>
                  </div>
                  <span className="text-xs font-extrabold text-slate-900">
                    ₹{(addon.pricePaise / 100).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 6. Savings Corner */}
        <div className="px-3 pt-3">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                %
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900">Saved ₹29 on Janki Rasoi</p>
                <p className="text-[10px] text-slate-500 font-medium">View all coupons ›</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-emerald-700 text-xs font-extrabold">
              <span>✓ Applied</span>
            </div>
          </div>
        </div>

        {/* 7. Rider Delivery Instructions (Exact 1:1 with Reference Image 2) */}
        <div className="px-3 pt-3">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col gap-2.5">
            {/* Top Tabs */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRiderTab('DELIVERY_TYPE')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  riderTab === 'DELIVERY_TYPE'
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Delivery Type
              </button>
              <button
                type="button"
                onClick={() => setRiderTab('TIP')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  riderTab === 'TIP'
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tip {tipPaise > 0 ? `(₹${tipPaise / 100})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setRiderTab('INSTRUCTIONS')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  riderTab === 'INSTRUCTIONS'
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Instructions
              </button>
            </div>

            {/* Tab 1: Instructions */}
            {riderTab === 'INSTRUCTIONS' && (
              <div className="flex flex-col gap-2 pt-0.5">
                <p className="text-[11px] text-slate-500 font-medium px-0.5">
                  Instructions will be applied on all orders
                </p>

                {/* 4 Cards Row matching Image 2 */}
                <div className="grid grid-cols-4 gap-2">
                  {/* Card 1: Directions to reach */}
                  <div
                    onClick={() => setShowDirectionsInput(!showDirectionsInput)}
                    className={`p-2 sm:p-2.5 rounded-xl border flex flex-col items-center justify-between text-center gap-1.5 cursor-pointer transition-all select-none ${
                      showDirectionsInput || directionsToReach
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-slate-700">mic</span>
                    <span className="text-[10px] leading-tight">Directions to reach</span>
                  </div>

                  {/* Card 2: Leave at the door */}
                  <div
                    onClick={() => {
                      setSelectedRiderInstructions((prev) =>
                        prev.includes('Leave at the door')
                          ? prev.filter((i) => i !== 'Leave at the door')
                          : [...prev, 'Leave at the door']
                      );
                    }}
                    className={`p-2 sm:p-2.5 rounded-xl border flex flex-col items-center justify-between text-center gap-1.5 cursor-pointer transition-all select-none ${
                      selectedRiderInstructions.includes('Leave at the door')
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-slate-700">door_front</span>
                    <span className="text-[10px] leading-tight">Leave at the door</span>
                  </div>

                  {/* Card 3: Avoid calling */}
                  <div
                    onClick={() => {
                      setSelectedRiderInstructions((prev) =>
                        prev.includes('Avoid calling')
                          ? prev.filter((i) => i !== 'Avoid calling')
                          : [...prev, 'Avoid calling']
                      );
                    }}
                    className={`p-2 sm:p-2.5 rounded-xl border flex flex-col items-center justify-between text-center gap-1.5 cursor-pointer transition-all select-none ${
                      selectedRiderInstructions.includes('Avoid calling')
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-slate-700">phone_paused</span>
                    <span className="text-[10px] leading-tight">Avoid calling</span>
                  </div>

                  {/* Card 4: Avoid ringing bell */}
                  <div
                    onClick={() => {
                      setSelectedRiderInstructions((prev) =>
                        prev.includes('Avoid ringing bell')
                          ? prev.filter((i) => i !== 'Avoid ringing bell')
                          : [...prev, 'Avoid ringing bell']
                      );
                    }}
                    className={`p-2 sm:p-2.5 rounded-xl border flex flex-col items-center justify-between text-center gap-1.5 cursor-pointer transition-all select-none ${
                      selectedRiderInstructions.includes('Avoid ringing bell')
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-slate-700">notifications_paused</span>
                    <span className="text-[10px] leading-tight">Avoid ringing bell</span>
                  </div>
                </div>

                {/* Optional Expandable Directions Input */}
                {showDirectionsInput && (
                  <div className="mt-1 pt-1">
                    <input
                      type="text"
                      value={directionsToReach}
                      onChange={(e) => setDirectionsToReach(e.target.value)}
                      placeholder="e.g. 2nd floor, blue door, near yellow overhead water tank"
                      className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Tip */}
            {riderTab === 'TIP' && (
              <div className="flex flex-col gap-2 pt-0.5">
                <p className="text-[11px] text-slate-500 font-medium">
                  Add a tip to thank your delivery partner for their effort:
                </p>
                <div className="flex items-center gap-2">
                  {[0, 2000, 3000, 5000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTipPaise(amount)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        tipPaise === amount
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {amount === 0 ? 'No Tip' : `₹${amount / 100}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Delivery Type */}
            {riderTab === 'DELIVERY_TYPE' && (
              <div className="flex flex-col gap-1.5 pt-0.5">
                <p className="text-[11px] text-slate-500 font-medium">Delivery Mode</p>
                <div className="px-3 py-2 rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  <span>⚡</span>
                  <span>Standard Fresh Dispatch (30-40 mins)</span>
                </div>
              </div>
            )}
          </div>
        </div>



        {/* 8. Address Details Editor (Opens when clicking change) */}
        {isEditingAddress && (
          <div className="px-3 pt-3">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Delivery Address &amp; Contact
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(false)}
                  className="text-xs text-emerald-700 font-bold hover:underline"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                  Flat / House / Floor / Society *
                </label>
                <input
                  type="text"
                  value={flat}
                  onChange={(e) => setFlat(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                    Street / Area
                  </label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {pinStatusMsg && (
                <p
                  className={`text-[11px] p-2 rounded-lg border ${
                    pinStatusMsg.isError
                      ? 'bg-red-50 text-red-700 border-red-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  }`}
                >
                  {pinStatusMsg.text}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 9. Bill Details Breakdown */}
        <div className="px-3 pt-3">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col gap-2">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-500 mb-1">
              Bill Details
            </h3>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Item Total</span>
              <span className="font-semibold text-slate-900">₹{(itemsTotalPaise / 100).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Delivery Partner Fee</span>
              <span className="font-extrabold text-emerald-700">FREE</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Delivery Tip &amp; Platform Fee</span>
              <span className="font-semibold text-slate-900">₹15</span>
            </div>
            {tipPaise > 0 && (
              <div className="flex justify-between text-xs text-emerald-700 font-bold">
                <span>Delivery Partner Tip</span>
                <span>₹{(tipPaise / 100).toFixed(0)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-extrabold text-slate-900">
              <span>To Pay</span>
              <span>₹{(finalTotalPaise / 100).toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 10. Sticky Bottom Payment Bar (1:1 with 3rd Image Reference) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-4 py-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Payment Method Info */}
          <div
            onClick={() => setPaymentMethod(paymentMethod === 'COD' ? 'RAZORPAY' : 'COD')}
            className="flex flex-col cursor-pointer select-none min-w-0"
          >
            <div className="flex items-center gap-1 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[12px] text-slate-600">account_balance_wallet</span>
              <span>PAY USING</span>
              <span className="text-[8px] text-slate-600">▲</span>
            </div>
            <div className="flex items-center gap-1 font-extrabold text-xs sm:text-sm text-slate-900 truncate">
              <span>{paymentMethod === 'COD' ? 'Pay on Delivery (Cash/UPI)' : 'Online UPI / Cards'}</span>
            </div>
            <span className="text-[10px] text-slate-500 truncate leading-none">
              {paymentMethod === 'COD' ? 'Pay cash or ask for QR code' : 'Instant PhonePe, GPay, Cards'}
            </span>
          </div>

          {/* Right: Big Green Pay Button */}
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={placingOrder || quoteLoading}
            className="bg-[#008848] hover:bg-[#00703c] active:scale-98 text-white font-extrabold text-sm sm:text-base px-6 sm:px-8 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            <span>Pay ₹{(finalTotalPaise / 100).toFixed(0)}</span>
            {placingOrder && <span className="animate-spin text-xs">⏳</span>}
          </button>
        </div>
      </div>

      {/* Customer Auth Modal */}
      <CustomerAuthModal
        isOpen={isAuthOpen}
        initialTab={authModalTab}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user: UserProfile) => {
          setCurrentUser(user);
          if (user.name) setCustomerName(user.name);
          if (user.phone) setCustomerPhone(user.phone);
          if (user.savedAddress) {
            if (user.savedAddress.flat) setFlat(user.savedAddress.flat);
            if (user.savedAddress.street) setStreet(user.savedAddress.street);
            if (user.savedAddress.landmark) setLandmark(user.savedAddress.landmark);
            if (user.savedAddress.pincode) setPincode(user.savedAddress.pincode);
          }
          showToast(`Welcome ${user.name || user.phone}!`);
        }}
      />
    </main>
  );
}
