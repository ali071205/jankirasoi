'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api, AdminOrder } from '../../lib/api';
import { useCart } from '../../context/CartContext';

export default function AdminPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { showToast } = useCart();

  const loadOrders = useCallback(async () => {
    try {
      const data = await api.getAdminOrders();
      setOrders(data.orders || []);
    } catch (err: any) {
      console.error('Failed to load admin orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 6000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId);
    try {
      await api.updateOrderStatus(orderId, newStatus, 'Kitchen KDS action');
      showToast(`Order updated to ${newStatus}`);
      await loadOrders();
    } catch (err: any) {
      showToast(err.message || 'Status transition failed', true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualOverride = async (orderId: string) => {
    const reason = window.prompt(
      'Enter manual verification reason (e.g. Phone confirmation with customer):'
    );
    if (!reason) return;

    setActionLoading(orderId);
    try {
      await api.overrideDelivery(orderId, reason);
      showToast('Order manually marked DELIVERED');
      await loadOrders();
    } catch (err: any) {
      showToast(err.message || 'Override failed', true);
    } finally {
      setActionLoading(null);
    }
  };

  const activeOrders = orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmountPaise || 0), 0);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PLACED':
        return 'bg-blue-100 text-blue-800';
      case 'ACCEPTED':
        return 'bg-amber-100 text-amber-800';
      case 'PREPARING':
        return 'bg-orange-100 text-orange-800';
      case 'READY_FOR_PICKUP':
        return 'bg-purple-100 text-purple-800';
      case 'OUT_FOR_DELIVERY':
        return 'bg-teal-100 text-teal-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <main className="flex-1 pt-20 pb-20 max-w-6xl mx-auto w-full px-4 flex flex-col gap-4">
      {/* Shift KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white shadow-xs border border-black/5">
          <span className="text-xs text-on-surface-variant font-medium">Active Orders</span>
          <span className="font-headline font-bold text-2xl text-primary block mt-1">
            {activeOrders.length}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-white shadow-xs border border-black/5">
          <span className="text-xs text-on-surface-variant font-medium">Shift Revenue</span>
          <span className="font-headline font-bold text-2xl text-on-surface block mt-1">
            ₹{(totalRevenue / 100).toFixed(2)}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-white shadow-xs border border-black/5">
          <span className="text-xs text-on-surface-variant font-medium">Lunch Service</span>
          <span className="font-headline font-bold text-sm text-green-700 block mt-2">
            OPEN • 12:30–13:30
          </span>
        </div>
        <div className="p-4 rounded-xl bg-white shadow-xs border border-black/5">
          <span className="text-xs text-on-surface-variant font-medium">Dinner Service</span>
          <span className="font-headline font-bold text-sm text-amber-700 block mt-2">
            OPEN • 19:30–20:30
          </span>
        </div>
      </div>

      {/* Live Orders Kanban / Board */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-black/5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">kitchen</span>
            <h2 className="font-headline font-bold text-lg text-on-surface">Kitchen Orders Queue</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadOrders}
              className="px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span> Refresh
            </button>
          </div>
        </div>

        {/* Orders Container */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-gray-50 border border-gray-200 animate-pulse h-48"></div>
            <div className="p-6 rounded-xl bg-gray-50 border border-gray-200 animate-pulse h-48"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-xl">
            <span className="material-symbols-outlined text-[36px] text-gray-300 block mb-2">soup_kitchen</span>
            <p className="font-bold text-sm">No live orders in kitchen queue right now.</p>
            <p className="text-xs text-gray-400 mt-1">Place an order from the customer storefront to see it update live.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((o) => {
              const addr =
                typeof o.deliveryAddress === 'object' && o.deliveryAddress !== null
                  ? `${o.deliveryAddress.flat || ''}, ${o.deliveryAddress.street || ''}`
                  : String(o.deliveryAddress || 'Address on record');

              const isActing = actionLoading === o.id;

              return (
                <div
                  key={o.id}
                  className="p-4 rounded-xl border border-gray-200 bg-surface-container-lowest shadow-xs flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-primary">{o.orderNumber}</span>
                        <span className="text-[10px] text-gray-400 block">
                          {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusBadgeClass(
                          o.status
                        )}`}
                      >
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="mt-3 text-xs flex flex-col gap-1">
                      <div className="font-bold text-on-surface">
                        {o.customerName} • <span className="text-primary">{o.customerPhone}</span>
                      </div>
                      <div className="text-gray-500 text-[11px] line-clamp-1">{addr}</div>
                      <div className="text-[11px] text-secondary font-semibold mt-1">
                        Slot: {o.slotLabel}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-500 block text-[10px]">Total</span>
                      <span className="font-bold text-sm text-primary">
                        ₹{(o.totalAmountPaise / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isActing ? (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                          Saving...
                        </span>
                      ) : (
                        <>
                          {o.status === 'PLACED' && (
                            <button
                              onClick={() => handleUpdateStatus(o.id, 'ACCEPTED')}
                              className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors"
                            >
                              Accept
                            </button>
                          )}
                          {o.status === 'ACCEPTED' && (
                            <button
                              onClick={() => handleUpdateStatus(o.id, 'PREPARING')}
                              className="px-3 py-1 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                            >
                              Start Cooking
                            </button>
                          )}
                          {o.status === 'PREPARING' && (
                            <button
                              onClick={() => handleUpdateStatus(o.id, 'READY_FOR_PICKUP')}
                              className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                            >
                              Pack &amp; Ready
                            </button>
                          )}
                          {o.status === 'READY_FOR_PICKUP' && (
                            <button
                              onClick={() => handleUpdateStatus(o.id, 'OUT_FOR_DELIVERY')}
                              className="px-3 py-1 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800 transition-colors"
                            >
                              Dispatch Rider
                            </button>
                          )}
                          {o.status === 'OUT_FOR_DELIVERY' && (
                            <button
                              onClick={() => handleManualOverride(o.id)}
                              className="px-2.5 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              Override
                            </button>
                          )}
                          {o.status === 'DELIVERED' && (
                            <span className="text-green-700 font-bold text-xs flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[14px]">done_all</span> Delivered
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
