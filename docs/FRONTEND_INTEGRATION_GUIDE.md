# Frontend Integration & Developer Guide — Janki Rasoi

**Audience:** Frontend Development Team  
**Stack:** Next.js 15+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, Radix UI primitives, Lucide Icons, React Hook Form, Zod.

---

## 1. Monorepo Route Organization

The frontend codebase is hosted in `apps/web` within a single Next.js project utilizing **Route Groups** to strictly separate layouts, stylesheets, and auth guards across the three portals:

```text
apps/web/src/app/
├── (store)/                 # Customer Storefront (Public & Guest Friendly)
│   ├── layout.tsx           # Store header, bottom navigation for mobile, cart drawer
│   ├── page.tsx             # Branded landing page + featured daily tiffins
│   ├── menu/page.tsx        # Interactive categorized menu, diet filters (Veg/Jain)
│   ├── cart/page.tsx        # Cart review, slot selector, pincode check
│   ├── checkout/page.tsx    # Customer details, delivery address, payment method
│   └── orders/track/[token]/page.tsx # Secure tokenized order tracking timeline
│
├── (admin)/                 # Kitchen Management & Admin Panel
│   ├── layout.tsx           # Dashboard layout: Sidebar, notification bell, user profile
│   ├── admin/
│   │   ├── login/page.tsx   # Admin credentials login
│   │   ├── orders/page.tsx  # Live Kitchen Kanban KDS Board (5-10s polling)
│   │   ├── menu/page.tsx    # Catalog management, prices, sold-out toggles
│   │   ├── slots/page.tsx   # Capacity planning and date-slot overrides
│   │   ├── riders/page.tsx  # Rider directory and assignment history
│   │   └── audit/page.tsx   # Append-only security and operational audit logs
│
├── (rider)/                 # Mobile-First Rider Web App (PWA Optimized)
│   ├── layout.tsx           # Mobile shell, high-contrast theme, safe-area-inset
│   ├── rider/
│   │   ├── login/page.tsx   # Phone & password rider sign-in
│   │   ├── page.tsx         # Active assigned delivery cards
│   │   └── deliveries/[id]/page.tsx # Handover screen: Navigation link, call, OTP entry
│
└── api/                     # Optional Next.js internal edge routes (if needed for rewrites)
```

---

## 2. Shared Form Handling & Zod Schemas

All form submissions in the frontend must be validated on the client side using **Zod** matching the backend NestJS DTO specifications:

### 2.1. Checkout Form Schema Example (`checkout.schema.ts`)

```typescript
import { z } from 'zod';

export const DeliveryAddressSchema = z.object({
  flat: z.string().min(2, 'Flat/House number is required'),
  street: z.string().min(5, 'Street / Area name is required'),
  landmark: z.string().optional(),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit Indian PIN code'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const CheckoutFormSchema = z.object({
  customerName: z.string().min(2, 'Please enter your full name'),
  customerPhone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  customerEmail: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a valid delivery date'),
  deliverySlotId: z.string().uuid('Please select a delivery slot'),
  deliveryAddress: DeliveryAddressSchema,
  deliveryNotes: z.string().max(250).optional(),
  paymentMethod: z.enum(['RAZORPAY', 'COD']),
});

export type CheckoutFormValues = z.infer<typeof CheckoutFormSchema>;
```

---

## 3. Razorpay Standard Checkout SDK Integration

For online payments, use the official Razorpay Standard Checkout JavaScript SDK.

### Step 1: Script Loading Helper (`useRazorpay.ts`)

```typescript
'use client';

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
```

### Step 2: Payment Execution Flow in Checkout Component

```typescript
import { loadRazorpayScript } from '@/lib/payment/useRazorpay';

async function handleRazorpayPayment(orderResponse: any) {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    alert('Failed to load payment gateway. Please check your internet connection.');
    return;
  }

  const options = {
    key: orderResponse.payment.razorpayKeyId,
    amount: orderResponse.payment.amountPaise,
    currency: 'INR',
    name: 'Janki Rasoi',
    description: `Order #${orderResponse.orderNumber}`,
    image: '/brand/logo.png',
    order_id: orderResponse.payment.razorpayOrderId,
    handler: async function (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) {
      // 1. Submit tokens to authoritative backend verification endpoint
      try {
        const verifyRes = await fetch('/api/v1/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderResponse.orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          }),
        });

        if (verifyRes.ok) {
          // 2. Redirect to tokenized tracking page
          window.location.href = `/orders/track/${orderResponse.trackingToken}`;
        } else {
          alert('Payment verification failed. Please contact support if debited.');
        }
      } catch (err) {
        console.error('Verification network error', err);
      }
    },
    prefill: {
      name: orderResponse.customerName,
      contact: orderResponse.customerPhone,
      email: orderResponse.customerEmail || '',
    },
    theme: {
      color: '#EA580C', // Warm Spice Orange
    },
  };

  const paymentObject = new (window as any).Razorpay(options);
  paymentObject.open();
}
```

---

## 4. Live Polling Strategy (Tracking & Kitchen KDS)

Per architecture baseline, v1 utilizes **5–10 second polling** rather than WebSockets. To preserve mobile battery and avoid unnecessary server load, implement visibility-aware polling:

```typescript
'use client';

import { useEffect, useState } from 'react';

export function useOrderTracking(trackingToken: string) {
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchOrder = async () => {
      // Do not poll if browser tab is in background
      if (document.visibilityState !== 'visible') return;

      try {
        const res = await fetch(`/api/v1/orders/track/${trackingToken}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);

          // Stop polling once order is finalized
          if (data.status === 'DELIVERED' || data.status === 'CANCELLED') {
            clearInterval(intervalId);
          }
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    };

    fetchOrder();
    intervalId = setInterval(fetchOrder, 7000); // Poll every 7 seconds

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchOrder();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [trackingToken]);

  return { order };
}
```

---

## 5. Rider Mobile Web Guidelines

The Rider interface will be accessed from delivery drivers' smartphones under outdoor sunlight and one-handed operation:

1. **Touch Targets:** All primary buttons (`Call Customer`, `Open Maps`, `Start Delivery`, `Submit OTP`) must be at least **48px tall** with minimum 8px padding.
2. **Deep Links:**
   - **Phone Call:** `<a href="tel:+919876543210">Call Customer</a>`
   - **Google Maps Navigation:** `<a href="https://www.google.com/maps/dir/?api=1&destination=LAT,LNG" target="_blank">Navigate</a>`
3. **6-Digit OTP Auto-Advancing Input:**
   - Input fields must use `type="tel"` or `inputmode="numeric"` to trigger the smartphone number pad automatically.
   - Automatically shift focus to the next input upon digit entry.
   - Provide a large "Confirm Delivery" button that only activates when all 6 digits are populated.
4. **Offline / Slow Network Graceful Feedback:** Show an unmistakable loading indicator on button click and disable double-tapping to prevent duplicate submissions.

---

## 6. Mock Data & Parallel Development Guide

The frontend team does not need to wait for backend deployment. You can mock all responses locally using Mock Service Worker (MSW) or by loading local JSON fixtures based on the contracts documented in [`docs/API_CONTRACTS_AND_SPECIFICATIONS.md`](file:///home/unshakensoul/jankirasoi/docs/API_CONTRACTS_AND_SPECIFICATIONS.md).
