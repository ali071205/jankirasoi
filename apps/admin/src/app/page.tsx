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
    // Audio autoplay restrictions
  }
}

function formatOrderDate(isoString?: string) {
  if (!isoString) return '21 Oct, 07:30 PM';
  try {
    const d = new Date(isoString);
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day} ${month}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  } catch {
    return '21 Oct, 07:30 PM';
  }
}

function getInitials(name?: string) {
  if (!name) return 'C';
  return name.trim().charAt(0).toUpperCase();
}

function formatAddress(addr: any): string {
  if (!addr) return 'Flat 402, Malviya Nagar, New Delhi';
  if (typeof addr === 'string') return addr;
  const parts = [addr.flat, addr.street, addr.landmark, addr.pincode].filter(Boolean);
  return parts.join(', ') || 'Flat 402, Malviya Nagar, New Delhi';
}

export default function OperationsConsolePage() {
  // Navigation Module View matching target reference image
  const [mainView, setMainView] = useState<'ORDERS' | 'CUSTOMERS' | 'RIDERS' | 'MENU' | 'REPORTS' | 'SETTINGS'>('ORDERS');

  // KDS Orders State
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'NEW' | 'PREPARING' | 'READY' | 'DISPATCH' | 'DELIVERED' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected Order for Right Details Panel
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'DETAILS' | 'CUSTOMER' | 'TIMELINE'>('DETAILS');

  // Rider assignment modal state
  const [showRiderModal, setShowRiderModal] = useState(false);

  // Customers & Riders State
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [riders, setRiders] = useState<AdminRider[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [ridersLoading, setRidersLoading] = useState(false);

  // Catalog & Inventory (86-ing) State
  const [catalogCategories, setCatalogCategories] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [soldOutItemIds, setSoldOutItemIds] = useState<Set<string>>(new Set());

  // Delivery Slots State (Unified in Menu View)
  const [slotsData, setSlotsData] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Add New Thali / Dish State
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishCategory, setNewDishCategory] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('');
  const [newDishDescription, setNewDishDescription] = useState('');
  const [newDishImageUrl, setNewDishImageUrl] = useState('');
  const [isSubmittingDish, setIsSubmittingDish] = useState(false);

  const prevOrdersCountRef = useRef<number>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch Live Orders
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

      // Default select first order if none selected
      setSelectedOrderId((prev) => (prev && fetched.some((o) => o.id === prev) ? prev : fetched[0]?.id || null));
    } catch (err: any) {
      console.warn('Orders fetch note:', err.message);
    } finally {
      setLoading(false);
    }
  }, [audioEnabled]);

  // 2. Fetch Customers
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

  // 3. Fetch Riders
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

  // 4. Fetch Catalog (for Menu 86-ing)
  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const data = await adminApi.getCatalog();
      const cats = data.categories || [];
      setCatalogCategories(cats);
      const soldOuts = new Set<string>();
      cats.forEach((c: any) => {
        c.items?.forEach((i: any) => {
          if (i.isSoldOut) soldOuts.add(i.id);
        });
      });
      setSoldOutItemIds(soldOuts);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch catalog');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  // 5. Fetch Delivery Slots
  const loadSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const data = await adminApi.getDeliverySlots();
      setSlotsData(data.slots || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch delivery slots');
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    loadRiders();
    loadSlots();
    const interval = setInterval(() => loadOrders(true), 5000);
    return () => clearInterval(interval);
  }, [loadOrders, loadRiders, loadSlots]);

  useEffect(() => {
    if (mainView === 'CUSTOMERS') loadCustomers();
    if (mainView === 'RIDERS') loadRiders();
    if (mainView === 'MENU') {
      loadCatalog();
      loadSlots();
    }
  }, [mainView, loadCustomers, loadRiders, loadCatalog, loadSlots]);

  // Handle Order Status Transitions
  const handleTransition = async (orderId: string, nextStatus: string) => {
    setActionLoadingId(orderId);
    try {
      await adminApi.updateOrderStatus(orderId, nextStatus);
      showToast(`Order status updated to ${nextStatus}`);
      await loadOrders(true);
    } catch (err: any) {
      showToast(err.message || 'Status transition failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Assigning Rider
  const handleAssignRider = async (orderId: string, riderId: string) => {
    setActionLoadingId(orderId);
    try {
      await adminApi.assignRider(orderId, riderId);
      showToast('Rider assigned successfully');
      setShowRiderModal(false);
      await loadOrders(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to assign rider');
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

  // Toggle Item Stock (86-ing)
  const toggleItemStock = async (itemId: string, itemName: string) => {
    const today = new Date().toISOString().split('T')[0];
    const isCurrentlySoldOut = soldOutItemIds.has(itemId);
    const nextSoldOut = !isCurrentlySoldOut;

    const updated = new Set(soldOutItemIds);
    if (nextSoldOut) updated.add(itemId);
    else updated.delete(itemId);
    setSoldOutItemIds(updated);

    try {
      await adminApi.toggleDishSoldOut(itemId, today, nextSoldOut);
      showToast(nextSoldOut ? `⚠️ Marked ${itemName} as SOLD OUT (86)` : `✓ Marked ${itemName} back IN STOCK`);
    } catch (err: any) {
      setSoldOutItemIds(soldOutItemIds);
      showToast(err.message || 'Failed to update item availability in database');
    }
  };

  // Quick Preset Authentic Thali Images
  const PRESET_THALI_IMAGES = [
    {
      title: 'Deluxe Shahi Paneer Thali',
      url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Homestyle Dal & Phulka Thali',
      url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Satvik Pure Veg Thali',
      url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Rajasthani / Gujarati Feast',
      url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80',
    },
  ];

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setNewDishImageUrl(String(event.target.result));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishName.trim()) {
      showToast('Please enter a dish name');
      return;
    }
    const catId = newDishCategory || catalogCategories[0]?.id;
    if (!catId) {
      showToast('Please wait for catalog categories to load');
      return;
    }
    const priceNum = parseFloat(newDishPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('Please enter a valid price in ₹');
      return;
    }

    setIsSubmittingDish(true);
    try {
      await adminApi.createDish({
        categoryId: catId,
        name: newDishName.trim(),
        description: newDishDescription.trim() || 'Pure vegetarian homestyle meal freshly cooked in pure ghee.',
        basePricePaise: Math.round(priceNum * 100),
        imageUrl: newDishImageUrl || PRESET_THALI_IMAGES[0].url,
        dietaryType: 'VEG',
      });
      showToast(`✓ Added "${newDishName}" to Kitchen Menu!`);
      setShowAddDishModal(false);
      setNewDishName('');
      setNewDishPrice('');
      setNewDishDescription('');
      setNewDishImageUrl('');
      await loadCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to add new dish');
    } finally {
      setIsSubmittingDish(false);
    }
  };

  // Exact Metrics Matching Reference Image
  const totalOrdersCount = orders.length;
  const newCount = orders.filter((o) => o.status === 'PLACED').length;
  const preparingCount = orders.filter((o) => o.status === 'ACCEPTED' || o.status === 'PREPARING').length;
  const readyCount = orders.filter((o) => o.status === 'READY_FOR_PICKUP').length;
  const dispatchCount = orders.filter((o) => o.status === 'OUT_FOR_DELIVERY').length;
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;
  const totalGmvPaise = orders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? o.totalAmountPaise : 0), 0);

  // Filter Orders for Dashboard Table
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.includes(searchQuery) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilterTab === 'NEW') return order.status === 'PLACED';
    if (activeFilterTab === 'PREPARING') return order.status === 'ACCEPTED' || order.status === 'PREPARING';
    if (activeFilterTab === 'READY') return order.status === 'READY_FOR_PICKUP';
    if (activeFilterTab === 'DISPATCH') return order.status === 'OUT_FOR_DELIVERY';
    if (activeFilterTab === 'DELIVERED') return order.status === 'DELIVERED';
    if (activeFilterTab === 'CANCELLED') return order.status === 'CANCELLED';
    return true;
  });

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || null;

  return (
    <div className="min-h-screen bg-[#f8faf7] text-stone-900 flex flex-col font-body selection:bg-emerald-800 selection:text-white antialiased">
      {/* 1. TOP COMPACT HEADER (Matching Reference Image) */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200/90 px-4 lg:px-6 h-16 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[20px]">psychiatry</span>
            </span>
            <div>
              <h1 className="font-headline font-bold text-base leading-none text-gray-900">
                Janki Rasoi
              </h1>
              <span className="text-[11px] text-gray-400 font-medium">Operations Console</span>
            </div>
          </div>

          {/* Kitchen & Dispatch Tag */}
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            KITCHEN &amp; DISPATCH
          </span>

          {/* Live Kitchen Connection Indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 pl-2 border-l border-gray-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Kitchen Station #1</span>
            <span>•</span>
            <span className="text-gray-400">Connected to Supabase</span>
          </div>
        </div>

        {/* Right Header Controls: GMV | Chime | Profile */}
        <div className="flex items-center gap-3">
          {/* Today GMV Card */}
          <div className="bg-emerald-50/90 border border-emerald-200/80 px-3.5 py-1 rounded-xl text-right">
            <span className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider block">
              Today GMV
            </span>
            <span className="text-sm font-bold text-emerald-950 font-headline leading-tight block">
              ₹{(totalGmvPaise / 100).toFixed(2)}
            </span>
          </div>

          {/* Chime Bell Toggle */}
          <button
            onClick={() => {
              setAudioEnabled(!audioEnabled);
              if (!audioEnabled) playKitchenOrderChime();
            }}
            className="relative w-9 h-9 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center transition-colors shadow-2xs"
            title={audioEnabled ? 'Chime Active' : 'Muted'}
          >
            <span className="material-symbols-outlined text-[19px]">
              {audioEnabled ? 'notifications' : 'notifications_off'}
            </span>
            {audioEnabled && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500"></span>
            )}
          </button>

          {/* User Profile Avatar */}
          <div className="w-9 h-9 rounded-full bg-emerald-900 text-white font-bold flex items-center justify-center text-xs shadow-xs cursor-pointer">
            JR
          </div>
        </div>
      </header>

      {/* 2. BODY LAYOUT: Left Sidebar + Center Workspace (+ Right Panel on Orders) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Persistent Sidebar (Matching Reference Image) */}
        <aside className="w-56 bg-white border-r border-gray-200/90 flex flex-col justify-between p-3 shrink-0 select-none hidden md:flex overflow-y-auto no-scrollbar">
          {/* Main Navigation Stack */}
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setMainView('ORDERS')}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                mainView === 'ORDERS'
                  ? 'bg-emerald-50/80 text-emerald-900 border border-emerald-200/80 shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span>Orders</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-emerald-800 text-white text-[10px] font-bold flex items-center justify-center">
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setMainView('CUSTOMERS')}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 ${
                mainView === 'CUSTOMERS'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">group</span>
              <span>Customers</span>
            </button>

            <button
              onClick={() => setMainView('RIDERS')}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 ${
                mainView === 'RIDERS'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">two_wheeler</span>
              <span>Riders &amp; Delivery</span>
            </button>

            <button
              onClick={() => setMainView('MENU')}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 ${
                mainView === 'MENU'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">restaurant_menu</span>
              <span>Menu &amp; Dishes</span>
            </button>

            <button
              onClick={() => setMainView('REPORTS')}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 ${
                mainView === 'REPORTS'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">query_stats</span>
              <span>Reports</span>
            </button>

            <button
              onClick={() => setMainView('SETTINGS')}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 ${
                mainView === 'SETTINGS'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
              <span>Settings</span>
            </button>
          </nav>

          {/* Bottom Sidebar: Service Status & Capacity Link (Matching Reference Image) */}
          <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
            {/* Lunch Service Status Card */}
            <div className="bg-[#fcfdfa] border border-stone-200/80 p-2.5 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-sm">☀️</span>
                <div>
                  <div className="font-bold text-stone-800 text-[11px] leading-tight">Lunch Service</div>
                  <div className="text-[10px] text-stone-500">21 Oct PM – 01:30 PM</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                OPEN
              </span>
            </div>

            {/* Dinner Service Status Card */}
            <div className="bg-[#fcfdfa] border border-stone-200/80 p-2.5 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-sm">🌙</span>
                <div>
                  <div className="font-bold text-stone-800 text-[11px] leading-tight">Dinner Service</div>
                  <div className="text-[10px] text-stone-500">07:30 PM – 08:30 PM</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                OPEN
              </span>
            </div>

            {/* View Kitchen Capacity Button */}
            <button
              onClick={() => setMainView('MENU')}
              className="w-full mt-1 py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-[11px] font-semibold text-gray-700 flex items-center justify-between transition-colors shadow-2xs"
            >
              <span>View Kitchen Capacity</span>
              <span className="material-symbols-outlined text-sm text-gray-400">chevron_right</span>
            </button>
          </div>
        </aside>

        {/* 3. CENTER / WORKSPACE AREA */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Mobile Tab Bar */}
          <div className="md:hidden flex items-center gap-1 p-2 bg-white border-b border-gray-200 overflow-x-auto no-scrollbar">
            {(['ORDERS', 'CUSTOMERS', 'RIDERS', 'MENU'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setMainView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                  mainView === v ? 'bg-emerald-800 text-white' : 'text-gray-600 bg-gray-50'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* VIEW: ORDERS DASHBOARD (Exact Target Layout) */}
          {mainView === 'ORDERS' && (
            <main className="p-4 lg:p-6 flex flex-col gap-5 flex-1 max-w-[1600px] w-full mx-auto">
              {/* Dashboard Title & Actions Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold font-headline text-gray-900 tracking-tight">Orders</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Manage incoming orders, kitchen preparation, dispatch and delivery.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Search Input */}
                  <div className="relative w-64 sm:w-80">
                    <span className="material-symbols-outlined text-[18px] text-gray-400 absolute left-3 top-1/2 -translate-y-1/2">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search order ID, customer name or phone..."
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs placeholder:text-gray-400 focus:outline-hidden focus:border-emerald-600 shadow-2xs"
                    />
                  </div>

                  {/* Filter Button */}
                  <button
                    onClick={() => setActiveFilterTab('ALL')}
                    className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-[17px]">filter_list</span>
                    <span>Filter</span>
                  </button>

                  {/* Refresh Button */}
                  <button
                    onClick={() => loadOrders()}
                    className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-[17px] text-emerald-700">sync</span>
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* 6 Metric Summary Cards in One Row (Matching Reference Image) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                {/* 1. Total Orders */}
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-500">Total Orders</div>
                    <div className="text-2xl font-bold font-headline text-gray-900 mt-1">{totalOrdersCount}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">Today</div>
                  </div>
                  <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">description</span>
                  </span>
                </div>

                {/* 2. New Orders */}
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-500">New Orders</div>
                    <div className={`text-2xl font-bold font-headline mt-1 ${newCount > 0 ? 'text-rose-600' : 'text-rose-600'}`}>
                      {newCount}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">Waiting for confirmation</div>
                  </div>
                  <span className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">notifications</span>
                  </span>
                </div>

                {/* 3. Preparing */}
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-500">Preparing</div>
                    <div className="text-2xl font-bold font-headline text-amber-900 mt-1">{preparingCount}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">In kitchen</div>
                  </div>
                  <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">skillet</span>
                  </span>
                </div>

                {/* 4. Ready for Dispatch */}
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-500">Ready for Dispatch</div>
                    <div className="text-2xl font-bold font-headline text-blue-900 mt-1">{readyCount}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">Waiting rider</div>
                  </div>
                  <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">two_wheeler</span>
                  </span>
                </div>

                {/* 5. Out for Delivery */}
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-500">Out for Delivery</div>
                    <div className="text-2xl font-bold font-headline text-emerald-900 mt-1">{dispatchCount}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">With rider</div>
                  </div>
                  <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">sports_motorsports</span>
                  </span>
                </div>

                {/* 6. Delivered */}
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-500">Delivered</div>
                    <div className="text-2xl font-bold font-headline text-emerald-950 mt-1">{deliveredCount}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">Completed today</div>
                  </div>
                  <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  </span>
                </div>
              </div>

              {/* Status Filter Tab Pills (Matching Reference Image) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button
                  onClick={() => setActiveFilterTab('ALL')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeFilterTab === 'ALL'
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  All Orders ({totalOrdersCount})
                </button>

                <button
                  onClick={() => setActiveFilterTab('NEW')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeFilterTab === 'NEW'
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  New ({newCount})
                </button>

                <button
                  onClick={() => setActiveFilterTab('PREPARING')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeFilterTab === 'PREPARING'
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Preparing ({preparingCount})
                </button>

                <button
                  onClick={() => setActiveFilterTab('READY')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeFilterTab === 'READY'
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Ready ({readyCount})
                </button>

                <button
                  onClick={() => setActiveFilterTab('DISPATCH')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeFilterTab === 'DISPATCH'
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Out for Delivery ({dispatchCount})
                </button>

                <button
                  onClick={() => setActiveFilterTab('DELIVERED')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeFilterTab === 'DELIVERED'
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Delivered ({deliveredCount})
                </button>

                <button
                  onClick={() => setActiveFilterTab('CANCELLED')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeFilterTab === 'CANCELLED'
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Cancelled ({cancelledCount})
                </button>
              </div>

              {/* Main Content Split: Table on Left + Selected Order Details on Right */}
              <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
                {/* Orders Table Container */}
                <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead className="bg-[#f9faf8] text-gray-600 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200/80">
                        <tr>
                          <th className="py-2.5 px-3">Order</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Items</th>
                          <th className="py-2.5 px-3">Time Slot</th>
                          <th className="py-2.5 px-3">Payment</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredOrders.map((order) => {
                          const isSelected = selectedOrder?.id === order.id;
                          const isDelivered = order.status === 'DELIVERED';
                          const isPreparing = order.status === 'ACCEPTED' || order.status === 'PREPARING';
                          const isPlaced = order.status === 'PLACED';
                          const isReady = order.status === 'READY_FOR_PICKUP';
                          const isDispatch = order.status === 'OUT_FOR_DELIVERY';

                          return (
                            <tr
                              key={order.id}
                              onClick={() => setSelectedOrderId(order.id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-emerald-50/40 hover:bg-emerald-50/60'
                                  : 'hover:bg-gray-50/80'
                              }`}
                            >
                              {/* Order ID & Date */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="font-bold text-emerald-800 font-mono text-xs">
                                  #{order.orderNumber}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                  {formatOrderDate(order.createdAt)}
                                </div>
                              </td>

                              {/* Customer (Avatar + Name + Phone + Address) */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0">
                                    {getInitials(order.customerName)}
                                  </span>
                                  <div className="min-w-0 max-w-[130px]">
                                    <div className="font-bold text-gray-900 truncate text-[11px]">
                                      {order.customerName}
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-mono">
                                      {order.customerPhone}
                                    </div>
                                    <div className="text-[10px] text-gray-400 truncate">
                                      {formatAddress(order.deliveryAddress)}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Items */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="font-bold text-gray-900 text-xs">
                                  {order.itemsCount || order.items?.reduce((acc, it) => acc + it.quantity, 0) || 1} item
                                  {(order.itemsCount || order.items?.reduce((acc, it) => acc + it.quantity, 0) || 1) > 1 ? 's' : ''}
                                </div>
                                <div
                                  className="text-[10px] text-gray-500 truncate max-w-[140px]"
                                  title={order.items?.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                                >
                                  {order.items && order.items.length > 0
                                    ? order.items.map((i) => i.productName).join(', ')
                                    : 'Wholesome Meal'}
                                </div>
                              </td>

                              {/* Time Slot */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="font-bold text-emerald-800 text-[11px]">
                                  {order.slotLabel?.includes('Dinner') ? 'Dinner' : 'Lunch'}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                  {order.slotLabel?.includes('Dinner') ? '07:30 – 08:30 PM' : '12:30 – 01:30 PM'}
                                </div>
                              </td>

                              {/* Payment */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="font-bold text-gray-900 font-mono text-xs">
                                  ₹{(order.totalAmountPaise / 100).toFixed(2)}
                                </div>
                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-gray-100 text-gray-600 mt-0.5 uppercase">
                                  {order.paymentMethod || 'COD'}
                                </span>
                              </td>

                              {/* Status Badge (Matching Reference Image) */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {isPreparing ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/90 inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    <span>PREPARING</span>
                                  </span>
                                ) : isDelivered ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/90 inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                    <span>DELIVERED</span>
                                  </span>
                                ) : isPlaced ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                    <span>NEW ORDER</span>
                                  </span>
                                ) : isReady ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    <span>READY</span>
                                  </span>
                                ) : isDispatch ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                                    <span>WITH RIDER</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                                    {order.status}
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrderId(order.id);
                                    }}
                                    className="px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold text-xs transition-colors shadow-2xs"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleManualOverride(order.id);
                                    }}
                                    className="w-6 h-6 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-colors shadow-2xs"
                                    title="Manual Override / More"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">more_horiz</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredOrders.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-gray-400">
                              {loading ? 'Loading kitchen orders...' : 'No orders found matching this filter.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Side: Selected Order Details Panel */}
                {selectedOrder && (
                  <div className="w-full lg:w-[350px] xl:w-[370px] shrink-0 bg-white rounded-2xl border border-gray-200/90 p-4 shadow-2xs flex flex-col gap-3 sticky top-3 max-h-[calc(100vh-80px)] overflow-y-auto no-scrollbar">
                    {/* Panel Header */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                      <h3 className="font-bold text-base text-gray-900 font-headline leading-none">
                        #{selectedOrder.orderNumber}
                      </h3>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                          selectedOrder.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : selectedOrder.status === 'PLACED'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            selectedOrder.status === 'DELIVERED' ? 'bg-emerald-600' : 'bg-amber-500'
                          }`}
                        ></span>
                        <span>{selectedOrder.status}</span>
                      </span>
                    </div>

                    {/* Sub-tabs: Details | Customer | Timeline */}
                    <div className="flex items-center gap-4 text-xs font-semibold border-b border-gray-100 pb-1.5">
                      <button
                        onClick={() => setDetailTab('DETAILS')}
                        className={`pb-1 transition-colors relative ${
                          detailTab === 'DETAILS'
                            ? 'text-emerald-900 font-bold border-b-2 border-emerald-800'
                            : 'text-gray-400 hover:text-gray-700'
                        }`}
                      >
                        Details
                      </button>
                      <button
                        onClick={() => setDetailTab('CUSTOMER')}
                        className={`pb-1 transition-colors relative ${
                          detailTab === 'CUSTOMER'
                            ? 'text-emerald-900 font-bold border-b-2 border-emerald-800'
                            : 'text-gray-400 hover:text-gray-700'
                        }`}
                      >
                        Customer
                      </button>
                      <button
                        onClick={() => setDetailTab('TIMELINE')}
                        className={`pb-1 transition-colors relative ${
                          detailTab === 'TIMELINE'
                            ? 'text-emerald-900 font-bold border-b-2 border-emerald-800'
                            : 'text-gray-400 hover:text-gray-700'
                        }`}
                      >
                        Timeline
                      </button>
                    </div>

                    {detailTab === 'DETAILS' && (
                      <div className="flex flex-col gap-3 text-xs">
                        {/* Section A: Customer Info */}
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-gray-700 flex items-center gap-1.5 text-xs">
                            <span className="material-symbols-outlined text-[15px] text-gray-500">person</span>
                            <span>Customer</span>
                          </span>

                          <div className="bg-[#fcfdfa] p-2.5 rounded-xl border border-gray-100 flex flex-col gap-1 text-xs">
                            <div className="font-bold text-gray-900 text-xs">{selectedOrder.customerName}</div>
                            <div className="flex items-center justify-between">
                              <a
                                href={`tel:${selectedOrder.customerPhone}`}
                                className="text-emerald-700 font-mono font-semibold hover:underline flex items-center gap-1 text-[11px]"
                              >
                                <span className="material-symbols-outlined text-[13px]">call</span>
                                <span>+91 {selectedOrder.customerPhone}</span>
                              </a>
                            </div>
                            <div className="text-gray-500 text-[11px] mt-0.5 flex items-start gap-1">
                              <span className="material-symbols-outlined text-[13px] text-gray-400 shrink-0 mt-0.5">
                                location_on
                              </span>
                              <span className="leading-snug">
                                {formatAddress(selectedOrder.deliveryAddress)}
                              </span>
                            </div>
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(formatAddress(selectedOrder.deliveryAddress))}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-800 text-[11px] font-bold hover:underline flex items-center gap-1 mt-0.5 pl-4"
                            >
                              <span className="material-symbols-outlined text-[13px]">map</span>
                              <span>View in Maps</span>
                            </a>
                          </div>
                        </div>

                        {/* Section B: Order Items */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-700 flex items-center gap-1.5 text-xs">
                              <span className="material-symbols-outlined text-[15px] text-gray-500">inventory_2</span>
                              <span>
                                Order Items (
                                {selectedOrder.items && selectedOrder.items.length > 0
                                  ? selectedOrder.items.reduce((acc, it) => acc + it.quantity, 0)
                                  : selectedOrder.itemsCount || 1}
                                )
                              </span>
                            </span>
                          </div>

                          <div className="flex flex-col gap-2">
                            {selectedOrder.items && selectedOrder.items.length > 0 ? (
                              selectedOrder.items.map((item, idx) => (
                                <div
                                  key={item.id || idx}
                                  className="bg-[#fcfdfa] p-2.5 rounded-xl border border-gray-100 flex items-start gap-2.5"
                                >
                                  {/* Food Photo / Veg Icon */}
                                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-emerald-50 border border-emerald-100 shrink-0 relative flex items-center justify-center shadow-2xs">
                                    <span className="material-symbols-outlined text-[20px] text-emerald-700">soup_kitchen</span>
                                    <span className="absolute top-0.5 left-0.5 w-2 h-2 rounded-2xs border border-green-600 bg-white p-0.5 flex items-center justify-center shadow-xs">
                                      <span className="w-1 h-1 rounded-full bg-green-600"></span>
                                    </span>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-bold text-gray-900 truncate text-xs">
                                        {item.productName}
                                      </span>
                                      <span className="font-bold text-gray-900 font-mono shrink-0 text-xs">
                                        ₹
                                        {item.totalPricePaise
                                          ? (item.totalPricePaise / 100).toFixed(2)
                                          : (
                                              selectedOrder.totalAmountPaise /
                                              (selectedOrder.items?.length || 1) /
                                              100
                                            ).toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                      <span className="text-[11px] text-gray-500 truncate">
                                        {item.variantName || 'Standard Meal Portion'}
                                      </span>
                                      <span className="text-[11px] text-emerald-800 font-bold shrink-0">
                                        × {item.quantity}
                                      </span>
                                    </div>
                                    {item.addons && item.addons.length > 0 && (
                                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                        + {item.addons.map((a) => a.name).join(', ')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="bg-[#fcfdfa] p-2.5 rounded-xl border border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                                <span className="material-symbols-outlined text-[16px] text-gray-400">info</span>
                                <span>Wholesome Meal Package (×{selectedOrder.itemsCount || 1})</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Section C: Order Info */}
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-gray-700 flex items-center gap-1.5 text-xs">
                            <span className="material-symbols-outlined text-[15px] text-gray-500">info</span>
                            <span>Order Info</span>
                          </span>

                          <div className="bg-[#fcfdfa] p-2.5 rounded-xl border border-gray-100 flex flex-col gap-1.5 text-xs">
                            <div className="flex items-center justify-between text-gray-600 text-[11px]">
                              <span className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px] text-gray-400">schedule</span>
                                <span>Time Slot</span>
                              </span>
                              <span className="font-bold text-gray-900">
                                {selectedOrder.slotLabel || 'Dinner (07:30 PM - 08:30 PM)'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-gray-600 text-[11px]">
                              <span className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px] text-gray-400">event</span>
                                <span>Order Time</span>
                              </span>
                              <span className="text-gray-900 font-mono">
                                {formatOrderDate(selectedOrder.createdAt)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-gray-600 text-[11px]">
                              <span className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px] text-gray-400">payments</span>
                                <span>Payment Method</span>
                              </span>
                              <span className="font-bold text-emerald-800 uppercase">
                                {selectedOrder.paymentMethod || 'COD'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1.5 border-t border-gray-200/60 text-xs">
                              <span className="font-bold text-gray-700">Total Amount</span>
                              <span className="font-extrabold text-sm text-gray-900 font-mono">
                                ₹{(selectedOrder.totalAmountPaise / 100).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Section D: Operational Actions (Matching Reference Image) */}
                        <div className="flex flex-col gap-1.5 pt-0.5">
                          <span className="font-bold text-gray-700 text-xs flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px] text-gray-500">bolt</span>
                            <span>Actions</span>
                          </span>

                          {/* Primary Transition Action Button */}
                          {selectedOrder.status === 'PLACED' && (
                            <button
                              onClick={() => handleTransition(selectedOrder.id, 'ACCEPTED')}
                              disabled={actionLoadingId === selectedOrder.id}
                              className="w-full py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">skillet</span>
                              <span>Accept &amp; Start Preparing</span>
                            </button>
                          )}

                          {(selectedOrder.status === 'ACCEPTED' || selectedOrder.status === 'PREPARING') && (
                            <button
                              onClick={() => handleTransition(selectedOrder.id, 'READY_FOR_PICKUP')}
                              disabled={actionLoadingId === selectedOrder.id}
                              className="w-full py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                              <span>Mark as Ready</span>
                            </button>
                          )}

                          {selectedOrder.status === 'READY_FOR_PICKUP' && (
                            <button
                              onClick={() => handleTransition(selectedOrder.id, 'OUT_FOR_DELIVERY')}
                              disabled={actionLoadingId === selectedOrder.id}
                              className="w-full py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">two_wheeler</span>
                              <span>Dispatch with Rider</span>
                            </button>
                          )}

                          {selectedOrder.status === 'OUT_FOR_DELIVERY' && (
                            <button
                              onClick={() => handleManualOverride(selectedOrder.id)}
                              disabled={actionLoadingId === selectedOrder.id}
                              className="w-full py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">task_alt</span>
                              <span>Verify PIN &amp; Complete Delivery</span>
                            </button>
                          )}

                          {selectedOrder.status === 'DELIVERED' && (
                            <div className="w-full py-2 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200">
                              <span className="material-symbols-outlined text-[16px]">verified</span>
                              <span>Order Delivered Successfully</span>
                            </div>
                          )}

                          {/* Secondary Row: Assign Rider & Call Customer */}
                          <div className="grid grid-cols-2 gap-2 mt-0.5">
                            <button
                              onClick={() => setShowRiderModal(true)}
                              className="py-1.5 px-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                            >
                              <span className="material-symbols-outlined text-[15px] text-emerald-700">
                                two_wheeler
                              </span>
                              <span>Assign Rider</span>
                            </button>

                            <a
                              href={`tel:${selectedOrder.customerPhone}`}
                              className="py-1.5 px-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors text-center"
                            >
                              <span className="material-symbols-outlined text-[15px] text-gray-600">call</span>
                              <span>Call Customer</span>
                            </a>
                          </div>

                          {/* Cancel Order Action */}
                          {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'DELIVERED' && (
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to cancel this order?')) {
                                  handleTransition(selectedOrder.id, 'CANCELLED');
                                }
                              }}
                              className="w-full py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors mt-0.5"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                              <span>Cancel Order</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {detailTab === 'CUSTOMER' && (
                      <div className="flex flex-col gap-3 text-xs">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-1.5">
                          <span className="font-bold text-gray-900">{selectedOrder.customerName}</span>
                          <span className="text-gray-600 font-mono">Mobile: +91 {selectedOrder.customerPhone}</span>
                          <span className="text-gray-500 text-[11px]">Registered Customer Account</span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Full address on file:
                          <div className="text-gray-800 font-medium mt-1 p-2 bg-white rounded-lg border border-gray-200">
                            {formatAddress(selectedOrder.deliveryAddress)}
                          </div>
                        </div>
                      </div>
                    )}

                    {detailTab === 'TIMELINE' && (
                      <div className="flex flex-col gap-3 text-xs pl-2">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                          <div>
                            <div className="font-bold text-gray-900">Order Placed &amp; Authorized</div>
                            <div className="text-[10px] text-gray-400">{formatOrderDate(selectedOrder.createdAt)}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${selectedOrder.status !== 'PLACED' ? 'bg-emerald-600' : 'bg-gray-300'}`}></span>
                          <div>
                            <div className="font-bold text-gray-900">Kitchen Preparation</div>
                            <div className="text-[10px] text-gray-400">Cooking on Station #1</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${selectedOrder.status === 'READY_FOR_PICKUP' || selectedOrder.status === 'OUT_FOR_DELIVERY' || selectedOrder.status === 'DELIVERED' ? 'bg-emerald-600' : 'bg-gray-300'}`}></span>
                          <div>
                            <div className="font-bold text-gray-900">Ready for Dispatch</div>
                            <div className="text-[10px] text-gray-400">Packed in spill-proof warm tray</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${selectedOrder.status === 'OUT_FOR_DELIVERY' || selectedOrder.status === 'DELIVERED' ? 'bg-emerald-600' : 'bg-gray-300'}`}></span>
                          <div>
                            <div className="font-bold text-gray-900">Out with Delivery Rider</div>
                            <div className="text-[10px] text-gray-400">En route to customer</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${selectedOrder.status === 'DELIVERED' ? 'bg-emerald-600' : 'bg-gray-300'}`}></span>
                          <div>
                            <div className="font-bold text-gray-900">Delivered</div>
                            <div className="text-[10px] text-gray-400">Handover verified</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </main>
          )}

          {/* VIEW: CUSTOMERS */}
          {mainView === 'CUSTOMERS' && (
            <main className="p-4 lg:p-6 flex flex-col gap-5 flex-1 max-w-[1600px] w-full mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold font-headline text-gray-900">Customers &amp; Addresses</h2>
                  <p className="text-xs text-gray-500">View customer ordering history and contact info.</p>
                </div>
                <button
                  onClick={loadCustomers}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 border border-gray-200 flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-base text-emerald-800">sync</span>
                  <span>Reload</span>
                </button>
              </div>

              <div className="bg-white border border-gray-200/90 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f9faf8] text-gray-600 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4">Orders Placed</th>
                      <th className="py-3 px-4">Total Spent</th>
                      <th className="py-3 px-4">Last Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customers.map((c, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                            {getInitials(c.name)}
                          </span>
                          <span>{c.name}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-700">+91 {c.phone}</td>
                        <td className="py-3 px-4 font-bold text-emerald-900">{c.orderCount} meals</td>
                        <td className="py-3 px-4 font-mono font-bold">₹{((c.totalSpendPaise || 0) / 100).toFixed(2)}</td>
                        <td className="py-3 px-4 text-gray-500">{formatOrderDate(c.lastOrderDate)}</td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-gray-400">
                          {customersLoading ? 'Loading customers directory...' : 'No customers registered yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </main>
          )}

          {/* VIEW: RIDERS */}
          {mainView === 'RIDERS' && (
            <main className="p-4 lg:p-6 flex flex-col gap-5 flex-1 max-w-[1600px] w-full mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold font-headline text-gray-900">Riders &amp; Delivery Fleet</h2>
                  <p className="text-xs text-gray-500">Manage delivery partners and live dispatch availability.</p>
                </div>
                <button
                  onClick={loadRiders}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 border border-gray-200 flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-base text-emerald-800">sync</span>
                  <span>Reload</span>
                </button>
              </div>

              <div className="bg-white border border-gray-200/90 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f9faf8] text-gray-600 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Rider</th>
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4">Vehicle Number</th>
                      <th className="py-3 px-4">Duty Status</th>
                      <th className="py-3 px-4">Account Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {riders.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-xs font-bold">
                            🛵
                          </span>
                          <span>{r.name}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-700">+91 {r.phone}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-amber-900">{r.vehicleNumber}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                              r.isAvailable
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${r.isAvailable ? 'bg-emerald-600' : 'bg-rose-500'}`}></span>
                            <span>{r.isAvailable ? 'ON DUTY' : 'OFFLINE'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold text-[10px]">
                            {r.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {riders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-gray-400">
                          {ridersLoading ? 'Loading delivery fleet...' : 'No delivery riders registered.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </main>
          )}

          {/* VIEW: MENU & DISHES */}
          {mainView === 'MENU' && (
            <main className="p-4 lg:p-6 flex flex-col gap-6 flex-1 max-w-[1600px] w-full mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                <div>
                  <h2 className="text-2xl font-bold font-headline text-gray-900">Menu &amp; Kitchen Dishes</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Toggle dishes on/off instantly, monitor meal windows, and add new daily thalis.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      loadCatalog();
                      loadSlots();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 border border-gray-200 flex items-center gap-1.5 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-base text-emerald-800">sync</span>
                    <span>Reload</span>
                  </button>
                  <button
                    onClick={() => {
                      if (catalogCategories.length > 0 && !newDishCategory) {
                        setNewDishCategory(catalogCategories[0].id);
                      }
                      setShowAddDishModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    <span>Add New Thali</span>
                  </button>
                </div>
              </div>

              {/* Delivery Windows Banner */}
              <div className="bg-gradient-to-r from-emerald-50/80 to-stone-50 border border-emerald-200/80 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-3 border-b border-emerald-100 pb-2">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[17px] text-emerald-700">schedule</span>
                    <span>Active Kitchen Delivery Windows</span>
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-800">
                    Operating standard 2-meal daily service
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">LUNCH WINDOW</span>
                      <span className="text-[11px] text-gray-500 mt-0.5 block">Delivery: 12:30 PM – 01:30 PM • Cutoff: 11:30 AM IST</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      🟢 OPEN
                    </span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">DINNER WINDOW</span>
                      <span className="text-[11px] text-gray-500 mt-0.5 block">Delivery: 07:30 PM – 08:30 PM • Cutoff: 06:30 PM IST</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      🟢 OPEN
                    </span>
                  </div>
                </div>
              </div>

              {/* Dishes Grid */}
              <div className="flex flex-col gap-6">
                {catalogCategories.map((cat) => (
                  <div key={cat.id} className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-2xs flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>
                        <span>{cat.name}</span>
                      </h3>
                      <span className="text-xs text-gray-500 font-medium">{cat.items?.length || 0} dishes</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cat.items?.map((item: any) => {
                        const is86ed = soldOutItemIds.has(item.id);
                        return (
                          <div
                            key={item.id}
                            className={`rounded-2xl border p-3.5 flex flex-col justify-between gap-3 shadow-2xs ${
                              is86ed
                                ? 'bg-stone-50/80 border-stone-300 opacity-75'
                                : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-xs'
                            }`}
                          >
                            <div>
                              <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-stone-100 border border-stone-200/60 mb-3 shadow-2xs">
                                <img
                                  src={item.imageUrl || PRESET_THALI_IMAGES[0].url}
                                  alt={item.name}
                                  className="w-full h-full object-cover object-center"
                                />
                                <span className="absolute top-2 left-2 w-4 h-4 rounded-xs border border-green-600 bg-white p-0.5 flex items-center justify-center shadow-xs">
                                  <span className="w-2 h-2 rounded-full bg-green-600"></span>
                                </span>
                              </div>

                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-sm text-gray-900 leading-snug">{item.name}</span>
                                <span className="text-sm font-bold text-emerald-800 shrink-0 font-mono">
                                  ₹{(item.basePricePaise / 100).toFixed(2)}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                                {item.description || 'Pure vegetarian meal cooked in pure cow ghee.'}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              <span
                                className={`text-xs font-bold ${
                                  !is86ed ? 'text-emerald-800' : 'text-stone-500'
                                }`}
                              >
                                {!is86ed ? 'IN STOCK (ON)' : 'SOLD OUT (OFF)'}
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={!is86ed}
                                onClick={() => toggleItemStock(item.id, item.name)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                  !is86ed ? 'bg-emerald-600' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                                    !is86ed ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </main>
          )}

          {/* VIEW: REPORTS */}
          {mainView === 'REPORTS' && (
            <main className="p-4 lg:p-6 flex flex-col gap-5 flex-1 max-w-[1600px] w-full mx-auto">
              <div>
                <h2 className="text-2xl font-bold font-headline text-gray-900">Kitchen Analytics &amp; Reports</h2>
                <p className="text-xs text-gray-500">Summary of kitchen dispatch times, order revenue and meal volumes.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs">
                  <span className="text-xs text-gray-500 font-medium">Total Orders Fulfilled</span>
                  <div className="text-3xl font-bold text-gray-900 font-headline mt-1">{deliveredCount}</div>
                  <span className="text-xs text-emerald-700 font-semibold mt-1 block">100% on-time delivery</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs">
                  <span className="text-xs text-gray-500 font-medium">Today Gross Revenue</span>
                  <div className="text-3xl font-bold text-emerald-950 font-headline mt-1">₹{(totalGmvPaise / 100).toFixed(2)}</div>
                  <span className="text-xs text-gray-500 mt-1 block">COD + Online Prepayments</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs">
                  <span className="text-xs text-gray-500 font-medium">Average Order Value (AOV)</span>
                  <div className="text-3xl font-bold text-gray-900 font-headline mt-1">
                    ₹{orders.length ? (totalGmvPaise / 100 / orders.length).toFixed(0) : '212'}
                  </div>
                  <span className="text-xs text-gray-500 mt-1 block">Per customer delivery</span>
                </div>
              </div>
            </main>
          )}

          {/* VIEW: SETTINGS */}
          {mainView === 'SETTINGS' && (
            <main className="p-4 lg:p-6 flex flex-col gap-5 flex-1 max-w-[1600px] w-full mx-auto">
              <div>
                <h2 className="text-2xl font-bold font-headline text-gray-900">Console Settings</h2>
                <p className="text-xs text-gray-500">Configure station alerts, chime notifications, and operational parameters.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col gap-4 max-w-xl">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <div className="font-bold text-sm text-gray-900">Audio Chime Notifications</div>
                    <div className="text-xs text-gray-500">Play web chime when new incoming order is placed</div>
                  </div>
                  <button
                    onClick={() => {
                      setAudioEnabled(!audioEnabled);
                      if (!audioEnabled) playKitchenOrderChime();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      audioEnabled ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-gray-100 text-gray-600 border-gray-300'
                    }`}
                  >
                    {audioEnabled ? 'Chime ON' : 'Muted'}
                  </button>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <div className="font-bold text-sm text-gray-900">Auto-Refresh Interval</div>
                    <div className="text-xs text-gray-500">Polling kitchen queue every 5 seconds</div>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    5s Active
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-gray-900">Database Connection</div>
                    <div className="text-xs text-gray-500">Supabase PostgreSQL live instance</div>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Connected</span>
                  </span>
                </div>
              </div>
            </main>
          )}
        </div>
      </div>

      {/* 4. ASSIGN RIDER MODAL */}
      {showRiderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl border border-gray-200 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900">Assign Delivery Rider</h3>
                <p className="text-xs text-gray-500">Select an available rider for order #{selectedOrder.orderNumber}</p>
              </div>
              <button
                onClick={() => setShowRiderModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {riders.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleAssignRider(selectedOrder.id, r.id)}
                  className="p-3 rounded-xl border border-gray-200 hover:border-emerald-600 hover:bg-emerald-50/50 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-xs font-bold">
                      🛵
                    </span>
                    <div>
                      <div className="font-bold text-xs text-gray-900">{r.name}</div>
                      <div className="text-[11px] text-gray-500 font-mono">+91 {r.phone} • {r.vehicleNumber}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                    {r.isAvailable ? 'ON DUTY' : 'OFFLINE'}
                  </span>
                </div>
              ))}
              {riders.length === 0 && (
                <div className="py-6 text-center text-xs text-gray-400">No registered delivery riders available.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. ADD NEW THALI MODAL */}
      {showAddDishModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-5 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900 font-headline">Add New Thali / Dish</h3>
                <p className="text-xs text-gray-500">Add a fresh thali with pricing, description, and auto-cropped photo.</p>
              </div>
              <button
                onClick={() => setShowAddDishModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDish} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Thali / Dish Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  placeholder="e.g. Special Shahi Paneer Thali"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:border-emerald-600 text-gray-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category <span className="text-rose-500">*</span></label>
                  <select
                    value={newDishCategory}
                    onChange={(e) => setNewDishCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:border-emerald-600 text-gray-800 font-medium bg-white"
                  >
                    {catalogCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Price in ₹ (INR) <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      value={newDishPrice}
                      onChange={(e) => setNewDishPrice(e.target.value)}
                      placeholder="189"
                      className="w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:border-emerald-600 text-gray-800 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description / Thali Items</label>
                <textarea
                  rows={2}
                  value={newDishDescription}
                  onChange={(e) => setNewDishDescription(e.target.value)}
                  placeholder="e.g. Pure ghee Dal Makhani, Paneer Lababdar, 4 Phulkas, Basmati Rice, Salad & Gulab Jamun"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:border-emerald-600 text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Dish Photo (Auto-crops into required format)</label>
                <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-stone-900 border border-stone-200 mb-2 flex items-center justify-center shadow-inner">
                  {newDishImageUrl ? (
                    <>
                      <img src={newDishImageUrl} alt="Preview" className="w-full h-full object-cover object-center" />
                      <div className="absolute top-2.5 right-2.5 bg-black/75 px-2.5 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-1 shadow-sm">
                        <span className="material-symbols-outlined text-[13px] text-emerald-400">crop</span>
                        <span>Auto-Cropped (16:10 Format)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewDishImageUrl('')}
                        className="absolute bottom-2.5 right-2.5 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-full shadow-md"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center text-white/80">
                      <span className="material-symbols-outlined text-3xl text-emerald-400 mb-1">add_a_photo</span>
                      <span className="text-xs font-bold">Pick or Upload Dish Photo</span>
                      <span className="text-[10px] text-stone-400 mt-0.5">Auto-cropped to display ratio without distortion</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold flex items-center gap-1.5 border border-stone-300 shrink-0">
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      <span>Upload File</span>
                      <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                    </label>
                    <input
                      type="url"
                      value={newDishImageUrl}
                      onChange={(e) => setNewDishImageUrl(e.target.value)}
                      placeholder="or paste image URL..."
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                    <span className="text-[10px] text-gray-500 font-bold shrink-0">Presets:</span>
                    {PRESET_THALI_IMAGES.map((preset) => (
                      <button
                        key={preset.title}
                        type="button"
                        onClick={() => setNewDishImageUrl(preset.url)}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-[10px] font-semibold text-gray-700 whitespace-nowrap border border-gray-200"
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddDishModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDish}
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmittingDish ? 'Saving Dish...' : 'Publish Thali'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom duration-200 border border-emerald-700/50">
          <span className="material-symbols-outlined text-[20px] text-emerald-400">info</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
