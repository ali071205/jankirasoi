# Phased Implementation Plan — Janki Rasoi Platform

**Status:** Approved Master Implementation Roadmap  
**Team Allocation Strategy:** Frontend Team is actively developing client interfaces across the three portals; Backend/Infra engineers provide foundational repositories, schemas, mocks, and authoritative API endpoints.  
**Target Delivery Window:** 6 Distinct Phases (Phase 0 to Phase 5).

---

## 1. Overview & Team Responsibility Boundary

To allow the **Frontend Team** to build the Web Storefront, Admin Panel, and Rider Portal simultaneously without blocking on backend development, work is decoupled through **API Contracts & DTO Specifications**:
- **Backend / Platform Role:** Monorepo architecture, Prisma database models, state machines, business logic in NestJS, payment provider integrations, transactional outbox worker, and mock API fixtures / Swagger OpenAPI specs.
- **Frontend Team Role:** Component design systems (`shadcn/ui`, Tailwind), layout construction across Route Groups `(store)`, `(admin)`, and `(rider)`, client form validation with Zod, state management (cart, local session), and consuming the published API contracts.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PHASED IMPLEMENTATION TIMELINE                        │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────┤
│   PHASE 0    │   PHASE 1    │   PHASE 2    │   PHASE 3    │  PHASE 4 & 5   │
│  Foundation  │  Catalog &   │ Kitchen Ops  │ Razorpay &   │ Rider Dispatch │
│  & Monorepo  │  Customer UX │ & Admin KDS  │ Reconcile    │ Hardening & Go │
└──────────────┴──────────────┴──────────────┴──────────────┴────────────────┘
```

---

## 2. Phase-by-Phase Execution Roadmap

### Phase 0: Monorepo Setup, Infrastructure & Contract Foundation

**Primary Objective:** Set up clean TypeScript monorepo, database migrations, CI/CD pipeline, and OpenAPI documentation so the frontend team can develop with type-safe contracts immediately.

#### Surface-Specific Track Breakdown

| Surface | Frontend Team Deliverables | Backend & Platform Deliverables |
| :--- | :--- | :--- |
| **Monorepo & Tooling** | - Verify Node 20+, pnpm workspace.<br>- Setup `apps/web` with Next.js 15 App Router.<br>- Configure Tailwind CSS, Lucide icons, shadcn/ui. | - Configure `pnpm-workspace.yaml`, `tsconfig.json`, `turbo.json`.<br>- Configure GitHub Actions CI (lint, typecheck, test).<br>- Setup Render staging environments (API, DB, Worker). |
| **Customer Web `(store)`** | - Initialize route group `apps/web/src/app/(store)`.<br>- Establish responsive layout with Header, Footer, and Cart Drawer drawer skeleton. | - Provide initial OpenAPI schema spec for Catalog, Delivery Zones, and Slots. |
| **Admin Web `(admin)`** | - Initialize route group `apps/web/src/app/(admin)`.<br>- Scaffold Admin Shell with sidebar navigation, auth guard layout, and responsive header. | - Configure NestJS Auth module scaffolding (Session/JWT).<br>- Seed Admin credentials in local development. |
| **Rider Web `(rider)`** | - Initialize route group `apps/web/src/app/(rider)`.<br>- Setup mobile-optimized standalone layout viewport (safe-area-inset, bottom nav bar skeleton). | - Define Rider role permissions and endpoints in OpenAPI. |
| **Backend & Database** | *N/A (Frontend consumes contracts)* | - Initialize `apps/api` with NestJS.<br>- Create Prisma schema with baseline models (`User`, `Role`, `Session`, `AuditLog`).<br>- Deploy `/health/live` and `/health/ready` endpoints. |

**Exit Gate Phase 0:**
- Monorepo builds cleanly in CI (`pnpm build`).
- NestJS API boots up connected to Render PostgreSQL staging database.
- OpenAPI Swagger doc available at `http://localhost:3000/api/docs` with generated TypeScript client types exported to `@jankirasoi/api-client`.

---

### Phase 1: Menu Catalog, Delivery Zones & Customer Ordering Experience

**Primary Objective:** Enable end-to-end customer menu browsing, portion variant selection, cart management, delivery zone/slot validation, and guest order quotation.

#### Surface-Specific Track Breakdown

