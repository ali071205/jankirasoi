# Tiffin Ordering Website — Implementation Plan

**Status:** Proposed implementation baseline  
**Product:** Single-location tiffin/food business; customer website, owner/staff admin, browser-based rider panel, online payments, delivery OTP.  
**Deployment choice:** Vercel for Next.js; Render Singapore for API, worker, and PostgreSQL.  
**Architecture choice:** TypeScript monorepo with a modular NestJS backend. No microservices in v1.

---

## 1. Executive decision

Build a custom web application rather than adapting TastyIgniter. Reuse good patterns observed in existing food-ordering repositories, but do not inherit their old dependencies, payment assumptions, or unnecessary platform complexity.

### Approved stack

- **Repository:** pnpm workspace monorepo; keep the deployable applications in one repo.
- **Customer/admin/rider web:** Next.js App Router, React, TypeScript.
- **UI:** Tailwind CSS, shadcn/ui, Radix primitives, Lucide icons, React Hook Form.
- **Backend API:** NestJS REST API on Render.
- **API schemas:** NestJS DTO validation on the server; OpenAPI-generated TypeScript client/types for the web. Zod can be used for client-side form feedback, but server validation is authoritative.
- **Database:** Render PostgreSQL; Prisma ORM with migrations and transactions.
- **Payments:** Razorpay Standard Checkout. Server-created Razorpay orders, signature verification, webhook verification, payment reconciliation, and idempotency.
- **Delivery confirmation:** six-digit delivery OTP sent to the nominated delivery contact using an SMS provider such as MSG91; provider abstraction so it can be changed later.
- **Images:** Cloudinary or equivalent managed object/image storage; upload signatures generated server-side.
- **Live updates:** 5–10 second polling for v1; no WebSockets or live GPS at launch.
- **Reliable async tasks:** PostgreSQL transactional outbox + a separate Render worker process. Start without RabbitMQ/Kafka/microservices; Redis/BullMQ can be introduced if measured workload warrants it.
- **Tests:** unit/integration tests for business rules, Playwright end-to-end tests for checkout/admin/rider, dependency audit, lint, typecheck, build.

### Why this choice

- TastyIgniter provides a strong restaurant domain foundation, but it is PHP/Laravel/Bootstrap and would not naturally fit the selected Vercel/Render TypeScript setup.
- FoodMozo demonstrates menu/order/vendor concepts and a documented Razorpay integration, but its checked requirements pin Django 4.0.3 and older packages. Treat it as a feature reference, not the code base to deploy unchanged.
- The small Next.js sample demonstrates useful UI, form validation, admin CRUD, and webhook patterns, but it uses Stripe test mode and MongoDB and does not establish production-scale maturity.
- BiteFlow demonstrates customer/admin/rider role separation and Razorpay concepts, but its many microservices, message broker, and real-time service are excessive for a single local vendor.
- FoodFlow shows explicit separation of the API, dashboards, operations, and test documentation, but it is a broader multi-tenant product with native apps this project does not require.

Repository references:
- TastyIgniter: https://github.com/tastyigniter/TastyIgniter
- FoodMozo: https://github.com/Nit89/FoodMozo
- Next.js food ordering sample: https://github.com/ev0clu/food-ordering-app
- BiteFlow: https://github.com/vivekkumar012/BiteFlow
- FoodFlow: https://github.com/JasonTM17/FoodDelivery_App

## 2. Product scope

### V1 — build these

1. Public branded homepage and mobile-responsive menu.
2. Categories, product photos, item variants/portions, add-ons, prices, availability, sold-out status.
3. Guest checkout; account creation is optional, not required to place an order.
4. Delivery service zones, PIN/postcode/area eligibility, delivery fees, minimum order, operating hours, cutoff time, and delivery slots.
5. Cart and checkout with server-calculated subtotal, fees, taxes if configured, discounts if enabled, and final amount.
6. Online payment through Razorpay and optional cash on delivery (COD).
7. Customer order confirmation and secure order-tracking URL.
8. Admin panel to manage menus, prices, daily availability, orders, cancellations, refunds, riders, zones, slots, and staff permissions.
9. Rider web panel designed for mobile browsers: sign-in, assigned deliveries, customer address/contact, navigation link, delivery status, OTP confirmation, failed delivery reason.
10. Audit log, notifications, backups, health checks, staging, and production runbooks.

### Defer unless the business confirms they are essential on day one

