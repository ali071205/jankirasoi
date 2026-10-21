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
  createdAt: string;
  updatedAt: string;
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

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_INTERNAL_API_URL || 'http://localhost:3000/api/v1';
  }
  return '/api/v1';
};

export const api = {
  // 1. Live Catalog
  async getCatalog(serviceDate?: string): Promise<CatalogResponse> {
    const base = getApiBase();
    const url = serviceDate ? `${base}/catalog?service_date=${encodeURIComponent(serviceDate)}` : `${base}/catalog`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch catalog from live kitchen backend');
    }
    return res.json();
  },

  // 2. Delivery Zones
  async checkPincode(pincode: string): Promise<PincodeCheckResponse> {
    const base = getApiBase();
    const res = await fetch(`${base}/delivery-zones/check?pincode=${encodeURIComponent(pincode)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to verify delivery zone');
    }
    return res.json();
  },

  // 3. Delivery Slots
  async getSlots(date: string): Promise<SlotsResponse> {
    const base = getApiBase();
    const res = await fetch(`${base}/delivery-slots?date=${encodeURIComponent(date)}`, { cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch delivery slots');
    }
    return res.json();
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
      headers: { 'X-Simulated-Role': 'STAFF' },
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
        'X-Simulated-Role': 'STAFF',
      },
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
        'X-Simulated-Role': 'STAFF',
      },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to perform manual override');
    }
    return res.json();
  },
};
