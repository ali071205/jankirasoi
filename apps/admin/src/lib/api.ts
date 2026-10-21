// Janki Rasoi — Authoritative Admin & Kitchen KDS API Client

export interface AdminOrderItem {
  productId: string;
  productName: string;
  variantName?: string;
  quantity: number;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: 'PENDING_PAYMENT' | 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: string;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: {
    flat?: string;
    street?: string;
    pincode?: string;
    landmark?: string;
  } | string;
  slotLabel: string;
  totalAmountPaise: number;
  assignedRider?: {
    name: string;
    phone: string;
  } | null;
  itemsCount: number;
  items?: AdminOrderItem[];
  createdAt: string;
}

export interface AdminOrdersResponse {
  orders: AdminOrder[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_INTERNAL_URL || 'http://127.0.0.1:3000/api/v1';
  }
  return '/api/v1';
};

export const adminApi = {
  // 1. Fetch Orders Queue with Status Filter
  async getOrders(status?: string): Promise<AdminOrdersResponse> {
    const base = getApiBase();
    const query = status ? `?status=${encodeURIComponent(status)}&limit=100` : '?limit=100';
    const res = await fetch(`${base}/admin/orders${query}`, {
      headers: {
        'X-Simulated-Role': 'STAFF',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch kitchen orders queue');
    }
    return res.json();
  },

  // 2. Kitchen Order Status Transition (ACCEPTED, PREPARING, READY_FOR_PICKUP, CANCELLED)
  async updateOrderStatus(orderId: string, status: string, reason = 'Kitchen Console Action') {
    const base = getApiBase();
    const res = await fetch(`${base}/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Simulated-Role': 'STAFF',
      },
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update order status');
    }
    return res.json();
  },

  // 3. Manual PIN Delivery Override (Audit Logged)
  async overrideDelivery(orderId: string, reason: string) {
    const base = getApiBase();
    const res = await fetch(`${base}/admin/orders/${encodeURIComponent(orderId)}/override-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Simulated-Role': 'STAFF',
      },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to execute manual delivery override');
    }
    return res.json();
  },

  // 4. Daily Slots Inspection
  async getDeliverySlots(date?: string) {
    const base = getApiBase();
    const d = date || new Date().toISOString().split('T')[0];
    const res = await fetch(`${base}/delivery-slots?date=${encodeURIComponent(d)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch slots');
    return res.json();
  },

  // 5. Admin Staff Login
  async login(email: string, password: string) {
    const base = getApiBase();
    const res = await fetch(`${base}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Invalid staff credentials');
    }
    return res.json();
  },

  // 6. Manage & View Customers
  async getCustomers(): Promise<{ customers: AdminCustomer[] }> {
    const base = getApiBase();
    const res = await fetch(`${base}/admin/customers`, {
      headers: { 'X-Simulated-Role': 'STAFF' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch customers list');
    return res.json();
  },

  // 7. Manage & View Delivery Riders
  async getRiders(): Promise<{ riders: AdminRider[] }> {
    const base = getApiBase();
    const res = await fetch(`${base}/admin/riders`, {
      headers: { 'X-Simulated-Role': 'STAFF' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch riders list');
    return res.json();
  },
};

export interface AdminCustomer {
  id?: string;
  name: string;
  phone: string;
  orderCount: number;
  totalSpendPaise: number;
  lastOrderDate: string;
  savedAddress?: any;
}

export interface AdminRider {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  isAvailable: boolean;
  isActive: boolean;
}
