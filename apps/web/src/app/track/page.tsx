'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, TrackOrderResponse } from '../../lib/api';

const STEP_DEFS = [
  { key: 'PLACED', label: 'Order Received', desc: 'Order received and waiting for kitchen approval' },
  { key: 'ACCEPTED', label: 'Accepted by Kitchen', desc: 'Chef confirmed meal preparation' },
  { key: 'PREPARING', label: 'Fresh on Tawa & Simmering', desc: 'Fresh phulkas & hot dal being packed in tiffins' },
  { key: 'READY_FOR_PICKUP', label: 'Ready for Dispatch', desc: 'Sealed & waiting for rider pickup' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Rider is on the way to your doorstep' },
  { key: 'DELIVERED', label: 'Delivered Fresh', desc: 'Meal handed over and verified via PIN' },
];

function TrackContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [order, setOrder] = useState<TrackOrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!token) {
      setError('No tracking token provided in URL.');
      setLoading(false);
      return;
    }

    try {
      const data = await api.trackOrder(token);
      setOrder(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Could not fetch order tracking info.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  if (loading) {
    return (
      <main className="flex-1 pt-20 pb-20 max-w-2xl mx-auto w-full px-4 flex flex-col gap-4">
        <div className="bg-white rounded-2xl p-8 shadow-xs border border-black/5 animate-pulse flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-200"></div>
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="flex-1 pt-20 pb-20 max-w-2xl mx-auto w-full px-4 flex flex-col gap-4">
        <div className="bg-white rounded-2xl p-8 text-center flex flex-col items-center gap-3 shadow-xs border border-black/5">
          <span className="material-symbols-outlined text-[48px] text-red-500">error</span>
          <h1 className="font-headline font-bold text-xl text-on-surface">Order Not Found</h1>
          <p className="text-xs text-on-surface-variant max-w-sm">{error || 'Please check the link provided.'}</p>
          <Link
            href="/menu"
            className="mt-2 px-6 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-container"
          >
            Go to Menu
          </Link>
        </div>
      </main>
    );
  }

  const currentIdx = STEP_DEFS.findIndex((s) => s.key === order.status);

  let statusHeading = 'Kitchen is Preparing Your Tiffin';
  if (order.status === 'DELIVERED') {
    statusHeading = 'Meal Delivered Fresh!';
  } else if (order.status === 'OUT_FOR_DELIVERY') {
    statusHeading = 'Rider is on the Way!';
  } else if (order.status === 'READY_FOR_PICKUP') {
    statusHeading = 'Packed & Waiting for Rider';
  }

  return (
    <main className="flex-1 pt-20 pb-20 max-w-2xl mx-auto w-full px-4 flex flex-col gap-4">
      {/* Success Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-black/5 flex flex-col items-center text-center relative overflow-hidden">
        <div className="w-14 h-14 rounded-full bg-primary-container text-white flex items-center justify-center shadow-md mb-3">
          <span className="material-symbols-outlined text-[32px]">check_circle</span>
        </div>
        <span className="px-3 py-1 rounded-full bg-green-50 text-primary font-bold text-xs mb-1">
          Ghar Jaisa Swad Assured
        </span>
        <h1 className="font-headline font-bold text-xl text-on-surface">{statusHeading}</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Order <span className="font-bold text-on-surface">{order.orderNumber}</span> • {order.deliverySlot}
        </p>
      </div>

      {/* ZERO-COST IN-APP DELIVERY OTP CARD (Displayed when driver is OUT_FOR_DELIVERY) */}
      {order.status === 'OUT_FOR_DELIVERY' && order.deliveryOtp && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-secondary/40 p-5 shadow-sm text-center flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-secondary font-bold text-xs uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">key</span>
            <span>Delivery Handover PIN</span>
          </div>
          <div className="bg-white px-6 py-2.5 rounded-xl border border-secondary/30 shadow-xs">
            <span className="font-headline font-bold text-3xl tracking-widest text-secondary">
              {order.deliveryOtp}
            </span>
          </div>
          <p className="text-xs text-gray-700 max-w-sm mt-1">
            Please share this <strong>6-digit code</strong> with the delivery rider at your doorstep to receive your meal.
          </p>
        </div>
      )}

      {/* Live Status Stepper */}
      <section className="bg-white rounded-2xl p-5 shadow-xs border border-black/5 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <h2 className="font-headline font-bold text-sm text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[20px]">skillet</span>
            Live Kitchen Timeline
          </h2>
          <span className="text-[11px] text-primary font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> Auto-updating (5s)
          </span>
        </div>

        <div className="flex flex-col gap-4 relative pl-3">
          {STEP_DEFS.map((step, idx) => {
            const isDone = currentIdx >= idx;
            const isCurrent = currentIdx === idx;
            return (
              <div key={step.key} className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    isCurrent
                      ? 'bg-primary text-white ring-4 ring-green-100 animate-pulse'
                      : isDone
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isDone ? (
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  ) : (
                    idx + 1
                  )}
                </div>
                <div className="flex flex-col">
                  <span
                    className={`font-bold text-xs ${
                      isCurrent ? 'text-primary' : isDone ? 'text-on-surface' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">{step.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Order Items Snapshot */}
      <section className="bg-white rounded-2xl p-5 shadow-xs border border-black/5 flex flex-col gap-3">
        <h2 className="font-headline font-bold text-sm text-on-surface">Order Summary</h2>
        <div className="flex flex-col divide-y divide-gray-100 text-xs">
          {order.items.map((i, idx) => (
            <div key={idx} className="py-2 flex justify-between items-center">
              <div>
                <span className="font-bold text-on-surface">
                  {i.quantity}x {i.name}
                </span>
                {i.variant && <span className="text-[10px] text-gray-500 block">{i.variant}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-gray-100 flex justify-between font-bold text-sm text-primary">
          <span>Total Paid / Due</span>
          <span>₹{(order.totalAmountPaise / 100).toFixed(2)}</span>
        </div>
      </section>
    </main>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-xs text-gray-500">
          Loading live tracking console...
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
