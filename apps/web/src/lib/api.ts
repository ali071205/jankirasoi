// Janki Rasoi — Authoritative API Client & Type Definitions

export interface PortionVariant {
  id: string;
  name: string;
  priceModifierPaise: number;
  isDefault: boolean;
}

export interface AddonOption {
  id: string;
  name: string;
  pricePaise: number;
}

export interface AddonGroup {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  options: AddonOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  dietaryType: 'VEG' | 'NON_VEG';
  imageUrl?: string;
  basePricePaise: number;
  taxRatePercent: number;
  isSoldOut: boolean;
  variants: PortionVariant[];
  addonGroups: AddonGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  items: MenuItem[];
}

export interface CatalogResponse {
  serviceDate: string;
  categories: MenuCategory[];
}

export interface DeliverySlot {
  id: string;
  mealType: 'LUNCH' | 'DINNER';
  label: string;
  startTime: string;
  endTime: string;
  cutoffTime: string;
  isAvailable: boolean;
  remainingCapacity: number;
}

export interface SlotsResponse {
  date: string;
  slots: DeliverySlot[];
}

export interface PincodeCheckResponse {
  serviceable: boolean;
  pincode: string;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  zoneName?: string;
  deliveryFeePaise?: number;
  freeDeliveryThresholdPaise?: number;
  message?: string;
}

export interface QuoteRequestItem {
  productId: string;
  variantId?: string;
  quantity: number;
  selectedAddonOptionIds?: string[];
}

export interface QuoteRequest {
  serviceDate: string;
  deliverySlotId: string;
  pincode: string;
  items: QuoteRequestItem[];
}

export interface QuoteResponse {
  quoteToken: string;
  expiresAt: string;
  serviceDate: string;
  slotLabel: string;
  subtotalPaise: number;
  packagingFeePaise: number;
  deliveryFeePaise: number;
  taxPaise: number;
  totalPaise: number;
  formattedTotal: string;
  items: Array<{
    productId: string;
    productName: string;
    variantName?: string;
    quantity: number;
    unitPricePaise: number;
    lineTotalPaise: number;
  }>;
}

export interface PlaceOrderPayload {
  quoteToken: string;
  paymentMethod: 'COD' | 'RAZORPAY';
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: {
    flat: string;
    street: string;
    landmark?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  deliveryNotes?: string;
}

export interface PlaceOrderResponse {
  orderId: string;
  orderNumber: string;
  trackingToken: string;
  status: string;
  totalAmountPaise: number;
  paymentMethod: string;
  razorpayOrderId?: string;
  razorpayKeyId?: string;
  currency: string;
}

export interface TrackOrderResponse {
  orderNumber: string;
  status: 'PENDING_PAYMENT' | 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  paymentMethod?: string;
  paymentStatus?: string;
  serviceDate: string;
  deliverySlot: string;
  totalAmountPaise: number;
  items: Array<{
    name: string;
    variant?: string;
    quantity: number;
  }>;
  deliveryOtp?: string; // Zero-cost in-app verbal handover PIN when OUT_FOR_DELIVERY
  riderName?: string;
  riderPhone?: string;
  customerName?: string;
  deliveryAddress?: {
    flat?: string;
    street?: string;
    landmark?: string;
    pincode?: string;
  };
  deliveryNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: {
    flat: string;
    street: string;
    landmark?: string;
    pincode: string;
  } | string;
  slotLabel: string;
  totalAmountPaise: number;
  paymentMethod: string;
  paymentStatus: string;
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

export interface RiderDelivery {
  orderId: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  landmark?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  navigationUrl: string;
  slotLabel: string;
  paymentMethod: string;
  cashDuePaise: number;
  itemsSummary: string;
}

export const DEFAULT_FOOD_IMAGE = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80';

// In-memory + SessionStorage cache for instant zero-latency client transitions without re-fetching
const memoryCache = new Map<string, { data: any; expiry: number }>();

function getCached<T>(key: string): T | null {
  const item = memoryCache.get(key);
  if (item) {
    if (Date.now() <= item.expiry) {
      return item.data as T;
    }
    memoryCache.delete(key);
  }

  // Cross-refresh fallback from sessionStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = window.sessionStorage.getItem(`jr_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() <= parsed.expiry) {
          memoryCache.set(key, parsed);
          return parsed.data as T;
        } else {
          window.sessionStorage.removeItem(`jr_cache_${key}`);
        }
      }
    } catch {
      // Ignore sessionStorage issues
    }
  }

  return null;
}