- Monthly/prepaid meal subscriptions, credits, pause/skip days, auto-renewal.
- Live rider GPS tracking.
- Automatic rider dispatch/route optimization.
- Loyalty points, referrals, complex coupons, analytics dashboards, AI features.
- Native Android/iOS apps, marketplace/multi-vendor support, microservices.

**Business assumption:** v1 supports individual and scheduled meal orders. If prepaid daily/monthly tiffin plans are a core revenue model, promote meal-plan purchase, meal-credit ledger, skip/pause rules, and service-day scheduling into v1. Do not add automatic recurring charging until the basic payment/refund flow is proven.

## 3. Runtime architecture

```text
Customer browser ─┐
Admin browser ─────┼── Next.js (Vercel) ── HTTPS REST ── NestJS API (Render Singapore)
Rider browser ────┘                                      │
                                                        ├── Render PostgreSQL (same region)
                                                        ├── Razorpay API + verified webhooks
                                                        ├── SMS provider (delivery OTP)
                                                        ├── Cloudinary/object storage
                                                        └── Transactional outbox → Render worker
```

- Host customer, admin, and rider interfaces within one Next.js app under route groups.
- Use `www.example.in` for the website and `api.example.in` for the API.
- Keep API and PostgreSQL in the same Render region to avoid a needless cross-region database hop.
- Configure Vercel server-side functions to a Singapore region when they must call the API; static assets can still be served by the CDN.
- Do not expose database credentials to the browser. Browser calls go only to API routes; all authorization and sensitive business rules live in the API.
- Enable exact-origin CORS for production and staging origins, credentials only where needed, `Secure`/`HttpOnly` cookies, CSRF protection, and strict `Origin` validation for state-changing requests.
- No sensitive customer/admin responses should be shared through public CDN caching. Public menu responses may be cached briefly; cart, order, admin, payment, and rider endpoints must be private/no-store as appropriate.

## 4. Repository layout

```text
tiffin-platform/
  apps/
    web/
      src/app/(store)/                 # home, menu, cart, checkout, tracking
      src/app/(auth)/                  # admin/rider sign-in
      src/app/(admin)/admin/            # dashboard, orders, menu, riders, settings
      src/app/(rider)/rider/            # assigned deliveries, OTP, delivery outcome
      src/components/                  # design system and shared UI
      src/lib/                          # API client, forms, session-safe helpers
    api/
      src/modules/auth/
      src/modules/catalog/
      src/modules/delivery-zones/
      src/modules/delivery-slots/
      src/modules/checkout/
      src/modules/orders/
      src/modules/payments/
      src/modules/webhooks/
      src/modules/riders/
      src/modules/delivery-otp/
      src/modules/notifications/
      src/modules/outbox/
      src/modules/audit/
      src/modules/health/
      prisma/schema.prisma
      prisma/migrations/
      src/worker.ts
  packages/
    api-client/                         # generated from NestJS OpenAPI schema
    config/                             # shared lint/TypeScript settings
  tests/
    e2e/                                # Playwright customer/admin/rider flows
  .github/workflows/ci.yml
  render.yaml                           # API, worker, database service definitions if supported
  pnpm-workspace.yaml
  turbo.json                            # optional; use only if it helps builds
  README.md
  SECURITY.md
  .env.example                          # names only; no real secrets
```

Keep custom business logic in the API; don't place important order rules only in React components or Next.js client actions.

## 5. Roles and permissions

| Role | Allowed | Not allowed |
|---|---|---|
| Guest customer | Browse menu, create checkout, track own order through a secret URL | List all orders, read another customer's data, update price/status |
| Customer account (optional v1) | Own addresses/orders/profile | Read or modify other customers' records |
| Owner/admin | All business configuration, menu, orders, refunds, staff and riders | Secrets should still be inaccessible through UI or logs |
| Staff/manager | Explicitly granted menu/order functions | Manage owner identity or privileged security settings unless granted |
| Rider | View assigned active deliveries, update allowed delivery steps, submit OTP | Search all orders, change prices, mark arbitrary orders paid/delivered, view unrelated customers |

- Rider accounts are created/invited by an admin; no public rider registration.
- Require strong admin passwords and MFA for owner/admin accounts if feasible in v1.
- Enforce policies in the API for every protected endpoint, not only in the frontend.
- Record administrative actions, refunds, assignment changes, overrides, and important price/menu changes in an append-only audit trail.

## 6. Order and payment state model

Keep the **order state** separate from the **payment state**.

### Order status transitions

