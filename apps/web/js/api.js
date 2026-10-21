// Janki Rasoi — Authoritative API & State Client
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api/v1'
  : '/api/v1';

export const api = {
  // 1. Catalog
  async getCatalog(serviceDate) {
    const url = serviceDate ? `${API_BASE}/catalog?service_date=${serviceDate}` : `${API_BASE}/catalog`;
    const res = await fetch(url);
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to fetch catalog');
    return res.json();
  },

  // 2. Delivery Zones
  async checkPincode(pincode) {
    const res = await fetch(`${API_BASE}/delivery-zones/check?pincode=${encodeURIComponent(pincode)}`);
    if (!res.ok) throw new Error((await res.json()).message || 'Pincode validation failed');
    return res.json();
  },

  // 3. Delivery Slots
  async getSlots(date) {
    const res = await fetch(`${API_BASE}/delivery-slots?date=${encodeURIComponent(date)}`);
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to fetch delivery slots');
    return res.json();
  },

  // 4. Quotation (Server-authoritative in paise)
  async calculateQuote(payload) {
    const res = await fetch(`${API_BASE}/checkout/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Quotation calculation failed');
    return res.json();
  },

  // 5. Place Order
  async placeOrder(payload, idempotencyKey) {
    const headers = { 'Content-Type': 'application/json' };
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

    const res = await fetch(`${API_BASE}/checkout/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to place order');
    return res.json();
  },

  // 6. Payment Verification
  async verifyPayment(payload) {
    const res = await fetch(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Payment verification failed');
    return res.json();
  },

  // 7. Track Order (Pollable with OTP display)
  async trackOrder(token) {
    const res = await fetch(`${API_BASE}/orders/track/${encodeURIComponent(token)}`);
    if (!res.ok) throw new Error((await res.json()).message || 'Order tracking not found');
    return res.json();
  },

  // 8. Admin Operations
  async getAdminOrders(status) {
    const url = status ? `${API_BASE}/admin/orders?status=${status}` : `${API_BASE}/admin/orders`;
    const res = await fetch(url, {
      headers: { 'X-Simulated-Role': 'ADMIN' },
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to fetch admin orders');
    return res.json();
  },

  async updateOrderStatus(orderId, status, reason) {
    const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Simulated-Role': 'ADMIN' },
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to update order status');
    return res.json();
  },

  async overrideDelivery(orderId, reason) {
    const res = await fetch(`${API_BASE}/admin/orders/${orderId}/override-delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Simulated-Role': 'ADMIN' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Override failed');
    return res.json();
  },
};

// Local Cart Management
export const cart = {
  get() {
    try {
      return JSON.parse(localStorage.getItem('jankirasoi_cart') || '[]');
    } catch {
      return [];
    }
  },
  save(items) {
    localStorage.setItem('jankirasoi_cart', JSON.stringify(items));
    window.dispatchEvent(new Event('cart-updated'));
  },
  add(item) {
    const items = this.get();
    const existing = items.find((i) => i.productId === item.productId && i.variantId === item.variantId);
    if (existing) {
      existing.quantity += item.quantity || 1;
    } else {
      items.push({
        productId: item.productId,
        name: item.name,
        pricePaise: item.pricePaise,
        variantId: item.variantId,
        variantName: item.variantName,
        imageUrl: item.imageUrl,
        quantity: item.quantity || 1,
        selectedAddonOptionIds: item.selectedAddonOptionIds || [],
      });
    }
    this.save(items);
  },
  updateQty(index, delta) {
    const items = this.get();
    if (items[index]) {
      items[index].quantity += delta;
      if (items[index].quantity <= 0) {
        items.splice(index, 1);
      }
      this.save(items);
    }
  },
  clear() {
    localStorage.removeItem('jankirasoi_cart');
    window.dispatchEvent(new Event('cart-updated'));
  },
  count() {
    return this.get().reduce((sum, item) => sum + item.quantity, 0);
  },
};

export function showToast(message, isError = false) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-all transform pointer-events-none duration-300 opacity-0';
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.className = `fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-semibold shadow-xl transition-all transform pointer-events-none duration-300 opacity-100 ${
    isError ? 'bg-red-600 text-white' : 'bg-green-700 text-white'
  }`;
  setTimeout(() => {
    toast.className = toast.className.replace('opacity-100', 'opacity-0');
  }, 2500);
}
