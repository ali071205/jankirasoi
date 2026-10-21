'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, DeliverySlot, QuoteResponse } from '../../lib/api';
import { useCart } from '../../context/CartContext';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQty, clearCart, showToast } = useCart();

  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Address & Customer form state
  const [customerName, setCustomerName] = useState('Rahul Sharma');
  const [customerPhone, setCustomerPhone] = useState('9876543210');
  const [flat, setFlat] = useState('Flat 402, Block C, Malviya Nagar');
  const [street, setStreet] = useState('Outer Ring Road');
  const [landmark, setLandmark] = useState('Near Metro Station');
  const [pincode, setPincode] = useState('110017');
  const [pinStatusMsg, setPinStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'RAZORPAY'>('COD');
  const [placingOrder, setPlacingOrder] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Fetch Delivery Slots
  useEffect(() => {
    async function fetchSlots() {
      try {
        const data = await api.getSlots(today);
        if (data && data.slots && data.slots.length > 0) {
          setSlots(data.slots);
          setSelectedSlotId(data.slots[0].id);
        }
      } catch (err) {
        console.error('Failed to load slots', err);
      }
    }
    fetchSlots();
  }, [today]);

  // Request Server-Authoritative Quote
  const requestQuote = useCallback(async () => {
    if (items.length === 0 || !selectedSlotId) return;

    setQuoteLoading(true);
    try {
      const q = await api.calculateQuote({
        serviceDate: today,
        deliverySlotId: selectedSlotId,
        pincode: pincode.trim() || '110017',
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          selectedAddonOptionIds: i.selectedAddonOptionIds,
        })),
      });
      setQuote(q);
    } catch (err: any) {
      console.warn('Quotation notice:', err.message);
    } finally {
      setQuoteLoading(false);
    }
  }, [items, selectedSlotId, pincode, today]);

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
          text: `✓ Serviceable zone: ${res.zoneName} (Fee: ₹${((res.deliveryFeePaise || 0) / 100).toFixed(2)})`,
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
    if (!customerName.trim() || !customerPhone.trim() || !flat.trim() || !street.trim() || !pincode.trim()) {
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
        },
        'idem_' + Date.now()
      );

      clearCart();
      showToast('Order placed successfully!');
      setTimeout(() => {
        router.push(`/track?token=${orderResult.trackingToken}`);
      }, 800);
    } catch (err: any) {
      setPlacingOrder(false);
      showToast(err.message || 'Failed to place order', true);
    }
  };

  if (items.length === 0) {
    return (
      <main className="flex-1 pt-20 pb-28 max-w-3xl mx-auto w-full px-4 flex flex-col gap-4">
        <div className="p-10 rounded-2xl bg-white text-center flex flex-col items-center gap-3 shadow-xs border border-black/5 mt-4">
          <span className="material-symbols-outlined text-[48px] text-gray-300">shopping_bag</span>
          <h2 className="font-headline font-bold text-lg text-on-surface">Your Meal Tray is Empty</h2>
          <p className="text-xs text-on-surface-variant max-w-xs">
            Explore our freshly prepared homestyle North Indian thalis and add your favorite dishes.
          </p>
          <Link
            href="/menu"
            className="mt-2 px-6 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-container"
          >
            Explore Today&apos;s Menu
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 pt-20 pb-28 max-w-3xl mx-auto w-full px-4 flex flex-col gap-4">
      {/* 1. Delivery Slot Picker */}
      <section className="bg-white rounded-2xl p-4 shadow-xs border border-black/5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-headline font-bold text-sm text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[20px]">schedule</span> Select Meal Window
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Today</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {slots.length === 0 ? (
            <>
              <div className="p-3 bg-gray-50 rounded-xl animate-pulse h-14"></div>
              <div className="p-3 bg-gray-50 rounded-xl animate-pulse h-14"></div>
            </>
          ) : (
            slots.map((s) => {
              const isSelected = selectedSlotId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSlotId(s.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs">{s.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded">
                      {s.remainingCapacity} left
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-0.5">Cutoff: {s.cutoffTime}</span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* 2. Cart Items Stack */}
      <section className="bg-white rounded-2xl p-4 shadow-xs border border-black/5 flex flex-col gap-3">
        <h2 className="font-headline font-bold text-sm text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[20px]">lunch_dining</span>
          Items in Your Tray
        </h2>
        <div className="flex flex-col divide-y divide-gray-100">
          {items.map((item, index) => (
            <div key={`${item.productId}-${item.variantId || 'base'}`} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
                  src={
                    item.imageUrl ||
                    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=200&q=80'
                  }
                  alt={item.name}
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs text-on-surface truncate">{item.name}</span>
                  {item.variantName && (
                    <span className="text-[10px] text-gray-500">{item.variantName}</span>
                  )}
                  <span className="text-xs font-semibold text-primary mt-0.5">
                    ₹{(item.pricePaise / 100).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 bg-surface-container px-2 py-1 rounded-full">
                <button
                  onClick={() => updateQty(index, -1)}
                  className="w-6 h-6 flex items-center justify-center text-xs font-bold text-on-surface-variant hover:text-red-600"
                >
                  &minus;
                </button>
                <span className="text-xs font-bold px-1">{item.quantity}</span>
                <button
                  onClick={() => updateQty(index, 1)}
                  className="w-6 h-6 flex items-center justify-center text-xs font-bold text-on-surface-variant hover:text-green-700"
                >
                  &plus;
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Delivery Details Form */}
      <section className="bg-white rounded-2xl p-4 shadow-xs border border-black/5 flex flex-col gap-3">
        <h2 className="font-headline font-bold text-sm text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
          Delivery Address &amp; Contact
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="font-semibold text-gray-700 block mb-1">Your Full Name *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Rohan Sharma"
              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-gray-50 focus:bg-white focus:outline-primary"
            />
          </div>
          <div>
            <label className="font-semibold text-gray-700 block mb-1">10-Digit Mobile Number *</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-gray-50 focus:bg-white focus:outline-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="font-semibold text-gray-700 block mb-1">Flat / House Number / Tower *</label>
            <input
              type="text"
              value={flat}
              onChange={(e) => setFlat(e.target.value)}
              placeholder="Flat 402, Sunshine Residency"
              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-gray-50 focus:bg-white focus:outline-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="font-semibold text-gray-700 block mb-1">Street / Locality / Sector *</label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Outer Ring Road, Malviya Nagar"
              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-gray-50 focus:bg-white focus:outline-primary"
            />
          </div>
          <div>
            <label className="font-semibold text-gray-700 block mb-1">Landmark (Optional)</label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Near Main Market Metro"
              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-gray-50 focus:bg-white focus:outline-primary"
            />
          </div>
          <div>
            <label className="font-semibold text-gray-700 block mb-1">PIN Code (Delhi) *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="110017"
                maxLength={6}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-gray-50 font-bold focus:bg-white focus:outline-primary"
              />
              <button
                type="button"
                onClick={handleCheckPincode}
                className="px-3 py-2 bg-surface-container hover:bg-surface-container-high rounded-lg text-xs font-semibold whitespace-nowrap"
              >
                Verify
              </button>
            </div>
            {pinStatusMsg && (
              <span
                className={`text-[11px] mt-1 block ${
                  pinStatusMsg.isError ? 'text-red-600' : 'text-green-700 font-semibold'
                }`}
              >
                {pinStatusMsg.text}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 4. Payment Method */}
      <section className="bg-white rounded-2xl p-4 shadow-xs border border-black/5 flex flex-col gap-3">
        <h2 className="font-headline font-bold text-sm text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
          Payment Method
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <label
            onClick={() => setPaymentMethod('COD')}
            className={`p-3 border-2 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
              paymentMethod === 'COD'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="payment-method"
                value="COD"
                checked={paymentMethod === 'COD'}
                onChange={() => setPaymentMethod('COD')}
                className="accent-primary"
              />
              <div className="flex flex-col">
                <span className="font-bold text-xs">Cash on Delivery</span>
                <span className="text-[10px] text-on-surface-variant">Pay cash at doorstep</span>
              </div>
            </div>
          </label>
          <label
            onClick={() => setPaymentMethod('RAZORPAY')}
            className={`p-3 border-2 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
              paymentMethod === 'RAZORPAY'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="payment-method"
                value="RAZORPAY"
                checked={paymentMethod === 'RAZORPAY'}
                onChange={() => setPaymentMethod('RAZORPAY')}
                className="accent-primary"
              />
              <div className="flex flex-col">
                <span className="font-bold text-xs">Online Payment</span>
                <span className="text-[10px] text-on-surface-variant">UPI / Cards (Razorpay)</span>
              </div>
            </div>
          </label>
        </div>
      </section>

      {/* 5. Bill Summary (Authoritative from Server) */}
      <section className="bg-white rounded-2xl p-4 shadow-xs border border-black/5 flex flex-col gap-2.5 text-xs">
        <div className="flex items-center justify-between">
          <h2 className="font-headline font-bold text-sm text-on-surface mb-1">Bill Summary</h2>
          {quoteLoading && (
            <span className="text-[10px] text-primary animate-pulse flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] animate-spin">refresh</span> Updating...
            </span>
          )}
        </div>
        <div className="flex justify-between text-on-surface-variant">
          <span>Items Subtotal</span>
          <span className="font-semibold text-on-surface">
            ₹{quote ? (quote.subtotalPaise / 100).toFixed(2) : '0.00'}
          </span>
        </div>
        <div className="flex justify-between text-on-surface-variant">
          <span>Packaging &amp; Eco-Box</span>
          <span className="font-semibold text-on-surface">
            ₹{quote ? (quote.packagingFeePaise / 100).toFixed(2) : '15.00'}
          </span>
        </div>
        <div className="flex justify-between text-on-surface-variant">
          <span>Delivery Fee</span>
          <span className="font-semibold text-on-surface">
            {quote ? (quote.deliveryFeePaise === 0 ? 'FREE' : `₹${(quote.deliveryFeePaise / 100).toFixed(2)}`) : '₹30.00'}
          </span>
        </div>
        <div className="flex justify-between text-on-surface-variant">
          <span>Govt Taxes (5% GST)</span>
          <span className="font-semibold text-on-surface">
            ₹{quote ? (quote.taxPaise / 100).toFixed(2) : '0.00'}
          </span>
        </div>
        <div className="flex justify-between text-sm font-bold text-primary pt-2 border-t border-gray-100">
          <span>To Pay</span>
          <span className="text-base text-primary">
            {quote ? quote.formattedTotal : '₹0.00'}
          </span>
        </div>
      </section>

      {/* Action Button */}
      <button
        onClick={handlePlaceOrder}
        disabled={placingOrder || !quote}
        className="w-full h-12 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-primary-container active:scale-95 transition-all disabled:opacity-50"
      >
        {placingOrder ? (
          <>
            <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
            <span>Placing Order...</span>
          </>
        ) : (
          <>
            <span>Place Order ({paymentMethod})</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </>
        )}
      </button>
    </main>
  );
}
