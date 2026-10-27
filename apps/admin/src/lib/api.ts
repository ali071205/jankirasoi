// Janki Rasoi — Authoritative Admin & Kitchen KDS API Client

export interface AdminOrderItem {
  id?: string;
  productId: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPricePaise?: number;
  totalPricePaise?: number;
  addons?: { id: string; name: string; pricePaise: number }[];
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
  deliveryNotes?: string | null;
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
    const raw =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.API_INTERNAL_URL ||
      'http://127.0.0.1:3000';
    const cleanBase = raw.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
    return `${cleanBase}/api/v1`;
  }
  return '/api/v1';
};

function notifyMenuChange() {
  if (typeof window !== 'undefined') {
    try {
      const channel = new BroadcastChannel('jankirasoi_menu_channel');
      channel.postMessage({ type: 'MENU_UPDATED', timestamp: Date.now() });
      channel.close();
    } catch {}
    try {
      localStorage.setItem('jr_menu_timestamp', String(Date.now()));
    } catch {}
  }
}

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

  // 3b. Assign Rider
  async assignRider(orderId: string, riderId: string) {
    const base = getApiBase();
    const res = await fetch(`${base}/admin/orders/${encodeURIComponent(orderId)}/assign-rider`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Simulated-Role': 'STAFF',
      },
      body: JSON.stringify({ riderId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to assign rider');
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

  // 8. Live Menu & Inventory Inspection
  async getCatalog(): Promise<any> {
    const base = getApiBase();
    const res = await fetch(`${base}/catalog`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch catalog');
    return res.json();
  },

  // 9. Live 86 / Sold Out Toggle
  async toggleDishSoldOut(productId: string, serviceDate: string, isSoldOut: boolean) {
    const base = getApiBase();
    const res = await fetch(`${base}/catalog/${encodeURIComponent(productId)}/sold-out`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Simulated-Role': 'STAFF',
      },
      body: JSON.stringify({ serviceDate, isSoldOut }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to toggle item availability');
    }
    const data = await res.json();
    notifyMenuChange();
    return data;
  },

  // 10. Create New Dish / Thali
  async createDish(data: {
    categoryId: string;
    name: string;
    description?: string;
    basePricePaise: number;
    imageUrl?: string;
    dietaryType?: string;
  }) {
    const base = getApiBase();
    const res = await fetch(`${base}/admin/catalog/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Simulated-Role': 'STAFF',
      },
      body: JSON.stringify({
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        dietaryType: data.dietaryType || 'VEG',
        imageUrl: data.imageUrl,
        basePricePaise: data.basePricePaise,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create new dish');
    }
    const created = await res.json();
    notifyMenuChange();
    return created;
  },

  // 11. Update Existing Dish / Thali
  async updateDish(
    productId: string,
    data: {
      categoryId?: string;
      name?: string;
      description?: string;
      basePricePaise?: number;
      imageUrl?: string;
      dietaryType?: string;
    },
  ) {
    const base = getApiBase();
    const res = await fetch(`${base}/admin/catalog/products/${encodeURIComponent(productId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Simulated-Role': 'STAFF',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update dish');
    }
    const updated = await res.json();
    notifyMenuChange();
    return updated;
  },

  // 12. Delete / Archive Dish
  async deleteDish(productId: string) {
    const base = getApiBase();
    const res = await fetch(`${base}/admin/catalog/products/${encodeURIComponent(productId)}`, {
      method: 'DELETE',
      headers: {
        'X-Simulated-Role': 'STAFF',
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to remove dish');
    }
    const deleted = await res.json();
    notifyMenuChange();
    return deleted;
  },

  // 11. Fetch Active Delivery Zones
  async getDeliveryZones() {
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/delivery-zones`);
      if (res.ok) return res.json();
    } catch {
      // fallback
    }
    return [
      { id: 'sagore-454774', name: 'Sagore / Pithampur - Main Kitchen Zone', pincode: '454774', minOrderPaise: 0, deliveryFeePaise: 0, isActive: true },
      { id: '1', name: 'South Delhi - Malviya Nagar & Saket', pincode: '110017', minOrderPaise: 9900, deliveryFeePaise: 3000, isActive: true },
    ];
  },

  // 12. Upload Food Image to Cloudinary via backend-signed signature
  async uploadFoodImage(file: File): Promise<string> {
    const base = getApiBase();
    const sigRes = await fetch(`${base}/admin/uploads/signature?folder=jankirasoi/menu`, {
      headers: {
        'X-Simulated-Role': 'STAFF',
      },
    });
    if (!sigRes.ok) {
      const err = await sigRes.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to get upload signature');
    }
    const { apiKey, timestamp, folder, signature, uploadUrl } = await sigRes.json();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('folder', folder);
    formData.append('signature', signature);

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to upload food image');
    }
    const uploadData = await uploadRes.json();
    let url = uploadData.secure_url || uploadData.url;
    // Automatically apply Cloudinary lossless compression & smart format conversion (WebP/AVIF)
    if (url && url.includes('cloudinary.com') && url.includes('/upload/') && !url.includes('/f_auto')) {
      url = url.replace('/upload/', '/upload/f_auto,q_auto,w_1200,c_limit/');
    }
    return url;
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
