'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api, RiderDelivery, UserProfile } from '../../lib/api';

export default function RiderPage() {
  const [deliveries, setDeliveries] = useState<RiderDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');

  // Rider Auth State
  const [riderUser, setRiderUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginPhone, setLoginPhone] = useState('9811223344');
  const [loginPassword, setLoginPassword] = useState('RiderPassword123!');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Keypad & PIN Verification State
  const [selectedOrder, setSelectedOrder] = useState<RiderDelivery | null>(null);
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Initial Auth Check
  useEffect(() => {
    async function checkRiderAuth() {
      try {
        const user = await api.getCurrentUser();
        if (user && user.role === 'RIDER') {
          setRiderUser(user);
        } else {
          const cached = typeof window !== 'undefined' ? localStorage.getItem('jr_rider_profile') : null;
          if (cached) {
            try { setRiderUser(JSON.parse(cached)); } catch {}
          }
        }
      } finally {
        setAuthChecking(false);
      }
    }
    checkRiderAuth();
  }, []);

  const handleRiderLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await api.loginRider(loginPhone.trim(), loginPassword.trim());
      setRiderUser(res.user);
      loadDeliveries();
    } catch (err: any) {
      setLoginError(err.message || 'Invalid rider phone or password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRiderLogout = async () => {
    await api.logout();
    setRiderUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jr_rider_token');
      localStorage.removeItem('jr_rider_profile');
    }
  };

  // Fetch Assigned Deliveries
  // FIX #15: Accept an AbortSignal so in-flight fetches can be cancelled on unmount
  // or when the interval fires before the previous request completes.
  const loadDeliveries = useCallback(async (isBackground = false, signal?: AbortSignal) => {
    if (!isBackground) setLoading(true);
    setIsRefreshing(true);
    try {
      const data = await api.getRiderDeliveries(signal);
      // Guard against setting state after abort/unmount
      if (signal?.aborted) return;
      if (data && data.deliveries) {
        setDeliveries(data.deliveries);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return; // expected on cleanup — suppress
      console.warn('Rider deliveries fetch notice:', err.message);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (riderUser) {
      // FIX #15: Use an AbortController so that when the component unmounts or
      // a new interval tick fires, any in-flight fetch is cleanly cancelled.
      const controller = new AbortController();
      loadDeliveries(false, controller.signal);

      const interval = setInterval(() => {
        const tickController = new AbortController();
        loadDeliveries(true, tickController.signal);
      }, 10000);

      return () => {
        controller.abort();
        clearInterval(interval);
      };
    } else {
      setLoading(false);
    }
  }, [loadDeliveries, riderUser]);

  // Handle Mark Out For Delivery
  const handleStartTrip = async (orderId: string) => {
    setActionLoadingId(orderId);
    try {
      await api.markRiderOutForDelivery(orderId);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100]);
      }
      await loadDeliveries(true);
    } catch (err: any) {
      alert(err.message || 'Failed to start delivery trip.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open PIN Modal
  const openPinModal = (delivery: RiderDelivery) => {
    setSelectedOrder(delivery);
    setPinDigits([]);
    setPinError(null);
    setVerifySuccess(false);
  };

  // Close PIN Modal
  const closePinModal = () => {
    setSelectedOrder(null);
    setPinDigits([]);
    setPinError(null);
    setVerifySuccess(false);
  };

  // Keypad Digit Click
  const handleKeypadPress = (digit: string) => {
    if (isVerifying || verifySuccess) return;
    if (pinDigits.length < 6) {
      const updated = [...pinDigits, digit];
      setPinDigits(updated);
      setPinError(null);

      // Auto-submit on 6th digit
      if (updated.length === 6) {
        submitPinVerification(updated.join(''));
      }
    }
  };

  // Keypad Backspace
  const handleBackspace = () => {
    if (isVerifying || verifySuccess) return;
    setPinDigits((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  // Submit PIN Verification
  const submitPinVerification = async (pinCode: string) => {
    if (!selectedOrder) return;
    setIsVerifying(true);
    setPinError(null);

    try {
      await api.verifyRiderDeliveryOtp(selectedOrder.orderId, pinCode);
      setVerifySuccess(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 150]);
      }
      setTimeout(async () => {
        closePinModal();
        await loadDeliveries(true);
      }, 1500);
    } catch (err: any) {
      setPinError(err.message || 'Incorrect PIN. Ask customer for the 6-digit code on their live screen.');
      setPinDigits([]);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([300]);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const activeDeliveries = deliveries.filter((d) => d.status !== 'DELIVERED');
  const completedDeliveries = deliveries.filter((d) => d.status === 'DELIVERED');
  const displayList = activeTab === 'ACTIVE' ? activeDeliveries : completedDeliveries;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-body pb-12 selection:bg-orange-500">
      {/* Top Rider Header */}
      <header className="sticky top-0 z-30 bg-slate-800/95 backdrop-blur-md border-b border-slate-700 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
              JR
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-headline font-bold text-base leading-tight">Janki Rasoi Rider</h1>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {riderUser
                  ? `${riderUser.name} • ${riderUser.riderProfile?.vehicleNumber || 'DL-01-AB-1234'}`
                  : 'Rider Authentication Portal'}
              </p>
            </div>
          </div>

          {riderUser ? (
            <div className="flex items-center gap-2">
              {/* Duty Status Toggle */}
              <button
                onClick={() => setIsOnDuty(!isOnDuty)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                  isOnDuty
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                {isOnDuty ? 'ON DUTY' : 'OFFLINE'}
              </button>

              {/* Quick Refresh */}
              <button
                onClick={() => loadDeliveries()}
                disabled={isRefreshing}
                aria-label="Refresh deliveries"
                className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all"
              >
                <span className={`material-symbols-outlined text-[18px] ${isRefreshing ? 'animate-spin' : ''}`}>
                  refresh
                </span>
              </button>

              {/* End Shift / Sign out */}
              <button
                onClick={handleRiderLogout}
                title="End Shift / Logout"
                className="w-8 h-8 rounded-full bg-slate-700/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          ) : (
            <Link
              href="/"
              className="text-xs text-orange-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Storefront</span>
              <span>→</span>
            </Link>
          )}
        </div>
      </header>

      {/* Unauthenticated State: Show Clean Rider Login Screen */}
      {!riderUser && !authChecking ? (
        <main className="flex-1 max-w-md mx-auto w-full px-4 py-8 flex flex-col justify-center">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-orange-600/20 border border-orange-500/40 text-orange-400 flex items-center justify-center mx-auto text-3xl">
                🛵
              </div>
              <h2 className="font-headline font-bold text-xl text-white">Rider Shift Sign-in</h2>
              <p className="text-xs text-slate-400">
                Enter your registered rider mobile number and credentials to access delivery assignments.
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium">
                {loginError}
              </div>
            )}

            <form onSubmit={handleRiderLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Rider Phone Number
                </label>
                <input
                  type="tel"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="9811223344"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Shift Password / PIN
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Start Delivery Shift</span>
                    <span>→</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginPhone('9811223344');
                  setLoginPassword('RiderPassword123!');
                }}
                className="w-full py-2 bg-slate-700/50 hover:bg-slate-700 text-xs text-slate-300 font-semibold rounded-xl border border-slate-600 transition-colors"
              >
                ⚡ 1-Tap Fill Demo Rider (Amit Sharma)
              </button>
            </form>
          </div>
        </main>
      ) : (
        <>
          {/* Rider Notice / PWA Banner */}
          <div className="max-w-md mx-auto w-full px-4 pt-3">
            <div className="bg-gradient-to-r from-orange-600/30 via-slate-800 to-slate-800 border border-orange-500/30 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-400 text-[20px]">smartphone</span>
                <span className="text-slate-200">
                  <strong className="text-orange-300">Fast Handover:</strong> Enter customer PIN upon arrival.
                </span>
              </div>
              <Link href="/" className="text-orange-400 font-semibold hover:underline text-[11px] shrink-0">
                Storefront
              </Link>
            </div>
          </div>

      {/* Tabs: Active vs Completed */}
      <div className="max-w-md mx-auto w-full px-4 pt-3">
        <div className="grid grid-cols-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ACTIVE' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Active Trips</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
              {activeDeliveries.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'COMPLETED' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Completed</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
              {completedDeliveries.length}
            </span>
          </button>
        </div>
      </div>

      {/* Deliveries Feed */}
      <main className="max-w-md mx-auto w-full px-4 pt-3 flex flex-col gap-3 flex-1">
        {loading && deliveries.length === 0 ? (
          <div className="flex flex-col gap-3 pt-4">
            <div className="h-44 bg-slate-800 rounded-2xl animate-pulse"></div>
            <div className="h-44 bg-slate-800 rounded-2xl animate-pulse"></div>
          </div>
        ) : displayList.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 text-center flex flex-col items-center gap-3 my-6">
            <div className="w-14 h-14 rounded-full bg-slate-700/60 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-[32px]">two_wheeler</span>
            </div>
            <h2 className="font-bold text-base text-slate-200">
              {activeTab === 'ACTIVE' ? 'No Active Delivery Trips' : 'No Completed Trips Today'}
            </h2>
            <p className="text-xs text-slate-400 max-w-xs">
              {activeTab === 'ACTIVE'
                ? 'When kitchen marks orders Ready for Dispatch, they will appear here automatically.'
                : 'Delivered orders will be logged in this tab after PIN verification.'}
            </p>
            {activeTab === 'ACTIVE' && (
              <button
                onClick={() => loadDeliveries()}
                className="mt-2 px-4 py-2 rounded-full bg-orange-600 hover:bg-orange-500 font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">sync</span>
                Check for New Batches
              </button>
            )}
          </div>
        ) : (
          displayList.map((del) => {
            const isOutOfDelivery = del.status === 'OUT_FOR_DELIVERY';
            const isReady = del.status === 'READY_FOR_PICKUP';
            const isDelivered = del.status === 'DELIVERED';

            return (
              <div
                key={del.orderId}
                className="bg-slate-800 rounded-2xl border border-slate-700/80 shadow-md p-4 flex flex-col gap-3 transition-all"
              >
                {/* Order Header */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-700 pb-2.5">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-orange-400 block">
                      #{del.orderNumber}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">{del.slotLabel}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isDelivered
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isOutOfDelivery
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {isDelivered
                      ? 'DELIVERED'
                      : isOutOfDelivery
                      ? 'ON THE WAY'
                      : 'READY AT KITCHEN'}
                  </span>
                </div>

                {/* Items Summary & Payment */}
                <div className="flex items-center justify-between text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/40">
                  <div className="truncate pr-2">
                    <span className="text-slate-400 block text-[10px]">Meals:</span>
                    <span className="font-semibold text-slate-200 truncate block">{del.itemsSummary}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-slate-400 block text-[10px]">Payment:</span>
                    {del.cashDuePaise > 0 ? (
                      <span className="font-bold text-amber-400 text-xs">
                        COD: Collect ₹{(del.cashDuePaise / 100).toFixed(2)}
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-400 text-xs">PAID ONLINE</span>
                    )}
                  </div>
                </div>

                {/* Customer Details & Address */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-slate-400 text-[18px]">person</span>
                      {del.customerName}
                    </h3>
                    <a
                      href={`tel:${del.customerPhone}`}
                      className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[16px]">call</span>
                      Call
                    </a>
                  </div>
                  <div className="text-xs text-slate-300 flex items-start gap-1.5 bg-slate-900/40 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-orange-400 text-[18px] shrink-0 mt-0.5">
                      location_on
                    </span>
                    <div>
                      <p className="leading-snug">{del.deliveryAddress}</p>
                      {del.landmark && (
                        <p className="text-[11px] text-orange-300 mt-0.5">Landmark: {del.landmark}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {!isDelivered && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Google Maps GPS Navigation Intent */}
                    <a
                      href={del.navigationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-11 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs flex items-center justify-center gap-1.5 text-white active:scale-95 transition-transform shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">near_me</span>
                      <span>Google Maps</span>
                    </a>

                    {/* Step Transitions */}
                    {isReady ? (
                      <button
                        onClick={() => handleStartTrip(del.orderId)}
                        disabled={actionLoadingId === del.orderId}
                        className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs flex items-center justify-center gap-1.5 text-white active:scale-95 transition-transform shadow-sm"
                      >
                        {actionLoadingId === del.orderId ? (
                          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[18px]">two_wheeler</span>
                            <span>Start Ride</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => openPinModal(del)}
                        className="h-11 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 font-bold text-xs flex items-center justify-center gap-1.5 text-white active:scale-95 transition-all shadow-md"
                      >
                        <span className="material-symbols-outlined text-[18px]">dialpad</span>
                        <span>Verify PIN</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* 6-DIGIT CUSTOMER PIN KEYPAD MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div>
                <h3 className="font-headline font-bold text-base text-white">Enter Customer PIN</h3>
                <p className="text-xs text-slate-400">Order #{selectedOrder.orderNumber}</p>
              </div>
              <button
                onClick={closePinModal}
                disabled={isVerifying}
                className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Instruction */}
            <p className="text-xs text-slate-300 text-center px-2">
              Ask customer for the <strong className="text-orange-400">6-digit handover PIN</strong> displayed on their
              tracking screen.
            </p>

            {/* 6 PIN Display Boxes */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const hasVal = pinDigits[idx] !== undefined;
                return (
                  <div
                    key={idx}
                    className={`w-11 h-13 rounded-xl flex items-center justify-center text-xl font-mono font-bold transition-all ${
                      verifySuccess
                        ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300'
                        : hasVal
                        ? 'bg-slate-700 border-2 border-orange-500 text-white shadow-sm'
                        : 'bg-slate-900 border border-slate-700 text-slate-500'
                    }`}
                  >
                    {verifySuccess ? (
                      <span className="material-symbols-outlined text-emerald-400 text-[20px]">check</span>
                    ) : hasVal ? (
                      pinDigits[idx]
                    ) : (
                      '•'
                    )}
                  </div>
                );
              })}
            </div>

            {/* Error or Success feedback */}
            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs text-center flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{pinError}</span>
              </div>
            )}
            {verifySuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center flex items-center justify-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-[20px]">verified</span>
                <span>PIN Verified! Meal Delivered Fresh.</span>
              </div>
            )}

            {/* Numeric Touch Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleKeypadPress(digit)}
                  disabled={isVerifying || verifySuccess}
                  className="h-14 rounded-2xl bg-slate-700/80 hover:bg-slate-700 active:bg-orange-600 text-xl font-bold font-mono text-white flex items-center justify-center shadow-sm active:scale-95 transition-all"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={() => setPinDigits([])}
                disabled={isVerifying || verifySuccess || pinDigits.length === 0}
                className="h-14 rounded-2xl bg-slate-900 text-xs font-bold text-slate-400 flex items-center justify-center active:scale-95 transition-all"
              >
                Clear
              </button>
              <button
                onClick={() => handleKeypadPress('0')}
                disabled={isVerifying || verifySuccess}
                className="h-14 rounded-2xl bg-slate-700/80 hover:bg-slate-700 active:bg-orange-600 text-xl font-bold font-mono text-white flex items-center justify-center shadow-sm active:scale-95 transition-all"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                disabled={isVerifying || verifySuccess || pinDigits.length === 0}
                className="h-14 rounded-2xl bg-slate-900 text-slate-300 flex items-center justify-center active:scale-95 transition-all"
                aria-label="Backspace"
              >
                <span className="material-symbols-outlined text-[22px]">backspace</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