function setCached<T>(key: string, data: T, ttlMs = 180000): T {
  const expiry = Date.now() + ttlMs;
  memoryCache.set(key, { data, expiry });
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(`jr_cache_${key}`, JSON.stringify({ data, expiry }));
    } catch {
      // Ignore quota issues
    }
  }
  return data;
}

const getApiBase = () => {
  if (typeof window === 'undefined') {
    const raw =
      process.env.NEXT_PUBLIC_INTERNAL_API_URL ||
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3000';
    const cleanBase = raw.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
    return `${cleanBase}/api/v1`;
  }
  return '/api/v1';
};

export const api = {
  // Synchronous cache accessors for zero-flicker instant hydration
  getCachedCatalog(serviceDate?: string): CatalogResponse | null {
    return getCached<CatalogResponse>(`catalog_${serviceDate || 'today'}`);
  },

  getCachedSlots(date?: string): SlotsResponse | null {
    const d = date || (typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : '');
    return getCached<SlotsResponse>(`slots_${d}`);
  },

  getCachedPincode(pincode: string): PincodeCheckResponse | null {
    return getCached<PincodeCheckResponse>(`pin_${pincode}`);
  },

  // 1. Live Catalog with 3-minute Client Cache
  async getCatalog(serviceDate?: string, forceRefresh = false): Promise<CatalogResponse> {
    const cacheKey = `catalog_${serviceDate || 'today'}`;
    if (!forceRefresh) {
      const cached = getCached<CatalogResponse>(cacheKey);
      if (cached) return cached;
    }
    const base = getApiBase();
    const url = serviceDate ? `${base}/catalog?service_date=${encodeURIComponent(serviceDate)}` : `${base}/catalog`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch catalog from live kitchen backend');
    }
    const data = await res.json();
    return setCached(cacheKey, data, 180000); // 3 minutes cache
  },

  // 2. Delivery Zones with 5-minute Cache
  async checkPincode(pincode: string): Promise<PincodeCheckResponse> {
    const cacheKey = `pin_${pincode}`;
    const cached = getCached<PincodeCheckResponse>(cacheKey);
    if (cached) return cached;

    const base = getApiBase();
    const res = await fetch(`${base}/delivery-zones/check?pincode=${encodeURIComponent(pincode)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to verify delivery zone');
    }
    const data = await res.json();
    return setCached(cacheKey, data, 300000);
  },

  // 3. Delivery Slots with 1-minute Cache
  async getSlots(date: string, forceRefresh = false): Promise<SlotsResponse> {
    const cacheKey = `slots_${date}`;
    if (!forceRefresh) {
      const cached = getCached<SlotsResponse>(cacheKey);
      if (cached) return cached;
    }

    const base = getApiBase();
    const res = await fetch(`${base}/delivery-slots?date=${encodeURIComponent(date)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch delivery slots');
    }
    const data = await res.json();
    return setCached(cacheKey, data, 60000);
  },

  // 4. Server-Authoritative Quotation (in paise)
  async calculateQuote(payload: QuoteRequest): Promise<QuoteResponse> {
    const base = getApiBase();
    const res = await fetch(`${base}/checkout/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to compute authoritative quote');
    }
    return res.json();
  },

  // 5. Place Order (Atomic Transaction)
  async placeOrder(payload: PlaceOrderPayload, idempotencyKey?: string): Promise<PlaceOrderResponse> {
    const base = getApiBase();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

    const res = await fetch(`${base}/checkout/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to place meal order');
    }
    return res.json();
  },

  // 6. Track Order (Real-time with in-app OTP)
  async trackOrder(token: string): Promise<TrackOrderResponse> {
    const base = getApiBase();
    const res = await fetch(`${base}/orders/track/${encodeURIComponent(token)}`, { cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Tracking token not found or expired');
    }
    return res.json();
  },

  // 7. Kitchen KDS Admin Orders
  async getAdminOrders(): Promise<AdminOrdersResponse> {
    const base = getApiBase();
    const res = await fetch(`${base}/admin/orders?limit=50`, {
      // FIX #12: Removed hardcoded X-Simulated-Role header. Admin access now requires a
      // real session cookie set by loginAdmin(). The bypass is handled server-side only
      // when ALLOW_SIMULATED_ROLE=true is explicitly set in non-production environments.
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch kitchen orders queue');
    }
    return res.json();
  },

  // 8. Admin Status Transition
  async updateOrderStatus(orderId: string, status: string, reason?: string) {
    const base = getApiBase();
    const res = await fetch(`${base}/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        // FIX #12: Removed hardcoded X-Simulated-Role header
      },
      credentials: 'include',
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to transition order status');
    }
    return res.json();
  },

  // 9. Manual Delivery Override
  async overrideDelivery(orderId: string, reason: string) {
    const base = getApiBase();
    const res = await fetch(`${base}/admin/orders/${encodeURIComponent(orderId)}/override-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // FIX #12: Removed hardcoded X-Simulated-Role header
      },
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to perform manual override');
    }
    return res.json();
  },

  // 10. Rider Deliveries Queue
  async getRiderDeliveries(signal?: AbortSignal): Promise<{ deliveries: RiderDelivery[] }> {
    const base = getApiBase();
    const res = await fetch(`${base}/rider/deliveries`, {
      // FIX #12: Removed hardcoded X-Simulated-Role header — rider must use real session
      credentials: 'include',
      cache: 'no-store',
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch assigned rider deliveries');
    }
    return res.json();
  },

  // 11. Rider Mark Out for Delivery (generates customer PIN)
  async markRiderOutForDelivery(orderId: string) {
    const base = getApiBase();
    const res = await fetch(`${base}/rider/deliveries/${encodeURIComponent(orderId)}/out-for-delivery`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        // FIX #12: Removed hardcoded X-Simulated-Role header
      },
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to start delivery trip');
    }
    return res.json();
  },

  // 12. Rider Verify Delivery OTP PIN
  async verifyRiderDeliveryOtp(orderId: string, code: string) {
    const base = getApiBase();
    const res = await fetch(`${base}/rider/deliveries/${encodeURIComponent(orderId)}/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // FIX #12: Removed hardcoded X-Simulated-Role header
      },
      credentials: 'include',
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'PIN verification failed');
    }
    return res.json();
  },

  // 13. Customer Phone Login / Registration
  async loginCustomer(phone: string, name?: string, address?: any): Promise<AuthSessionResponse> {
    const base = getApiBase();
    const res = await fetch(`${base}/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, name, address }),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Login failed. Please check phone number.');
    }
    const data: AuthSessionResponse = await res.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem('jr_session_token', data.sessionToken);
      localStorage.setItem('jr_user_profile', JSON.stringify(data.user));
    }
    return data;
  },

  // 14. Rider Login
  async loginRider(phone: string, password: string): Promise<AuthSessionResponse> {
    const base = getApiBase();
    const res = await fetch(`${base}/rider/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Rider login failed.');
    }
    const data: AuthSessionResponse = await res.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem('jr_rider_token', data.sessionToken);
      localStorage.setItem('jr_rider_profile', JSON.stringify(data.user));
    }
    return data;
  },

  // 15. Get Current User Profile (Customer / Rider)
  async getCurrentUser(): Promise<UserProfile | null> {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('jr_session_token') || localStorage.getItem('jr_rider_token');
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/auth/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          localStorage.setItem('jr_user_profile', JSON.stringify(data.user));
          return data.user;
        }
      }
    } catch {
      // Fallback
    }
    const cached = localStorage.getItem('jr_user_profile');
    if (cached) {
      try { return JSON.parse(cached); } catch { return null; }
    }
    return null;
  },

  // 16. Logout
  async logout(): Promise<void> {
    const base = getApiBase();
    const token = typeof window !== 'undefined' ? (localStorage.getItem('jr_session_token') || localStorage.getItem('jr_rider_token')) : null;
    try {
      await fetch(`${base}/auth/logout`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jr_session_token');
      localStorage.removeItem('jr_user_profile');
      localStorage.removeItem('jr_rider_token');
      localStorage.removeItem('jr_rider_profile');
    }
  },
};

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: 'CUSTOMER' | 'RIDER' | 'ADMIN' | 'STAFF';
  savedAddress?: {
    flat?: string;
    street?: string;
    landmark?: string;
    pincode?: string;
  } | null;
  orderCount?: number;
  recentOrders?: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmountPaise: number;
    deliveryAddress: any;
    trackingToken: string;
    createdAt: string;
  }>;
  riderProfile?: {
    id: string;
    vehicleNumber: string;
    isAvailable: boolean;
  } | null;
}

export interface AuthSessionResponse {
  user: UserProfile;
  sessionToken: string;
  expiresAt: string;
}