```text
AWAITING_PAYMENT → PLACED → ACCEPTED → PREPARING → READY_FOR_PICKUP
                                                    ↓
DELIVERED ← OUT_FOR_DELIVERY ←───────────────────────┘

OUT_FOR_DELIVERY → DELIVERY_EXCEPTION → (admin-approved retry / return / cancellation)
PLACED or ACCEPTED → CANCELLED (subject to cancellation policy)
AWAITING_PAYMENT → CANCELLED (payment attempt expires or fails conclusively)
```

All transitions go through a state machine in the backend. Each transition records actor, previous state, new state, timestamp, and reason. Do not let staff or rider submit arbitrary status strings.

### Payment state

Suggested online states: `PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUND_PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED`.

For COD, record `payment_method = COD` and a separate cash collection state such as `DUE` / `COLLECTED`. Do not mark COD as captured online.

Fulfil paid online orders only when the trusted server-side payment state is confirmed as captured. Configure Razorpay auto-capture where suitable, but still verify the status received from Razorpay.

### Money and order snapshots

- Store INR amounts as integer paise, never floating-point rupees.
- Server recalculates all amounts from the database; never trusts client-submitted price, delivery fee, tax, discount, or total.
- Save order-item snapshots of item name, variant, add-ons, unit price, quantity, and tax/discount allocations as applicable.
- Snapshot delivery address and customer contact on the order so later profile edits don't change historical orders.
- Assign a human-readable order number, but never use it alone as access authorization.
- Make tax/fees configurable after the business confirms its accounting requirements; do not hard-code a GST assumption.

## 7. Checkout and payment workflow

1. Client sends cart item IDs/variants, quantities, delivery area, slot, address/contact, and an idempotency key.
2. API validates item status, current prices, delivery zone, business hours, cutoff time, allowed quantity, and available slot/capacity.
3. API recalculates the authoritative total; if stock/slot capacity is limited, reserve it transactionally with an expiration.
4. API creates the local order and payment-attempt record before initiating Razorpay. Use a DB transaction for related writes.
5. API creates the Razorpay order server-side and stores its ID before returning the checkout data to the browser.
6. Browser opens Razorpay Checkout; it never receives the secret key.
7. On browser callback, the API verifies the signature using the internally stored Razorpay order ID and checks payment status. The UI displays “confirming payment” until the API reports authoritative state.
8. The webhook endpoint verifies the Razorpay signature over the raw request body, stores the event once, and safely applies the payment transition. Duplicate/retried events must have no duplicate effect.
9. If callback/webhook state is absent or contradictory, reconcile by fetching payment/order status from Razorpay; never infer success from the redirect alone.
10. Payment failure/expiry releases reservations and cancels the pending order according to a documented policy. If a late payment arrives after expiry/cancellation, route it to reconciliation/refund rather than silently fulfilling it.

**Idempotency:** unique key for checkout requests; unique provider event identifiers/payment IDs; unique outbox message IDs. A double-click, browser retry, or duplicate webhook must not create duplicate orders, captures, refunds, SMS messages, or delivery completion.

## 8. Rider delivery OTP

### Recommended workflow

1. Admin assigns an order to a rider.
2. When the rider marks it `OUT_FOR_DELIVERY`, backend creates a cryptographically random six-digit code tied to the specific order, rider assignment version, and delivery contact.
3. Backend stores an HMAC-protected verifier (keyed with a server-only secret), expiry, attempts, sent status, and use timestamp. Never log the OTP or return it to the rider UI.
4. SMS is sent to the delivery phone, which may differ from the order creator's phone when the customer is ordering for someone else.
5. Rider hands over the order, enters the code in the browser panel, and submits it to the API.
6. API checks identity/session, rider assignment, order state, expiry, unused code, attempt limits, and OTP value. In one transaction, it marks the code used and records delivery + status history.
7. The endpoint is idempotent: re-submitting the same successful request must not create another completion event.

### Initial policy (configurable)

- OTP expires after 2 hours or at the configured delivery window's end, whichever comes first; expired codes can be regenerated after validating the active assignment.
- Maximum 5 wrong attempts per code. On limit, lock that code and require a controlled resend or admin support action.
- Rate-limit resends by order, delivery phone, rider, and IP. Resending invalidates the old code.
- On rider reassignment, invalidate the existing OTP and generate a code for the new assignment.
- Keep manual override possible for genuine SMS/connectivity failures, but require an admin role, a reason, and an audit record. A rider must never be able to self-approve their own OTP bypass.
- OTP failure must not expose whether an order exists or which code digit was wrong.
- On no answer/wrong address/refusal, record a delivery exception reason and attempt; don't mark delivered. Admin decides reattempt, return, or cancellation/refund.