| Surface | Frontend Team Deliverables | Backend & Platform Deliverables |
| :--- | :--- | :--- |
| **Customer Web `(store)`** | 1. **Home & Menu Pages (`/menu`):** Category tabs (Breakfast, Lunch, Dinner, Combos), food cards with badge indicators (Veg/Non-Veg, Jain, Chef's Special).<br>2. **Item Modal / Detail:** Portion size selection (Mini / Standard / Deluxe), add-on checkboxes with price increments.<br>3. **Cart Drawer & Page (`/cart`):** Persistent item list, quantity steppers, server quote calculation display.<br>4. **Delivery Eligibility Check:** Pincode search & zone validation widget.<br>5. **Delivery Slot Selector:** Lunch (12:00 PM – 2:00 PM) and Dinner (7:30 PM – 9:30 PM) slot pickers with cutoff indicators. | 1. Implement `CatalogModule` with categories, items, variants, and add-on groups.<br>2. Implement `DeliveryZonesModule` with pincode/locality lookup & dynamic delivery fees.<br>3. Implement `DeliverySlotsModule` with slot definitions and real-time remaining capacity check.<br>4. Implement `CheckoutQuoteController` (`POST /api/v1/checkout/quote`) validating prices, availability, and calculating server-authoritative totals in paise. |
| **Admin Web `(admin)`** | 1. **Menu Management (`/admin/menu`):** Category list, item editor form (name, description, base price, tax rate, image upload trigger).<br>2. **Add-on Groups Editor:** Link add-ons to specific items.<br>3. **Daily Availability Dashboard:** Toggle item availability or set daily quantity caps. | 1. Implement Admin Catalog CRUD endpoints (`POST`, `PATCH`, `DELETE`).<br>2. Implement image upload signature generator for Cloudinary (`GET /api/v1/admin/uploads/signature`).<br>3. Implement daily service date availability table & toggle endpoints. |
| **Rider Web `(rider)`** | - Idle state / Splash screen layout for rider login. | - Seed rider mock users for subsequent test flows. |
| **Backend & Core Engine** | *Consumes contract* | 1. Enforce integer paise calculations across all pricing logic.<br>2. Comprehensive unit tests covering discount, delivery fee, and tax calculations. |

**Exit Gate Phase 1:**
- Customer can browse the full menu, customize items, check pincode eligibility, select a valid delivery slot, and receive a server-validated quote with an accurate subtotal.
- Admin can add/edit menu items and toggle sold-out state in real time.

---

### Phase 2: Kitchen Operations, Order State Machine & Admin Management

**Primary Objective:** Deliver the internal order processing engine, administrative order kanban board (KDS), capacity controls, and audit logs.

#### Surface-Specific Track Breakdown

| Surface | Frontend Team Deliverables | Backend & Platform Deliverables |
| :--- | :--- | :--- |
| **Customer Web `(store)`** | 1. **Checkout Details Screen (`/checkout`):** Customer name, delivery phone, delivery address (flat/building, street, landmark, pincode), delivery notes.<br>2. **Order Placement Trigger:** Dispatches checkout request with client-generated idempotency key.<br>3. **Order Confirmation & Tracking Page (`/orders/:trackingToken`):** Clean visual status timeline (`Placed -> Accepted -> Preparing -> Out for Delivery -> Delivered`), delivery address snapshot, item summary, 5-10s polling hook. | 1. Implement `OrderModule` with state machine: `AWAITING_PAYMENT -> PLACED -> ACCEPTED -> PREPARING -> READY_FOR_PICKUP -> OUT_FOR_DELIVERY -> DELIVERED`.<br>2. Enforce atomic slot capacity decrement inside DB transaction.<br>3. Generate secure, high-entropy `tracking_token` for guest customer lookup.<br>4. Implement public tracking endpoint (`GET /api/v1/orders/track/:token`). |
| **Admin Web `(admin)`** | 1. **Live Orders Board (`/admin/orders`):** Kitchen Kanban columns (New, In Kitchen, Ready for Dispatch, Out with Rider, Completed) with automatic 10s polling.<br>2. **Order Details Modal:** Full item breakdown, special cooking instructions, customer contact, payment status, status action buttons (`Accept`, `Mark Ready`, `Cancel`).<br>3. **Delivery Slot Capacity Manager (`/admin/slots`):** Adjust max orders per slot for specific dates.<br>4. **Audit Trail View (`/admin/audit`):** Log table showing staff actions, cancellations, and status overrides. | 1. Implement Admin order list endpoint with pagination and status filters (`GET /api/v1/admin/orders`).<br>2. Implement state transition endpoint (`PATCH /api/v1/admin/orders/:id/status`) enforcing valid transitions and saving `OrderStatusEvent`.<br>3. Implement `AuditLogModule` logging actor, entity, old value, new value, and timestamp. |
| **Rider Web `(rider)`** | - Rider profile placeholder and active shift indicator layout. | - Rider database entity and assignment model creation. |

**Exit Gate Phase 2:**
- Full simulated order lifecycle can be walked through: Place order -> Admin accepts -> Admin marks preparing -> Admin marks ready.
- Concurrent checkout requests for the final remaining slot capacity permit exactly one reservation, rejecting the second atomically.

---

### Phase 3: Razorpay Standard Checkout, Webhooks & Financial Reconciliation

**Primary Objective:** Integrate production-ready online payments via Razorpay with signature verification, raw body webhook handling, idempotency, and automated state reconciliation.

#### Surface-Specific Track Breakdown

| Surface | Frontend Team Deliverables | Backend & Platform Deliverables |
| :--- | :--- | :--- |
| **Customer Web `(store)`** | 1. **Payment Options Selector (`/checkout/payment`):** Razorpay (UPI, Cards, NetBanking, Wallets) and Cash on Delivery (COD).<br>2. **Razorpay Standard Checkout SDK Integration:** Script loader (`checkout.razorpay.com/v1/checkout.js`), modal open handler with `razorpay_order_id`, callback handler.<br>3. **Payment State Transition Handling:** Loading overlay ("Confirming payment with your bank..."), error retry handling for payment modal dismissals or failures. | 1. Implement `PaymentsModule` with Razorpay Node SDK.<br>2. Endpoint `POST /api/v1/checkout/orders`: Creates local order (`AWAITING_PAYMENT`), creates Razorpay Order server-side, returns `razorpay_order_id`.<br>3. Endpoint `POST /api/v1/payments/verify`: Validates HMAC-SHA256 signature `crypto.createHmac('sha256', secret).update(order_id + '|' + payment_id).digest('hex')`.<br>4. Transitions order to `PLACED` upon successful capture. |
| **Admin Web `(admin)`** | 1. **Payment Status Badges:** Display `PAID (Razorpay)`, `DUE (COD)`, `FAILED`, `REFUNDED` on order cards.<br>2. **Refund Action:** Admin refund button with amount input (full or partial) and mandatory reason field. | 1. Implement Admin refund endpoint (`POST /api/v1/admin/orders/:id/refund`) calling Razorpay Refund API.<br>2. Record `Refund` record and audit log event. |
| **Backend & Webhooks** | *N/A (Server-to-Server)* | 1. Webhook endpoint (`POST /api/v1/webhooks/razorpay`) configured with raw body parser for HMAC verification.<br>2. Idempotent event handler deduplicating `event.id` via `PaymentEvent` table.<br>3. Handle out-of-order events: `payment.captured`, `payment.failed`, `refund.processed`.<br>4. Auto-cancel expired checkout orders after 15 minutes of inactivity. |

**Exit Gate Phase 3:**
- Customer can pay via Razorpay Test Mode; signature verification passes and transitions order to `PLACED`.
- If customer closes browser before redirect, the Razorpay webhook captures the payment and transitions the order safely.
- Duplicate webhooks do not result in double processing.

---

### Phase 4: Rider Web Panel, Delivery Dispatch & Cryptographic OTP Handover

**Primary Objective:** Deliver a dedicated, mobile-optimized browser panel for riders, real-time assignment, external navigation links, and secure 6-digit delivery OTP verification.

#### Surface-Specific Track Breakdown

| Surface | Frontend Team Deliverables | Backend & Platform Deliverables |
| :--- | :--- | :--- |
| **Rider Web `(rider)`** | 1. **Rider Login (`/rider/login`):** Phone/password sign-in with remember-me cookie.<br>2. **Assigned Orders Dashboard (`/rider`):** List of orders assigned to the logged-in rider (Customer Name, Address, Delivery Slot, Items Summary).<br>3. **Delivery Detail View (`/rider/orders/:id`):**<br>&nbsp;&nbsp;&bull; "Open in Google Maps" deep-link button (`https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`).<br>&nbsp;&nbsp;&bull; "Call Customer" `tel:` link.<br>&nbsp;&nbsp;&bull; Action button: "Start Delivery" (triggers `OUT_FOR_DELIVERY`).<br>4. **OTP Handover Modal:** 6-digit numeric input with auto-focus and clear errors.<br>5. **Delivery Exception Modal:** Dropdown with reasons (Customer Unavailable, Wrong Address, Customer Refused, Vehicle Breakdown) and notes. | 1. Implement `RidersModule` and `DeliveryOtpModule`.<br>2. Endpoint `GET /api/v1/rider/deliveries`: Returns only deliveries assigned to the authenticated rider.<br>3. Endpoint `PATCH /api/v1/rider/deliveries/:id/out-for-delivery`: Generates cryptographically secure 6-digit OTP, stores HMAC-SHA256 hash, and enqueues SMS in Outbox.<br>4. Endpoint `POST /api/v1/rider/deliveries/:id/verify-otp`: Validates hash, decrements attempt budget, transitions order to `DELIVERED` atomically.<br>5. Endpoint `POST /api/v1/rider/deliveries/:id/exception`: Records delivery failure event without completing the order. |
| **Admin Web `(admin)`** | 1. **Rider Management (`/admin/riders`):** Add rider (Name, Phone, Vehicle Number, Status active/inactive).<br>2. **Rider Assignment Control:** Assign or reassign rider from the order drawer.<br>3. **Manual OTP Override Modal:** Emergency override button with required reason field for exceptional customer connectivity issues. | 1. Implement Rider CRUD endpoints for Admin.<br>2. Order assignment endpoint (`PATCH /api/v1/admin/orders/:id/assign-rider`). Invalidate previous active OTPs upon reassignment.<br>3. Manual override endpoint (`POST /api/v1/admin/orders/:id/override-delivery`) with audit log entry. |
| **Customer Web `(store)`** | 1. **Tracking Status Update:** Live display showing "Out for Delivery: Your OTP has been sent via SMS". | 1. Worker processes Outbox queue and triggers MSG91 transactional SMS with Indian DLT template. |

**Exit Gate Phase 4:**
- Rider logs into mobile panel, starts delivery, customer receives SMS with 6-digit OTP.
- Rider enters correct OTP -> order is marked `DELIVERED`.
- 5 wrong attempts lock the OTP; rider reassignment invalidates existing OTPs immediately.

---

### Phase 5: Production Hardening, DLT Configuration, End-to-End Testing & Go-Live

**Primary Objective:** Complete automated end-to-end testing, security audits, Indian DLT compliance, backup restoration drill, and production deployment on Vercel and Render.

#### Comprehensive Checklist & Release Gates

| Track | Activities & Deliverables | Owner |
| :--- | :--- | :--- |
| **Automated E2E Testing** | - Playwright test suite covering: Guest checkout -> Razorpay test payment -> Admin accepts -> Rider completes with OTP.<br>- Negative test cases: Expired payment, duplicate webhook, invalid OTP brute force, capacity race condition. | Full Team |
| **SMS & DLT Compliance** | - Complete DLT Entity Registration (Jio / Airtel / Smartping).<br>- Approve SMS Sender ID (Header) e.g., `JNKRAS`.<br>- Approve Transactional Content Templates for OTP and Order Status.<br>- Verify production MSG91 credentials and Indian telephone number delivery. | Operations & Backend |
| **Security & Privacy Audit** | - Rate limiting on `/api/v1/auth/*`, `/api/v1/checkout/*`, `/api/v1/rider/*`.<br>- Confirm `HttpOnly`, `Secure`, `SameSite=Lax` cookies on production domains.<br>- Verify no PII (phone, address) or secrets (OTP, Razorpay secret) leak in server logs.<br>- CORS configured strictly for `jankirasoi.in` and `admin.jankirasoi.in`. | Backend Lead |
| **Performance & Load** | - Verify PostgreSQL indexing on `Order(status, created_at)`, `RiderAssignment(rider_id, status)`.<br>- Run k6 load test for lunchtime peak checkout volume (50 concurrent checkouts/min). | Backend Lead |
| **Database & Disaster Recovery** | - Configure automated nightly backups on Render PostgreSQL.<br>- Execute disaster recovery drill: restore production backup into a staging database and verify data integrity. | DevOps / Backend |
| **Production Launch** | - Point production DNS (`www.jankirasoi.in` -> Vercel, `api.jankirasoi.in` -> Render).<br>- Switch Razorpay to Live Mode credentials.<br>- Final end-to-end live test with 1-rupee live order and refund. | Full Team |

---

## 3. Team Collaboration & Mocking Strategy

While the backend endpoints are being implemented according to the schedule above, the **Frontend Team** should utilize the contract specifications defined in [`docs/API_CONTRACTS_AND_SPECIFICATIONS.md`](file:///home/unshakensoul/jankirasoi/docs/API_CONTRACTS_AND_SPECIFICATIONS.md):
1. **Mock Service Worker (MSW) or Static JSON Fixtures:** The frontend repository can intercept API calls using MSW using the exact request/response JSON structures documented in the contract.
2. **Type Safety:** The frontend team can import TypeScript interfaces directly generated from the OpenAPI specification or copy the DTO contracts provided in the documentation.
3. **No Code Clashes:** Since the frontend codebase lives in `apps/web` and backend lives in `apps/api`, both teams can develop concurrently in their respective directories without Git merge conflicts.
