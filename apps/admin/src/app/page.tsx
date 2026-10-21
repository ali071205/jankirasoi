'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { adminApi, AdminOrder, AdminCustomer, AdminRider } from '../lib/api';

// Synthesizer Web Audio API chime (zero external assets, 100% reliable)
function playKitchenOrderChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Audio autoplay restrictions before user gesture
  }
}

export default function KitchenKdsPage() {
  const [mainView, setMainView] = useState<'KDS' | 'CUSTOMERS' | 'RIDERS'>('KDS');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [riders, setRiders] = useState<AdminRider[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [ridersLoading, setRidersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'NEW' | 'COOKING' | 'DISPATCH' | 'DELIVERED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const prevOrdersCountRef = useRef<number>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch Live Orders
  const loadOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await adminApi.getOrders();
      const fetched = data.orders || [];

      // Check if new orders arrived to trigger audio chime
      const newOrdersCount = fetched.filter((o) => o.status === 'PLACED').length;
      if (isSilent && audioEnabled && newOrdersCount > prevOrdersCountRef.current) {
        playKitchenOrderChime();
        showToast('🔔 New Customer Order Arrived!');
      }
      prevOrdersCountRef.current = newOrdersCount;
      setOrders(fetched);
    } catch (err: any) {
      console.warn('Orders fetch note:', err.message);
    } finally {
      setLoading(false);
    }
  }, [audioEnabled]);

  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const data = await adminApi.getCustomers();
      setCustomers(data.customers || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch customers');
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  const loadRiders = useCallback(async () => {
    setRidersLoading(true);
    try {
      const data = await adminApi.getRiders();
      setRiders(data.riders || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch riders');
    } finally {
      setRidersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => loadOrders(true), 5000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  useEffect(() => {
    if (mainView === 'CUSTOMERS') loadCustomers();
    if (mainView === 'RIDERS') loadRiders();
  }, [mainView, loadCustomers, loadRiders]);

  // Handle Order Status Transitions
  const handleTransition = async (orderId: string, nextStatus: string) => {
    setActionLoadingId(orderId);
    try {
      await adminApi.updateOrderStatus(orderId, nextStatus);
      showToast(`Order updated to ${nextStatus}`);
      await loadOrders(true);
    } catch (err: any) {
      showToast(err.message || 'Status transition failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Manual PIN Verification Override
  const handleManualOverride = async (orderId: string) => {
    const reason = window.prompt('Enter verification reason (e.g. Phone confirmation with customer):');
    if (!reason || !reason.trim()) return;

    setActionLoadingId(orderId);
    try {
      await adminApi.overrideDelivery(orderId, reason.trim());
      showToast('Order manually marked DELIVERED');
      await loadOrders(true);
    } catch (err: any) {
      showToast(err.message || 'Override failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Status Metrics
  const newCount = orders.filter((o) => o.status === 'PLACED').length;
  const cookingCount = orders.filter((o) => o.status === 'ACCEPTED' || o.status === 'PREPARING').length;
  const dispatchCount = orders.filter((o) => o.status === 'READY_FOR_PICKUP' || o.status === 'OUT_FOR_DELIVERY').length;
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;
  const totalGmvPaise = orders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? o.totalAmountPaise : 0), 0);

  // Filter Orders
  const filteredOrders = orders.filter((order) => {
    // Search query
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.includes(searchQuery) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Tab filter
    if (activeTab === 'NEW') return order.status === 'PLACED';
    if (activeTab === 'COOKING') return order.status === 'ACCEPTED' || order.status === 'PREPARING';
    if (activeTab === 'DISPATCH') return order.status === 'READY_FOR_PICKUP' || order.status === 'OUT_FOR_DELIVERY';
    if (activeTab === 'DELIVERED') return order.status === 'DELIVERED';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-body selection:bg-orange-500">
      {/* Top Console Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-orange-600 text-white font-bold flex items-center justify-center text-base shadow-lg shadow-orange-950/50">
              JR
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline font-bold text-lg leading-tight tracking-tight">Janki Rasoi Kitchen KDS</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  ISOLATED DEPLOYMENT
                </span>
              </div>
              <p className="text-xs text-slate-400">Delhi NCR Kitchen Station #1 • Live Supabase PostgreSQL</p>
            </div>
          </div>

          {/* Quick Metrics & Chime Control */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Today GMV</span>
              <span className="text-sm font-bold text-emerald-400">₹{(totalGmvPaise / 100).toFixed(2)}</span>
            </div>

            <button
              onClick={() => {
                setAudioEnabled(!audioEnabled);
                if (!audioEnabled) playKitchenOrderChime();
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                audioEnabled
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {audioEnabled ? 'notifications_active' : 'notifications_off'}
              </span>
              <span>{audioEnabled ? 'Chime ON' : 'Muted'}</span>
            </button>

            <button
              onClick={() => loadOrders()}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Navigation Switcher: KDS | Customers | Riders */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 pt-3 border-t border-slate-800/80 mt-3">
          <button
            onClick={() => setMainView('KDS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              mainView === 'KDS'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-950/40'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">skillet</span>
            <span>Kitchen KDS ({orders.length})</span>
          </button>
          <button
            onClick={() => setMainView('CUSTOMERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              mainView === 'CUSTOMERS'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-950/40'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">group</span>
            <span>Customers &amp; Addresses ({customers.length || '•'})</span>
          </button>
          <button
            onClick={() => setMainView('RIDERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              mainView === 'RIDERS'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-950/40'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">two_wheeler</span>
            <span>Riders &amp; Fleet ({riders.length || '•'})</span>
          </button>
        </div>
      </header>

      {/* Main KDS Workspace */}
      {mainView === 'KDS' && (
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6 flex-1">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setActiveTab('NEW')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              activeTab === 'NEW'
                ? 'bg-rose-500/15 border-rose-500/50 shadow-lg shadow-rose-950/30'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-rose-400 font-bold uppercase tracking-wider">New Incoming</span>
              <span className="material-symbols-outlined text-rose-400 text-[20px]">notification_important</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-white flex items-center gap-2">
              {newCount}
              {newCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>}
            </div>
          </div>

          <div
            onClick={() => setActiveTab('COOKING')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              activeTab === 'COOKING'
                ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-950/30'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">Cooking on Tawa</span>
              <span className="material-symbols-outlined text-amber-400 text-[20px]">skillet</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-white">{cookingCount}</div>
          </div>

          <div
            onClick={() => setActiveTab('DISPATCH')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              activeTab === 'DISPATCH'
                ? 'bg-blue-500/15 border-blue-500/50 shadow-lg shadow-blue-950/30'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Ready / With Rider</span>
              <span className="material-symbols-outlined text-blue-400 text-[20px]">two_wheeler</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-white">{dispatchCount}</div>
          </div>

          <div
            onClick={() => setActiveTab('DELIVERED')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              activeTab === 'DELIVERED'
                ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Delivered</span>
              <span className="material-symbols-outlined text-emerald-400 text-[20px]">task_alt</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-white">{deliveredCount}</div>
          </div>
        </div>

        {/* Search & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-2 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'NEW', 'COOKING', 'DISPATCH', 'DELIVERED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab === 'ALL'
                  ? `All Orders (${orders.length})`
                  : tab === 'NEW'
                  ? `New (${newCount})`
                  : tab === 'COOKING'
                  ? `Cooking (${cookingCount})`
                  : tab === 'DISPATCH'
                  ? `Dispatch (${dispatchCount})`
                  : `Delivered (${deliveredCount})`}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search #order, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* KDS Orders Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 bg-slate-900 rounded-2xl border border-slate-800 animate-pulse"></div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-slate-900 rounded-3xl p-12 border border-slate-800 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[48px] text-slate-600">soup_kitchen</span>
            <h3 className="font-bold text-lg text-slate-300">No Orders in this Section</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Live incoming customer orders from Janki Rasoi storefront will display here in real-time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const isPlaced = order.status === 'PLACED';
              const isAccepted = order.status === 'ACCEPTED';
              const isPreparing = order.status === 'PREPARING';
              const isReady = order.status === 'READY_FOR_PICKUP';
              const isOut = order.status === 'OUT_FOR_DELIVERY';
              const isDelivered = order.status === 'DELIVERED';

              const addrStr =
                typeof order.deliveryAddress === 'string'
                  ? order.deliveryAddress
                  : `${order.deliveryAddress?.flat || ''}, ${order.deliveryAddress?.street || ''}, ${
                      order.deliveryAddress?.pincode || ''
                    }`;

              return (
                <div
                  key={order.id}
                  className={`bg-slate-900 rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all shadow-md ${
                    isPlaced
                      ? 'border-rose-500/50 shadow-rose-950/20 ring-1 ring-rose-500/30'
                      : isPreparing
                      ? 'border-amber-500/50'
                      : isReady
                      ? 'border-blue-500/50'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-orange-400 block">
                        #{order.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {order.slotLabel}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isPlaced
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                          : isAccepted
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                          : isPreparing
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : isReady
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : isOut
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Customer Details */}
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                        {order.customerName}
                      </span>
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="text-orange-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">call</span>
                        {order.customerPhone}
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{addrStr}</p>
                  </div>

                  {/* Payment & Amount */}
                  <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 font-medium">
                      {order.paymentMethod === 'COD' ? '💵 Cash On Delivery' : '💳 Prepaid (Razorpay)'}
                    </span>
                    <span className="font-bold text-white">₹{(order.totalAmountPaise / 100).toFixed(2)}</span>
                  </div>

                  {/* KDS Lifecycle Action Buttons */}
                  <div className="pt-1 flex flex-col gap-2">
                    {isPlaced && (
                      <button
                        onClick={() => handleTransition(order.id, 'ACCEPTED')}
                        disabled={actionLoadingId === order.id}
                        className="h-11 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-950/50 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        <span>ACCEPT ORDER</span>
                      </button>
                    )}

                    {isAccepted && (
                      <button
                        onClick={() => handleTransition(order.id, 'PREPARING')}
                        disabled={actionLoadingId === order.id}
                        className="h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/50 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">skillet</span>
                        <span>START PREPARING (ON TAWA)</span>
                      </button>
                    )}

                    {isPreparing && (
                      <button
                        onClick={() => handleTransition(order.id, 'READY_FOR_PICKUP')}
                        disabled={actionLoadingId === order.id}
                        className="h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-950/50 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                        <span>SEALED & READY FOR DISPATCH</span>
                      </button>
                    )}

                    {isReady && (
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center text-xs text-blue-300 font-bold flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">two_wheeler</span>
                        <span>Waiting for Rider Pickup</span>
                      </div>
                    )}

                    {isOut && (
                      <div className="flex flex-col gap-2">
                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center text-xs text-purple-300 font-bold flex items-center justify-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] animate-pulse">navigation</span>
                          <span>Rider On The Way</span>
                        </div>
                        <button
                          onClick={() => handleManualOverride(order.id)}
                          className="h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1 border border-slate-700"
                        >
                          <span className="material-symbols-outlined text-[16px]">verified_user</span>
                          <span>Manual Handover Override</span>
                        </button>
                      </div>
                    )}

                    {isDelivered && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                        <span>Delivered & PIN Verified</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      )}

      {/* Customers Directory Workspace */}
      {mainView === 'CUSTOMERS' && (
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6 flex-1">
          {/* Customers Header & Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold font-headline text-white">Customer Accounts &amp; Saved Data</h2>
              <p className="text-xs text-slate-400">
                Authoritative customer directory with saved delivery addresses, order counts, and total spend.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search by name, phone or address..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full sm:w-80 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
              />
              <button
                onClick={loadCustomers}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                <span>Reload</span>
              </button>
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Contact Phone</th>
                    <th className="py-3.5 px-4">Orders</th>
                    <th className="py-3.5 px-4">Total Spend</th>
                    <th className="py-3.5 px-4">Saved Delivery Address</th>
                    <th className="py-3.5 px-4">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {customers
                    .filter((c) => {
                      if (!customerSearch) return true;
                      const q = customerSearch.toLowerCase();
                      const addr = typeof c.savedAddress === 'object' ? JSON.stringify(c.savedAddress) : c.savedAddress || '';
                      return (
                        c.name.toLowerCase().includes(q) ||
                        c.phone.includes(q) ||
                        addr.toLowerCase().includes(q)
                      );
                    })
                    .map((c, idx) => (
                      <tr key={c.id || idx} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                          <span>{c.name}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">+91 {c.phone}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[11px]">
                            {c.orderCount} orders
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-emerald-400">
                          ₹{(c.totalSpendPaise / 100).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 max-w-xs text-slate-300 truncate">
                          {c.savedAddress ? (
                            typeof c.savedAddress === 'object' ? (
                              <span>
                                {c.savedAddress.flat}, {c.savedAddress.street} ({c.savedAddress.pincode})
                              </span>
                            ) : (
                              <span>{c.savedAddress}</span>
                            )
                          ) : (
                            <span className="text-slate-500 italic">No address on file</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(c.lastOrderDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        {customersLoading ? 'Loading customers directory...' : 'No customers found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* Riders Fleet Workspace */}
      {mainView === 'RIDERS' && (
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-headline text-white">Delivery Riders &amp; Fleet</h2>
              <p className="text-xs text-slate-400">
                Manage delivery fleet personnel, vehicle registration, and shift availability.
              </p>
            </div>
            <button
              onClick={loadRiders}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              <span>Reload</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Rider</th>
                    <th className="py-3.5 px-4">Mobile Number</th>
                    <th className="py-3.5 px-4">Vehicle Number</th>
                    <th className="py-3.5 px-4">Shift Duty Status</th>
                    <th className="py-3.5 px-4">Account Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {riders.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-orange-600/20 text-orange-400 flex items-center justify-center text-xs font-bold shrink-0">
                          🛵
                        </span>
                        <span>{r.name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">+91 {r.phone}</td>
                      <td className="py-3 px-4 font-mono text-orange-400 font-semibold">{r.vehicleNumber}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1.5 w-fit ${
                          r.isAvailable
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${r.isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                          {r.isAvailable ? 'ON DUTY' : 'OFFLINE'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold text-[10px]">
                          {r.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {riders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        {ridersLoading ? 'Loading riders fleet...' : 'No riders registered.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* Floating Action Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-orange-600 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom duration-200">
          <span className="material-symbols-outlined text-[20px]">info</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