OWASP advises short TTLs, single use, strict attempt limits, invalidation after success, and never logging OTP values. Six digits are a usability compromise for delivery; compensate with tight attempt/rate limits and a server-side keyed verifier. Source: https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html

### India SMS launch dependency

MSG91 documents that Indian SMS delivery requires entity/DLT registration, approved sender header and content templates, and PE–TM mapping. Start registration and approval early; SMS provider integration alone is not sufficient. Sources: https://msg91.com/help/dlt-registration-in-india/dlt-process/ and https://msg91.com/help/dlt-registration-in-india/step-by-step-guide-to-implement-dlt-in-sms/

## 9. Critical data entities

- `User`, `Role`, `Session`, optional `CustomerProfile`
- `MenuCategory`, `Product`, `ProductVariant`, `AddonGroup`, `AddonOption`
- `ProductServiceDateAvailability` (optional quantity cap and sold-out state)
- `DeliveryZone`, `DeliverySlot`, `DeliverySlotCapacity`
- `Order`, `OrderItem`, `OrderItemAddon`, `OrderStatusEvent`
- `PaymentAttempt`, `PaymentEvent`, `Refund`
- `RiderProfile`, `RiderAssignment`, `DeliveryAttempt`, `DeliveryOtp`
- `OutboxMessage`, `AuditLog`

Use foreign keys, unique constraints, indexes on common filters (order status/created time, rider assignment/status, service date/slot, payment provider IDs), and transactions for multi-row business actions. Do not rely on frontend checks to enforce capacity or uniqueness.

If meal subscriptions are required from day one, add `MealPlan`, `Subscription`, `MealCreditLedger`, and `SkippedServiceDay` as a separate feature. Avoid using one mutable “meals remaining” number without an auditable credit ledger.

## 10. Edge-case matrix

| Case | Required behavior |
|---|---|
| Customer double-clicks Place Order | Idempotency key returns the existing attempt/order; no duplicate order |
| Price/menu changed while cart is open | Server recalculates; show revised total and request confirmation where material |
| Item sold out or daily cap reached | Checkout rejects or adjusts before payment; no oversell |
| Two customers request the final slot simultaneously | Atomic DB reservation/constraint permits only one reservation |
| Payment provider times out during order creation | Do not claim success; track uncertain attempt, retry/reconcile safely |
| Customer pays but browser closes | Webhook/API reconciliation updates the order; tracking page shows pending until confirmed |
| Duplicate/out-of-order webhooks | Deduplicate and apply only valid monotonic state transitions; reconcile contradictions |
| Payment succeeds after order was cancelled/expired | Flag for refund/reconciliation; don't silently dispatch food |
| Razorpay says authorized but not captured | Do not fulfil until captured, or apply documented capture workflow |
| Refund API times out | Persist a pending refund attempt and reconcile with provider before retrying blindly |
| Customer tries another order's tracking ID | High-entropy secret tracking token; generic error; no data disclosure |
| Rider tries accessing another rider's order | API policy denies access and writes a security log |
| Rider reassigned after OTP sent | Old OTP invalidated; new assignment/version required |
| SMS is delayed/failed | Show send state, controlled resend, admin support fallback, audit the override |
| Wrong OTP repeated | Rate limit and lock code after attempts; no unlimited brute force |
| Rider taps Confirm Delivery twice | Idempotent endpoint; one delivery transition only |
| Mobile loses network after a valid OTP submit | Refresh order state; don't create duplicate delivery or show unconfirmed success |
| Customer absent/wrong address | Delivery exception with reason and attempt count; admin chooses retry/return/cancel/refund |
| Customer wants to cancel after preparation | Apply policy and role-approved exception; preserve refund and audit history |
| COD delivered but cash not collected | Delivery status and cash collection status remain separate; alert/reconcile |
| Outbox/notification provider outage | Retry with backoff, cap attempts, dead-letter/manual retry; core order remains persisted |
| DB is unavailable | Fail safely; no false order/payment/delivery success; health check indicates unready |
| Deployment migration conflicts with old API | Expand/contract migrations; deploy backward-compatible schema first |
| Admin changes a price or cancels order | Record who/when/old/new values/reason in audit log |
| User data leaks in cache/logs | No-store on private pages; redact PII/secrets from logs; strict role checks |

## 11. Security baseline

