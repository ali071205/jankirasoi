# API Contracts & REST Specifications — Janki Rasoi Platform

**Target Audience:** Frontend Development Team, Mobile Engineers, Backend API Developers  
**Base URL (Staging):** `https://api-staging.jankirasoi.in/api/v1`  
**Base URL (Local):** `http://localhost:3000/api/v1`  
**Standard Data Formats:**
- **Monetary Values:** All prices, fees, discounts, and totals are integers in **Paise** (`100 paise = ₹1.00 INR`). Never use floating-point numbers.
- **Timestamps:** ISO-8601 UTC strings (e.g., `2026-10-21T07:30:00.000Z`).
- **Identification:** UUIDv4 for resource IDs.
- **Content-Type:** `application/json; charset=utf-8`

---

## 1. Global Standards & Error Envelope

Every standard error response follows the RFC 7807 problem details specification:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Selected delivery slot has reached maximum capacity.",
  "code": "SLOT_CAPACITY_EXCEEDED",
  "timestamp": "2026-10-21T07:30:00.000Z",
  "path": "/api/v1/checkout/orders",
  "details": [
    {
      "field": "deliverySlotId",
      "issue": "Remaining capacity is 0 for date 2026-10-21"
    }
  ]
}
```

Common Business Error Codes:
- `SLOT_CAPACITY_EXCEEDED`: The requested slot has no remaining capacity.
- `ITEM_SOLD_OUT`: An item in the cart is sold out for the selected service date.
- `INVALID_PINCODE`: Delivery address pincode is outside serviceable zones.
- `INVALID_OTP`: The submitted delivery OTP is incorrect.
- `OTP_LOCKED`: Exceeded 5 attempts; OTP is disabled.
- `PAYMENT_SIGNATURE_MISMATCH`: Razorpay signature could not be verified.

---

## 2. Customer Web Storefront Endpoints

### 2.1. Get Active Catalog & Menu
Returns categories, active products, portion variants, and add-on groups.

- **Method:** `GET`
- **Path:** `/catalog`
- **Query Params:**
  - `service_date` (optional, string: `YYYY-MM-DD`): Returns availability for that specific date. Default is current date.
  - `meal_type` (optional, enum: `LUNCH` | `DINNER` | `ALL`)

**Success Response (`200 OK`):**
```json
{
  "categories": [
    {
      "id": "cat_01j9a",
      "name": "Daily Tiffin Thalis",
      "slug": "daily-tiffin-thalis",
      "displayOrder": 1,
      "items": [
        {
          "id": "prod_01j9b",
          "name": "Executive North Indian Thali",
          "description": "4 Phulkas, Paneer Butter Masala, Dal Tadka, Jeera Rice, Salad & Gulab Jamun",
          "dietaryType": "VEG",
          "imageUrl": "https://res.cloudinary.com/jankirasoi/image/upload/v1/menu/thali.jpg",
          "basePricePaise": 15900,
          "isSoldOut": false,
          "variants": [
            {
              "id": "var_01j9c",
              "name": "Standard Portion",
              "priceModifierPaise": 0,
              "isDefault": true
            },
            {
              "id": "var_01j9d",
              "name": "Deluxe Portion (+Extra Paneer & Sweet)",
              "priceModifierPaise": 4000,
              "isDefault": false
            }
          ],
          "addonGroups": [
            {
              "id": "ag_01j9e",
              "name": "Add Extras",
              "minSelections": 0,
              "maxSelections": 3,
              "options": [
                {
                  "id": "ao_01j9f",
                  "name": "Extra Phulka (2 pcs)",
                  "pricePaise": 2000
                },
                {
                  "id": "ao_01j9g",
                  "name": "Sweet Lassi (250ml)",
                  "pricePaise": 3500
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

### 2.2. Verify Delivery Zone by Pincode
Validates whether a delivery location is serviceable and returns the base delivery fee.

- **Method:** `GET`
- **Path:** `/delivery-zones/check`
- **Query Params:**
  - `pincode` (required, string, 6 digits)

**Success Response (`200 OK`):**
```json
{
  "serviceable": true,
  "zoneId": "zone_south_delhi",
  "zoneName": "South Delhi Zone 1",
  "pincode": "110017",
  "minOrderPaise": 9900,
  "deliveryFeePaise": 3000,
  "freeDeliveryThresholdPaise": 29900,
  "estimatedDeliveryMinutes": 45
}
```

---

### 2.3. Get Available Delivery Slots
Returns available delivery windows and remaining capacity for an order date.

- **Method:** `GET`
- **Path:** `/delivery-slots`
- **Query Params:**
  - `date` (required, string: `YYYY-MM-DD`)

**Success Response (`200 OK`):**
```json
{
  "date": "2026-10-22",
  "slots": [
    {
      "id": "slot_lunch_1",
      "mealType": "LUNCH",
      "label": "Lunch (12:30 PM - 01:30 PM)",
      "startTime": "12:30",
      "endTime": "13:30",
      "cutoffTime": "11:00",
      "isAvailable": true,
      "remainingCapacity": 14
    },
    {
      "id": "slot_dinner_1",
      "mealType": "DINNER",
      "label": "Dinner (07:30 PM - 08:30 PM)",
      "startTime": "19:30",
      "endTime": "20:30",
      "cutoffTime": "18:00",
      "isAvailable": true,
      "remainingCapacity": 32
    }
  ]
}
```

---

### 2.4. Calculate Checkout Quotation (Authoritative)
Receives cart items and returns an official, server-recalculated price breakdown with an expiration token.

- **Method:** `POST`
- **Path:** `/checkout/quote`
- **Request Body:**
```json
{
  "serviceDate": "2026-10-22",
  "deliverySlotId": "slot_lunch_1",
  "pincode": "110017",
  "items": [
    {
      "productId": "prod_01j9b",
      "variantId": "var_01j9c",
      "quantity": 2,
      "selectedAddonOptionIds": ["ao_01j9f"]
    }
  ]
}
```

**Success Response (`200 OK`):**
```json
{
  "quoteToken": "qtok_9f82bc4e72a819",
  "expiresAt": "2026-10-21T15:05:00.000Z",
  "currency": "INR",
  "subtotalPaise": 35800,
  "deliveryFeePaise": 3000,
  "packagingFeePaise": 1500,
  "taxPaise": 1790,
  "discountPaise": 0,
  "totalAmountPaise": 42090,
  "formattedTotal": "₹420.90"
}
```

---

### 2.5. Place Order & Initialize Razorpay Payment
Creates a local pending order, reserves slot capacity, and generates a Razorpay Order ID.

- **Method:** `POST`
- **Path:** `/checkout/orders`
- **Headers:**
  - `Idempotency-Key` (required, string, UUIDv4 generated by client)
- **Request Body:**
```json
{
  "quoteToken": "qtok_9f82bc4e72a819",
  "paymentMethod": "RAZORPAY",
  "customerName": "Rohan Sharma",
  "customerPhone": "9876543210",
  "customerEmail": "rohan.sharma@example.com",
  "deliveryAddress": {
    "flat": "Flat 402, Sunshine Towers",
    "street": "Outer Ring Road, Malviya Nagar",
    "landmark": "Near Main Market Metro",
    "pincode": "110017",
    "latitude": 28.527280,
    "longitude": 77.218320
  },
  "deliveryNotes": "Please ring bell and leave with security if absent."
}
```

**Success Response (`201 Created`):**
```json
{
  "orderId": "ord_918237190",
  "orderNumber": "JR-20261022-0042",
  "status": "AWAITING_PAYMENT",
  "trackingToken": "trk_7f2b901a9c3d4e8",
  "trackingUrl": "https://jankirasoi.in/orders/track/trk_7f2b901a9c3d4e8",
  "payment": {
    "method": "RAZORPAY",
    "amountPaise": 42090,
    "currency": "INR",
    "razorpayOrderId": "order_NXK92kd81ks9",
    "razorpayKeyId": "rzp_test_1DP5mmOlF5G5ag"
  }
}
```

---

### 2.6. Verify Razorpay Payment (Client Handover)
Submits Razorpay client callback tokens to the server for cryptographic verification.

- **Method:** `POST`
- **Path:** `/payments/verify`
- **Request Body:**
```json
{
  "orderId": "ord_918237190",
  "razorpayOrderId": "order_NXK92kd81ks9",
  "razorpayPaymentId": "pay_NXK98al91ka",
  "razorpaySignature": "9ef8a17684bc871239de981a8b6c5432..."
}
```

**Success Response (`200 OK`):**
```json
{
  "verified": true,
  "orderId": "ord_918237190",
  "status": "PLACED",
  "message": "Payment verified and order successfully confirmed."
}
```

---

### 2.7. Track Order (Public by Secret Token)
Used by the customer tracking page. The frontend polls this endpoint every 5–10 seconds.

- **Method:** `GET`
- **Path:** `/orders/track/:trackingToken`

**Success Response (`200 OK`):**
```json
{
  "orderNumber": "JR-20261022-0042",
  "status": "PREPARING",
  "paymentStatus": "CAPTURED",
  "paymentMethod": "RAZORPAY",
  "serviceDate": "2026-10-22",
  "deliverySlot": "Lunch (12:30 PM - 01:30 PM)",
  "createdAt": "2026-10-21T07:15:00.000Z",
  "estimatedDeliveryTime": "2026-10-22T13:00:00.000Z",
  "deliveryContact": {
    "name": "Rohan Sharma",
    "maskedPhone": "98XXXXXX10"
  },
  "deliveryOtp": "583921",
  "otpExpiresAt": "2026-10-22T14:30:00.000Z",
  "otpNotice": "Share this 6-digit code with the rider when they arrive at your door to receive your food.",
  "items": [
    {
      "name": "Executive North Indian Thali",
      "portion": "Standard Portion",
      "quantity": 2,
      "addons": ["Extra Phulka (2 pcs)"]
    }
  ],
  "timeline": [
    { "status": "PLACED", "timestamp": "2026-10-21T07:15:30.000Z" },
    { "status": "ACCEPTED", "timestamp": "2026-10-21T07:18:10.000Z" },
    { "status": "PREPARING", "timestamp": "2026-10-21T07:22:00.000Z" }
  ]
}
```

---

## 3. Admin Management Panel Endpoints

All admin endpoints require an authenticated session (`HttpOnly` session cookie) with role `ADMIN` or `STAFF`.

### 3.1. Admin Authentication
- **Method:** `POST`
- **Path:** `/admin/auth/login`
- **Request Body:** `{ "email": "admin@jankirasoi.in", "password": "StrongPassword123!" }`
- **Success Response (`200 OK`):** Sets `Set-Cookie: session_token=...; HttpOnly; Secure; SameSite=Lax`.

---

### 3.2. List Live Orders (Kitchen KDS & Ops)
- **Method:** `GET`
- **Path:** `/admin/orders`
- **Query Params:**
  - `status` (optional, enum: `PLACED` | `ACCEPTED` | `PREPARING` | `READY_FOR_PICKUP` | `OUT_FOR_DELIVERY` | `DELIVERED` | `CANCELLED`)
  - `service_date` (optional: `YYYY-MM-DD`)
  - `page` (default: 1), `limit` (default: 25)

**Success Response (`200 OK`):**
```json
{
  "orders": [
    {
      "id": "ord_918237190",
      "orderNumber": "JR-20261022-0042",
      "status": "PREPARING",
      "paymentStatus": "CAPTURED",
      "customerName": "Rohan Sharma",
      "customerPhone": "9876543210",
      "deliveryAddress": "Flat 402, Sunshine Towers, Malviya Nagar",
      "slotLabel": "Lunch (12:30 PM - 01:30 PM)",
      "totalAmountPaise": 42090,
      "assignedRider": {
        "id": "rider_01k8a",
        "name": "Amit Kumar",
        "phone": "9811223344"
      },
      "createdAt": "2026-10-21T07:15:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 25, "total": 14, "totalPages": 1 }
}
```

---

### 3.3. Update Order Lifecycle Status
- **Method:** `PATCH`
- **Path:** `/admin/orders/:id/status`
- **Request Body:**
```json
{
  "status": "READY_FOR_PICKUP",
  "reason": "Kitchen preparation completed"
}
```

---

### 3.4. Assign or Reassign Rider
- **Method:** `PATCH`
- **Path:** `/admin/orders/:id/assign-rider`
- **Request Body:**
```json
{
  "riderId": "rider_01k8a"
}
```
*Note: If an active OTP was previously generated for another rider on this order, assigning a new rider revokes it immediately.*

---

### 3.5. Trigger Refund (Online Orders)
- **Method:** `POST`
- **Path:** `/admin/orders/:id/refund`
- **Request Body:**
```json
{
  "amountPaise": 42090,
  "reason": "Customer cancelled before preparation started"
}
```

---

### 3.6. Emergency Manual Delivery Override
Allows admin to mark an order delivered if SMS gateway is completely down.
- **Method:** `POST`
- **Path:** `/admin/orders/:id/override-delivery`
- **Request Body:**
```json
{
  "reason": "Verified customer receipt via phone call due to carrier SMS outage"
}
```

---

## 4. Rider Web Panel Endpoints

All rider endpoints require an authenticated session with role `RIDER`.

### 4.1. Rider Authentication
- **Method:** `POST`
- **Path:** `/rider/auth/login`
- **Request Body:** `{ "phone": "9811223344", "password": "RiderSecretPass!" }`
- **Success Response (`200 OK`):** Sets `Set-Cookie: session_token=...; HttpOnly; Secure; SameSite=Lax`.

---

### 4.2. List Assigned Active Deliveries
Returns deliveries currently assigned to the logged-in rider.

- **Method:** `GET`
- **Path:** `/rider/deliveries`
- **Success Response (`200 OK`):**
```json
{
  "deliveries": [
    {
      "orderId": "ord_918237190",
      "orderNumber": "JR-20261022-0042",
      "status": "READY_FOR_PICKUP",
      "customerName": "Rohan Sharma",
      "customerPhone": "9876543210",
      "deliveryAddress": "Flat 402, Sunshine Towers, Outer Ring Road, Malviya Nagar",
      "landmark": "Near Main Market Metro",
      "coordinates": {
        "latitude": 28.527280,
        "longitude": 77.218320
      },
      "navigationUrl": "https://www.google.com/maps/dir/?api=1&destination=28.527280,77.218320",
      "slotLabel": "Lunch (12:30 PM - 01:30 PM)",
      "paymentMethod": "RAZORPAY",
      "cashDuePaise": 0,
      "itemsSummary": "2x Executive North Indian Thali (+Extras)"
    }
  ]
}
```

---

### 4.3. Mark Out for Delivery (Generates Customer OTP)
Transitions the order to `OUT_FOR_DELIVERY` and queues an automated SMS with the 6-digit OTP to the customer's phone.

- **Method:** `PATCH`
- **Path:** `/rider/deliveries/:id/out-for-delivery`
- **Success Response (`200 OK`):**
```json
{
  "orderId": "ord_918237190",
  "status": "OUT_FOR_DELIVERY",
  "message": "Order is out for delivery. 6-digit OTP sent to customer phone.",
  "otpSentTo": "XXXXXX3210"
}
```

---

### 4.4. Verify Delivery OTP (Handover)
Submits the 6-digit OTP provided verbally by the customer at the door.

- **Method:** `POST`
- **Path:** `/rider/deliveries/:id/verify-otp`
- **Request Body:**
```json
{
  "code": "583921"
}
```
**Success Response (`200 OK`):**
```json
{
  "success": true,
  "orderId": "ord_918237190",
  "status": "DELIVERED",
  "deliveredAt": "2026-10-22T13:12:00.000Z",
  "message": "Delivery successfully completed and verified."
}
```

**Failure Response (`400 Bad Request`):**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "code": "INVALID_OTP",
  "message": "Invalid OTP code. 3 attempts remaining.",
  "attemptsRemaining": 3
}
```

---

### 4.5. Report Delivery Exception
Used if the customer is unreachable, address is invalid, or customer refused order.

- **Method:** `POST`
- **Path:** `/rider/deliveries/:id/exception`
- **Request Body:**
```json
{
  "reason": "CUSTOMER_UNREACHABLE",
  "notes": "Door locked, phone switched off after 3 attempts over 10 minutes."
}
```
**Success Response (`200 OK`):**
```json
{
  "orderId": "ord_918237190",
  "status": "DELIVERY_EXCEPTION",
  "message": "Delivery exception recorded. Kitchen manager notified."
}
```

---

## 5. Razorpay Webhook Contract

- **Method:** `POST`
- **Path:** `/webhooks/razorpay`
- **Header:** `X-Razorpay-Signature: <hmac_hex>`
- **Expected Payload:** Raw JSON from Razorpay
- **Handled Events:**
  - `payment.captured`: Transitions order to `PLACED`, confirms payment record.
  - `payment.failed`: Records failed payment attempt, alerts customer.
  - `refund.processed`: Marks refund status `COMPLETED`.
