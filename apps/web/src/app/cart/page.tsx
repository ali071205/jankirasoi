'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, DeliverySlot, QuoteResponse, DEFAULT_FOOD_IMAGE, UserProfile } from '../../lib/api';
import { useCart } from '../../context/CartContext';
import CustomerAuthModal from '../../components/CustomerAuthModal';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQty, clearCart, showToast } = useCart();

  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Address & Customer form state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [customerName, setCustomerName] = useState('Rahul Sharma');
  const [customerPhone, setCustomerPhone] = useState('9876543210');
  const [flat, setFlat] = useState('Flat 402, Block C, Malviya Nagar');
  const [street, setStreet] = useState('Outer Ring Road');
  const [landmark, setLandmark] = useState('Near Metro Station');
  const [pincode, setPincode] = useState('110017');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [pinStatusMsg, setPinStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'RAZORPAY'>('COD');
  const [placingOrder, setPlacingOrder] = useState(false);

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

  // Fetch logged in customer and prefill address
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

  useEffect(() => {
    if (items.length > 0 && selectedSlotId) {
      requestQuote();
    }
  }, [items, selectedSlotId, requestQuote]);

  // Verify Delhi Pincode
  const handleCheckPincode = async () => {
    const pin = pincode.trim();
    if (!pin) return;
    try {
      const res = await api.checkPincode(pin);
      if (res.serviceable) {
        setPinStatusMsg({
          text: `✓ Serviceable: ${res.zoneName}`,
          isError: false,
        });
        await requestQuote();
      } else {
        setPinStatusMsg({
          text: res.message || 'Pincode outside delivery area.',
          isError: true,
        });
      }
    } catch (err: any) {
      setPinStatusMsg({
        text: err.message || 'Error checking pincode',
        isError: true,
      });
    }
  };

  // Place Order Handler
  const handlePlaceOrder = async () => {
    if (
      !customerName.trim() ||
      !customerPhone.trim() ||
      !flat.trim() ||
      !street.trim() ||
      !pincode.trim()
    ) {
      showToast('Please fill all required delivery details.', true);
      return;
    }

    if (!quote?.quoteToken) {
      showToast('Calculating live quotation, please retry.', true);
      await requestQuote();
      return;
    }

    setPlacingOrder(true);
    try {
      const orderResult = await api.placeOrder(
        {
          quoteToken: quote.quoteToken,
          paymentMethod,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          deliveryAddress: {
            flat: flat.trim(),
            street: street.trim(),
            landmark: landmark.trim() || undefined,
            pincode: pincode.trim(),
          },
          deliveryNotes: deliveryNotes.trim() || undefined,
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

      // Automatically sync customer profile & address
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
      <main className="flex flex-col items-center justify-center min-h-[70vh] pt-20 pb-28 px-margin">
        <div className="bg-surface-container-lowest p-space-xl rounded-2xl shadow-xs border border-surface-container-high/60 max-w-sm w-full text-center flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-primary-container">
            <span className="material-symbols-outlined text-[36px]">shopping_bag</span>
          </div>
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Your Meal Tray is Empty</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Explore our wholesome, pure vegetarian homestyle lunch and dinner specials.
          </p>
          <Link
            href="/menu"
            className="mt-2 h-10 px-6 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <span>Explore Today's Menu</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </main>
    );
  }

  const itemsTotalPaise = items.reduce((acc, i) => acc + i.pricePaise * i.quantity, 0);
  const finalTotalPaise = quote?.totalPaise ?? itemsTotalPaise + 1500;

  return (
    <main className="flex flex-col relative w-full pt-16 pb-32 bg-[#FFF9F0] min-h-screen">
      <div className="flex flex-col w-full max-w-xl mx-auto px-3 sm:px-4 pb-8">
        {/* 1. Warm Culinary Hero / Delivery Status Banner */}
        <div className="pt-3 pb-1">
          <div className="relative overflow-hidden rounded-2xl bg-[#FFF1DC] p-4 shadow-xs border border-[#E99A32]/30">
            <div className="flex items-start justify-between relative z-10 gap-3">
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-[#38754A] animate-ping"></span>
                  <span className="text-[10px] uppercase tracking-wider text-[#38754A] font-bold">
                    Homestyle Dispatch
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl text-[#292D26] font-bold font-headline">
                  Review Cart &amp; Checkout
                </h1>
                <p className="text-xs text-[#77786F] flex items-center gap-1 mt-0.5 truncate">
                  <span className="material-symbols-outlined text-[16px] text-[#38754A] shrink-0">schedule</span>
                  Delivery window:{' '}
                  <span className="font-semibold text-[#292D26]">
                    {selectedSlot ? `${selectedSlot.startTime} – ${selectedSlot.endTime}` : '1:00 PM – 1:30 PM'}
                  </span>
                </p>
              </div>
              <div className="shrink-0 w-11 h-11 rounded-xl bg-[#FFF1DC] border border-[#E99A32]/40 flex items-center justify-center text-[#E99A32]">
                <span className="material-symbols-outlined text-[24px]">soup_kitchen</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Delivery Slot Selector */}
        <section className="mt-3">
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#EEE7DC]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-label-lg text-label-lg text-on-surface font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">dinner_dining</span>
                Select Meal Time
              </span>
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-bold">
                Today
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {slots.map((s) => {
                const isSelected = selectedSlotId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSlotId(s.id)}
                    className={`relative flex flex-col p-2.5 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-primary-container text-on-primary shadow-xs'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-title-md text-title-md font-semibold">{s.mealType}</span>
                      <span className="material-symbols-outlined text-[18px]">
                        {isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm opacity-90 mt-0.5">
                      {s.startTime} – {s.endTime}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-space-sm flex items-center gap-2 p-2 rounded-lg bg-surface-container-high/60 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">timer</span>
              <p className="font-body-sm text-body-sm leading-tight">
                Lunch preparation in kitchen.{' '}
                <span className="font-semibold text-on-surface">Order locked for fresh batch dispatch.</span>
              </p>
            </div>
          </div>
        </section>

        {/* 3. Items in Cart */}
        <section className="mt-4">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm sm:text-base text-[#292D26] font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[20px] text-[#38754A]">local_mall</span>
              Your Meal Tray ({items.reduce((acc, i) => acc + i.quantity, 0)})
            </h2>
            <Link
              href="/menu"
              className="text-xs text-[#38754A] font-bold hover:underline flex items-center gap-0.5"
            >
              + Add more items
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            {items.map((item, idx) => (
              <article
                key={`${item.productId}-${item.variantId || 'base'}`}
                className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#EEE7DC] flex flex-col gap-2 relative overflow-hidden"
              >
                <div className="flex gap-3">
                  {/* Food Image with veg stamp */}
                  <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-[#FFF9F0] border border-[#EEE7DC]">
                    <img
                      className="w-full h-full object-cover"
                      alt={item.name}
                      src={item.imageUrl || DEFAULT_FOOD_IMAGE}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_FOOD_IMAGE;
                      }}
                    />
                    <span className="absolute top-1 left-1 w-3.5 h-3.5 bg-white rounded-xs flex items-center justify-center p-0.5 shadow-xs border border-[#38754A]">
                      <span className="w-2 h-2 rounded-full bg-[#38754A] block"></span>
                    </span>
                  </div>

                  {/* Title, Variant, Stepper & Price */}
                  <div className="flex flex-col flex-1 min-w-0 justify-between">
                    <div>
                      <h3 className="text-sm sm:text-base text-[#292D26] font-bold truncate">
                        {item.name}
                      </h3>
                      {item.variantName && (
                        <p className="text-xs text-[#77786F] truncate">
                          Portion: {item.variantName}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm sm:text-base font-bold text-[#292D26]">
                        ₹{((item.pricePaise * item.quantity) / 100).toFixed(0)}
                      </span>

                      {/* Stepper */}
                      <div className="flex items-center bg-[#FFF9F0] rounded-full px-2 py-0.5 border border-[#EEE7DC] gap-2">
                        <button
                          onClick={() => updateQty(idx, -1)}
                          className="w-6 h-6 flex items-center justify-center text-[#292D26] font-bold hover:bg-[#EEE7DC] rounded-full transition-colors"
                        >
                          -
                        </button>
                        <span className="font-bold text-xs min-w-[14px] text-center text-[#292D26]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(idx, 1)}
                          className="w-6 h-6 flex items-center justify-center text-[#292D26] font-bold hover:bg-[#EEE7DC] rounded-full transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 4. Delivery Address & Customer Details */}
        <section className="mt-4">
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#EEE7DC] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base text-[#292D26] font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#38754A] text-[20px]">location_on</span>
                Delivery Details
              </span>
              <span className="text-xs text-[#38754A] bg-[#EAF4ED] px-2.5 py-0.5 rounded-full font-bold">South Delhi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-[#77786F] block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#FFF9F0] border border-[#EEE7DC] text-xs text-[#292D26] focus:outline-none focus:border-[#38754A]"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#77786F] block mb-1">
                  Phone (for Delivery OTP &amp; SMS) *
                </label>
                <div className="flex items-center bg-[#FFF9F0] rounded-xl border border-[#EEE7DC] overflow-hidden">
                  <span className="px-2.5 text-xs text-[#77786F] font-bold border-r border-[#EEE7DC]">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-10 px-2.5 bg-transparent text-xs text-[#292D26] focus:outline-none"
                    placeholder="10-digit number"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#77786F] block mb-1">
                House / Flat / Company *
              </label>
              <input
                type="text"
                value={flat}
                onChange={(e) => setFlat(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#FFF9F0] border border-[#EEE7DC] text-xs text-[#292D26] focus:outline-none focus:border-[#38754A]"
                placeholder="e.g. Flat 304, Tower B, Green Apartments"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-[#77786F] block mb-1">
                  Street / Area / Sector *
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#FFF9F0] border border-[#EEE7DC] text-xs text-[#292D26] focus:outline-none focus:border-[#38754A]"
                  placeholder="e.g. Malviya Nagar, Outer Ring Road"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#77786F] block mb-1">
                  Pincode *
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    onBlur={handleCheckPincode}
                    maxLength={6}
                    className="w-full h-10 px-3 rounded-xl bg-[#FFF9F0] border border-[#EEE7DC] text-xs text-[#292D26] focus:outline-none focus:border-[#38754A] font-mono"
                    placeholder="110017"
                  />
                  <button
                    type="button"
                    onClick={handleCheckPincode}
                    className="h-10 px-3 rounded-xl bg-[#FFF1DC] text-[#E99A32] text-xs font-bold hover:bg-[#ffe6c4] shrink-0 transition-colors"
                  >
                    Check
                  </button>
                </div>
              </div>
            </div>

            {pinStatusMsg && (
              <p
                className={`text-xs font-bold ${
                  pinStatusMsg.isError ? 'text-[#C94B45]' : 'text-[#38754A]'
                }`}
              >
                {pinStatusMsg.text}
              </p>
            )}

            <div>
              <label className="text-xs font-semibold text-[#77786F] block mb-1">
                Kitchen / Rider Instructions (Optional)
              </label>
              <input
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-[#FFF9F0] border border-[#EEE7DC] text-xs text-[#292D26] focus:outline-none focus:border-[#38754A]"
                placeholder="e.g. Ring the bell twice, less oil in dal"
              />
            </div>
          </div>
        </section>

        {/* 5. Payment Method Selector */}
        <section className="mt-4">
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#EEE7DC] flex flex-col gap-2.5">
            <h3 className="text-sm sm:text-base text-[#292D26] font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#38754A] text-[20px]">payments</span>
              Payment Method
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('COD')}
                className={`p-3 rounded-xl border flex flex-col gap-0.5 text-left transition-all ${
                  paymentMethod === 'COD'
                    ? 'border-[#38754A] bg-[#EAF4ED] text-[#38754A]'
                    : 'border-[#EEE7DC] bg-[#FFF9F0] text-[#77786F]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs sm:text-sm font-bold text-[#292D26]">Cash on Delivery</span>
                  <span className="material-symbols-outlined text-[18px]">
                    {paymentMethod === 'COD' ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                </div>
                <span className="text-[11px] opacity-80">Pay upon delivery</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('RAZORPAY')}
                className={`p-3 rounded-xl border flex flex-col gap-0.5 text-left transition-all ${
                  paymentMethod === 'RAZORPAY'
                    ? 'border-[#38754A] bg-[#EAF4ED] text-[#38754A]'
                    : 'border-[#EEE7DC] bg-[#FFF9F0] text-[#77786F]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs sm:text-sm font-bold text-[#292D26]">Online / UPI</span>
                  <span className="material-symbols-outlined text-[18px]">
                    {paymentMethod === 'RAZORPAY' ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                </div>
                <span className="text-[11px] opacity-80">GPay, PhonePe, Cards</span>
              </button>
            </div>
          </div>
        </section>

        {/* 6. Bill Details Summary */}
        <section className="mt-4">
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#EEE7DC] flex flex-col gap-2">
            <h3 className="text-sm sm:text-base text-[#292D26] font-bold">Bill Details</h3>

            <div className="flex items-center justify-between text-xs text-[#77786F]">
              <span>Item Total</span>
              <span className="font-semibold text-[#292D26]">
                ₹{(itemsTotalPaise / 100).toFixed(0)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#77786F]">
              <span>Delivery Fee (Within 4km)</span>
              <span className="font-bold text-[#38754A]">FREE</span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#77786F]">
              <span>Spill-Proof Insulated Foil Tray</span>
              <span className="font-semibold text-[#292D26]">₹15</span>
            </div>

            <div className="pt-2 border-t border-[#EEE7DC] flex items-center justify-between text-sm sm:text-base font-bold text-[#292D26]">
              <span>Total Payable</span>
              <span>₹{(finalTotalPaise / 100).toFixed(0)}</span>
            </div>
          </div>
        </section>

        {/* 7. Confirm & Place Order Action Button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={placingOrder || quoteLoading}
            className="w-full h-12 rounded-full bg-[#38754A] hover:bg-[#285C38] text-white font-bold flex items-center justify-between px-6 shadow-md active:scale-98 transition-all disabled:opacity-50"
          >
            <span className="text-xs sm:text-sm">
              {placingOrder ? 'Confirming Order...' : 'Confirm & Place Order'}
            </span>
            <span className="flex items-center gap-1 text-sm sm:text-base font-bold">
              <span>₹{(finalTotalPaise / 100).toFixed(0)}</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}
