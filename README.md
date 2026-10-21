# Janki Rasoi — Tiffin Ordering Platform

A production-grade, single-location tiffin and scheduled food ordering platform.

Built with Next.js (Storefront, Admin KDS, Rider Web Panel), NestJS REST API, PostgreSQL, Razorpay Standard Checkout, Indian DLT SMS delivery OTPs, and a transactional outbox background worker.

---

## 📚 Project Documentation & Specifications

The project documentation has been organized into clear, production-ready specifications to allow parallel development between the Frontend and Backend/Platform teams:

| Document | Purpose & Audience |
| :--- | :--- |
| [**Architecture Specification**](file:///home/unshakensoul/jankirasoi/docs/ARCHITECTURE.md) | High-level system architecture, C4 diagrams, sequence flows (Checkout & OTP Handover), RBAC, security mitigations, and Render/Vercel hosting topology. |
| [**Phased Implementation Plan**](file:///home/unshakensoul/jankirasoi/docs/PHASED_IMPLEMENTATION_PLAN.md) | Comprehensive 6-phase roadmap (Phase 0 to Phase 5) detailing surface-specific deliverables for Customer Web, Admin Panel, Rider Panel, and Backend. |
| [**API Contracts & REST Specifications**](file:///home/unshakensoul/jankirasoi/docs/API_CONTRACTS_AND_SPECIFICATIONS.md) | Authoritative REST API endpoint contracts, JSON schemas, headers, query params, error envelopes, and webhook specifications for frontend consumption. |
| [**Database Schema Specification**](file:///home/unshakensoul/jankirasoi/docs/DATABASE_SCHEMA.md) | Complete Prisma schema with 18+ models, relations, integer paise financial constraints, indexes, transactional outbox, and audit logs. |
| [**Frontend Integration Guide**](file:///home/unshakensoul/jankirasoi/docs/FRONTEND_INTEGRATION_GUIDE.md) | Practical guide for frontend engineers covering Route Groups, Zod schemas, Razorpay SDK integration, battery-safe polling, and rider mobile UX. |
| [**Implementation Plan Baseline**](file:///home/unshakensoul/jankirasoi/tiffin_ordering_platform_implementation_plan.md) | Original architectural baseline, vendor references, and engineering decisions. |

---

## 🏛️ System Structure

```text
jankirasoi/
├── apps/
│   ├── web/                    # Next.js 15 App Router (Frontend Team)
│   │   ├── src/app/(store)/    # Public Customer Storefront & Tracking
│   │   ├── src/app/(admin)/    # Kitchen Operations KDS & Admin Portal
│   │   └── src/app/(rider)/    # Mobile-First Rider Handover Web App
│   └── api/                    # NestJS REST API & Outbox Worker (Backend Team)
├── docs/                       # Architectural & API Specifications
└── packages/                   # Shared TypeScript DTOs & API Client
```

---

## 🛡️ Security & Integrity Highlights

- **Financial Safety:** All monetary calculations performed in integer **paise** on the server; client-submitted totals are strictly discarded.
- **Delivery Verification:** Cryptographically random 6-digit OTPs verified via server-side HMAC-SHA256, strictly attempt-limited (max 5), and communicated to customers via Indian DLT-compliant SMS.
- **Concurrency & Idempotency:** Slot bookings and payments guarded by database transactions, row-level locks (`SELECT FOR UPDATE`), and unique idempotency keys.