- Enforce HTTPS; production debug disabled; separate staging and production secrets.
- Store only password hashes, not passwords. Use a well-reviewed auth/session library or a carefully tested API-owned session system.
- Use `HttpOnly`, `Secure` cookies; strict allowed CORS origins; CSRF defense and exact Origin checks for cookie-authenticated mutations.
- Require backend authorization for every admin and rider endpoint. Do not rely on UI route guards alone.
- Rate-limit sign-in, password reset, OTP send/verify, checkout, coupon application, and payment-related endpoints. Use shared/distributed limits if multiple API instances are introduced.
- Validate DTOs at the API; bound quantities, string sizes, pagination, upload type/size, and query filters.
- Verify Razorpay client signatures and webhook HMAC signatures; use raw webhook bytes for verification, persist event IDs, and avoid trusting browser payloads.
- Use idempotency keys and DB transactions for payments/order transitions.
- Don't log passwords, OTPs, auth cookies, payment secrets, full webhook secrets, or full customer addresses/phone numbers unnecessarily.
- Admin MFA, least-privilege staff roles, audit trail, secret rotation, dependency and container scanning.
- Use provider-signed uploads or server-issued upload signatures for Cloudinary; don't expose API secrets in the browser.

## 12. Hosting and operational setup

### Vercel

- Production and preview environments must use separate API URLs and never use live payment credentials in previews.
- Set the relevant function region to Singapore for SSR/server-side calls that must reach Render's Singapore services.
- Only public product/menu pages may be cached. Personal data, checkout, admin, rider, tracking and payment endpoints must not leak into shared caches.

### Render

- Deploy `apps/api` as a paid web service.
- Deploy `apps/api` again as a background worker using a worker entry point that processes outbox rows. Worker and API share the same PostgreSQL DB but use different startup commands.
- Use Render PostgreSQL in the same region. Do not use an expiring free database for production orders.
- Keep secrets in Render environment groups; use private networking between API/worker/database where supported.
- Start with a small paid DB/API instance only if monitoring and testing show it is adequate. Load-test and upgrade based on memory, DB connections, request latency, and queue delay.
- Use PostgreSQL transactions; implement worker claiming via row locking/`SKIP LOCKED` or another proven claim mechanism so the same message isn't processed concurrently.
- Use connection pooling when needed and calculate total connections across all application instances. Keep Prisma Client singleton per long-running API/worker process.
- Maintain off-site logical backups in addition to platform-managed recovery, and perform a restore drill before launch.

### Observability

- `/health/live` for process alive and `/health/ready` for DB/connectivity readiness.
- Structured logs with request ID/correlation ID and order/payment references; redact PII.
- Monitor 5xx rate, API latency, DB connection saturation, failed payments, webhook processing lag, OTP delivery/verification failure, outbox retries, and orders stuck in a state.
- Alert on queue age, failed backups, unusual OTP attempts, repeated admin login failures, and payment/order status mismatch.

## 13. Testing and release gates

### Automated tests

- Unit tests for totals, discounts/fees, order state transitions, delivery-zone rules, slot availability and OTP expiry/attempt logic.
- Integration tests against PostgreSQL for transaction/constraint behavior and concurrent slot reservation.
- Payment tests with Razorpay test mode, valid/invalid signatures, duplicate events, out-of-order events, failure, authorized-not-captured, refund and timeout reconciliation.
- Playwright flows for guest checkout, admin menu/order management, rider assignment, OTP success/failure, delivery exception and refund visibility.
- Security tests for unauthorized access to customer/admin/rider records, CSRF/CORS behavior, brute force limits, IDOR, private caching, and secret leakage.
- Load test expected lunchtime peak plus burst margin before live traffic; don't guess capacity from development tests.

### Launch acceptance checklist

- A customer can place exactly one order despite button/network retries.
- Server-calculated amount equals Razorpay order amount exactly in paise.
- No order is marked paid from a browser redirect alone.
- Duplicate webhook does not double-process a payment.
- No online order is released for dispatch before captured-payment status is confirmed, unless COD is explicitly chosen.
- Daily item and delivery-slot caps cannot be oversold under concurrent checkout.
- A rider can see only assigned active deliveries and cannot bypass OTP.
- OTP expires, is single-use, is attempt-limited, and is invalidated on reassignment.
- Failed SMS/payment/refund operations remain visible and recoverable.
- Admin actions are audited; customers cannot enumerate or view other orders.
- Staging and production payment credentials and databases are completely separate.
- Backup is restored successfully into a test database and documented.
- Domain, HTTPS, transactional SMS/DLT prerequisites, privacy/contact pages, cancellation/refund/delivery policies, and payment settlement details are confirmed.

