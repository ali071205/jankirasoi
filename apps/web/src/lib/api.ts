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
    return process.env.NEXT_PUBLIC_INTERNAL_API_URL || 'http://localhost:3000/api/v1';
  }
  return '/api/v1';
};

export const FALLBACK_CATALOG: CatalogResponse = {
  serviceDate: new Date().toISOString().split('T')[0],
  categories: [
    {
      id: 'cat-thalis',
      name: 'Homestyle Thalis',
      slug: 'homestyle-thalis',
      displayOrder: 1,
      items: [
        {
          id: '09f67dad-2306-49b7-88c7-cae050592f14',
          name: 'Janaki Special Full Thali',
          slug: 'janaki-special-full-thali',
          description: '4 Soft Rotis, 1 Paneer Sabzi, 1 Seasonal Sabzi, Dal Tadka, Jeera Rice, Curd & Sweet.',
          dietaryType: 'VEG',
          imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDS9UZxeQL2XEwyu0K3PCfLt6xcAGFdQTQk0Ms6V2E_dNfemHxFYbIONpeD6RzRRoWWDyO18R_xwGBdtSE7xBHjmyObtY6kkODeMHHLUBjBohji3E4P1D7CsA6o0vz6TtyD5iFo0-ftcqqVkGA5aPZ6gqonSl0tiLeWavjPSF7RoRAjy-R35op1kvBkcA6DHoxU8eSbBL0OcSYbkU4Gi0pIkUstEckNKwAK8RsxyMFSxFnUKcwd2Fok',
          basePricePaise: 18000,
          taxRatePercent: 5,
          isSoldOut: false,
          variants: [
            { id: 'd897e546-e669-4f5f-8f98-dd2db0308313', name: 'Full Thali (Standard)', priceModifierPaise: 0, isDefault: true },
            { id: 'var-royal', name: 'Royal Portion (+Extra Sweet)', priceModifierPaise: 3500, isDefault: false },
          ],
          addonGroups: [],
        },
        {
          id: 'cd02708b-cf9d-460a-878d-3597115602b7',
          name: 'Regular Home Thali',
          slug: 'regular-home-thali',
          description: '4 Rotis, Seasonal Veg Sabzi, Dal Fry, Steamed Rice, Pickle & Salad.',
          dietaryType: 'VEG',
          imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTHONkUFMlDOhbV8ZAksbZ3MFW81rMV0imOKG7b6sJsRN2StBpZW54kblxWOMQylv1X4vOJzgSkTy4gM3Z1ypQAk3U9TjdYZiZpd2e4RLirD0HL58J8DokQiAG_gm6CX5lrfbRwel5UXuvUoP3AD4f9T_s8Buuq22rghfLWtl-gHYATlEEnfvUW1xXaDUHTd2ri-3nRNvGFfssW_Zka0tU0w_egIYYxQTa--nhGHmHOM0tD0QbDU9C',
          basePricePaise: 13000,
          taxRatePercent: 5,
          isSoldOut: false,
          variants: [
            { id: '7ee248f8-545a-46ba-b790-03a4e79cde96', name: 'Standard Thali', priceModifierPaise: 0, isDefault: true },
          ],
          addonGroups: [],
        },
        {
          id: 'dal-bati-thali-01',
          name: 'Dal Bati Churma Thali',
          slug: 'dal-bati-thali',
          description: '2 Ghee Baati, Panchmel Daal, Red Rajasthani Lahsun Chutney, Salad & Gulab Jamun Sweet.',
          dietaryType: 'VEG',
          imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
          basePricePaise: 26500,
          taxRatePercent: 5,
          isSoldOut: false,
          variants: [
            { id: 'db-var-std', name: 'Standard Portion', priceModifierPaise: 0, isDefault: true },
            { id: 'db-var-extra', name: 'Extra Baati (+2 Pcs)', priceModifierPaise: 5000, isDefault: false },
          ],
          addonGroups: [],
        },
      ],
    },
    {
      id: 'cat-combos',
      name: 'Roti & Rice Combos',
      slug: 'roti-rice-combos',
      displayOrder: 2,
      items: [
        {
          id: 'a1c1e8ff-8f9e-4a82-98f3-876bd6f9e0f3',
          name: 'Roti & Sabzi Duo',
          slug: 'roti-sabzi-duo',
          description: '4 Phulkas with spiced, fresh cottage cheese Paneer Bhurji & pickled salad.',
          dietaryType: 'VEG',
          imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7FyfUzzLfU1zFeV9Kj0MuGwv3uOnBcOQnd59q3rdLwp86vcmEMSGNPqMzXfDxESKSt57aby9gMNqThGtOkZzquiH8qAUb7Q4LWqTabE2_IWIAegP4TTTbmASnzNA2PcgQXre_ZQX-PJSiJaIgicviQpj0iPuITd_o1l0YYcymiDaTeFNel4PUpcf2khbY4suRtZ6_PBLoP87PJ02DZFeDKOYWiT7pAPJI2hs4AakxWt8Ry9pUsjMS',
          basePricePaise: 9500,
          taxRatePercent: 5,
          isSoldOut: false,
          variants: [
            { id: 'var-4phulka', name: '4 Phulkas + Bhurji', priceModifierPaise: 0, isDefault: true },
            { id: 'var-6phulka', name: '6 Phulkas + Bhurji', priceModifierPaise: 3000, isDefault: false },
          ],
          addonGroups: [],
        },
        {
          id: 'moong-khichdi-bowl',
          name: 'Moong Dal Khichdi Bowl',
          slug: 'moong-dal-khichdi',
          description: 'Soothing yellow moong daal & rice khichdi tempered with cumin, pure cow ghee & curd.',
          dietaryType: 'VEG',
          imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
          basePricePaise: 11000,
          taxRatePercent: 5,
          isSoldOut: false,
          variants: [
            { id: 'kh-var-std', name: 'Regular Bowl (500ml)', priceModifierPaise: 0, isDefault: true },
          ],
          addonGroups: [],
        },
      ],
    },
  ],
};

// In api client:
export const api = {
  // Synchronous cache accessors for zero-flicker instant hydration
  getCachedCatalog(serviceDate?: string): CatalogResponse | null {
    return getCached<CatalogResponse>(`catalog_${serviceDate || 'today'}`) || FALLBACK_CATALOG;
  },

  getCachedSlots(date?: string): SlotsResponse | null {
    const d = date || (typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : '');
    return getCached<SlotsResponse>(`slots_${d}`);
  },

  getCachedPincode(pincode: string): PincodeCheckResponse | null {
    return getCached<PincodeCheckResponse>(`pin_${pincode}`);
  },

  // 1. Live Catalog with 3-minute Client Cache & Resilient Fallback
  async getCatalog(serviceDate?: string, forceRefresh = false): Promise<CatalogResponse> {
    const cacheKey = `catalog_${serviceDate || 'today'}`;
    if (!forceRefresh) {
      const cached = getCached<CatalogResponse>(cacheKey);
      if (cached) return cached;
    }

    try {
      const base = getApiBase();
      const url = serviceDate ? `${base}/catalog?service_date=${encodeURIComponent(serviceDate)}` : `${base}/catalog`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data?.categories?.length) {
          return setCached(cacheKey, data, 180000); // 3 minutes cache
        }
      }
    } catch {
      // Backend not running on local/remote port, seamlessly use fallback
    }

    return setCached(cacheKey, FALLBACK_CATALOG, 180000);
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