## 14. Delivery milestones

### Milestone 0 — foundation

Repo/workspaces, CI, environment setup, hosting skeleton, database schema/migrations, error format, OpenAPI, auth/session design, audit/logging conventions.

**Exit gate:** clean build in CI; staging website/API health checks work; secrets are not committed.

### Milestone 1 — catalog and customer UX

Homepage, menu, item details/options, cart, delivery-zone/slot selection, mobile layout, empty/loading/error states, accessible forms.

**Exit gate:** menu, availability and cart tests pass; server rejects invalid/stale cart data.

### Milestone 2 — order and admin operations

Create order, admin order board, status state machine, menu editing, daily availability, delivery zones/slots, rider records/assignments, audit trail.

**Exit gate:** no invalid state transition; capacity races tested; staff permissions proven.

### Milestone 3 — payments

Razorpay server order creation, signature and webhook verification, idempotent event storage, payment-state machine, refunds/reconciliation, test-mode staging.

**Exit gate:** payment test matrix passes, including duplicates, missing events, failure, late payment and refund timeout.

### Milestone 4 — rider and OTP

Mobile rider panel, assigned deliveries, OTP send/verify, resend/expiry/attempt limits, reassignment invalidation, failed-delivery flow, manual override audit.

**Exit gate:** OTP abuse and network retry tests pass; DLT/SMS setup verified with real test numbers before production.

### Milestone 5 — production hardening

Performance, access-control review, dependency scanning, privacy/cache review, monitoring/alerts, backups/restore drill, domain and production deployment.

**Exit gate:** complete release checklist; owner and rider walkthrough; rollback tested.

## 15. Decisions to hold for later

1. **Subscriptions:** add in v1 only if monthly/prepaid tiffin plans are central to sales; model meal credits as an immutable ledger.
2. **Live tracking:** defer GPS. Provide an external navigation link and manual statuses first.
3. **Realtime:** start with polling. Add SSE/WebSockets only if polling has measured UX or load problems.
4. **Redis/queues:** start with a PostgreSQL outbox and worker. Add Redis/BullMQ only when measured throughput or scheduling needs justify it.
5. **Customer account:** guest checkout first; optional accounts and saved addresses later.
6. **Auto-dispatch:** manual assignment first; automated assignment later.

## 16. Verified reference documentation

- TastyIgniter application source: https://github.com/tastyigniter/TastyIgniter
- TastyIgniter Core: https://github.com/tastyigniter/core
- FoodMozo source/requirements: https://github.com/Nit89/FoodMozo
- Next.js food-ordering sample: https://github.com/ev0clu/food-ordering-app
- BiteFlow source: https://github.com/vivekkumar012/BiteFlow
- FoodFlow source/docs: https://github.com/JasonTM17/FoodDelivery_App
- Next.js production checklist: https://nextjs.org/docs/app/guides/production-checklist
- Next.js auth guide: https://nextjs.org/docs/app/guides/authentication
- NestJS validation: https://docs.nestjs.com/techniques/validation
- NestJS rate limiting: https://docs.nestjs.com/security/rate-limiting
- NestJS queues: https://docs.nestjs.com/application/queues
- Prisma transactions: https://www.prisma.io/docs/orm/fundamentals/transactions
- Prisma connection management: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections
- Render regions: https://render.com/docs/regions
- Render workers: https://render.com/docs/background-workers
- Render PostgreSQL backup and recovery: https://render.com/docs/postgresql-backups
- Render PostgreSQL pooling: https://render.com/docs/postgresql-connection-pooling
- Vercel Function regions: https://vercel.com/docs/functions/configuring-functions/region
- Razorpay payment integration: https://razorpay.com/docs/server-integration/nodejs/
- Razorpay security checklist: https://razorpay.com/security/checklist/
- OWASP OTP handling: https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
- OWASP Authorization: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- MSG91 India DLT process: https://msg91.com/help/dlt-registration-in-india/dlt-process/
- MSG91 DLT content templates: https://msg91.com/help/dlt-registration-in-india/dlt-content-template-faqs/

---

**Important:** This is an implementation blueprint based on public repository manifests/READMEs and vendor documentation. It is not evidence that a custom implementation is already secure, load-tested, or production-ready. Security and reliability must be demonstrated by tests and a release review before live payments and deliveries.
