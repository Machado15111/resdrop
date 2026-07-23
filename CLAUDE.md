# ResDrop (repricehq) — Codebase & Architecture Guide for Claude AI

This document provides a comprehensive overview of the **ResDrop** application architecture, security policies, API routes, database patterns, build/test commands, and audit fixes. **Claude AI should consult this document upon entering the codebase.**

---

## 1. Project Overview & Architecture

ResDrop is an automated 24/7 hotel price monitoring and rebooking platform. Users submit hotel booking confirmations (via document upload, email forwarding, or direct entry), and ResDrop periodically checks real rate availability via SerpApi Google Hotels and affiliate APIs (Booking.com via Awin, Expedia).

### Tech Stack:
- **Frontend**: React 19, Vite 7, React Router 7, Vanilla CSS design system.
- **Backend**: Node.js ES Modules (`"type": "module"`), Express 5, PostgreSQL (via `postgres` driver) + Supabase REST (`@supabase/supabase-js`).
- **Cloudflare Worker**: `cloudflare/email-worker` (Routes inbound MIME emails to ResDrop API with secret validation).
- **Gmail Extension**: `gmail-extension` (Google Apps Script sidebar add-on for 1-click booking intake).
- **Database**: PostgreSQL (Supabase). Dual-layer DB architecture: Supabase REST is authoritative for production persistence; local `postgres` driver serves direct SQL.

---

## 2. Common Development & Test Commands

Run all commands using Node 20+:
```bash
# Start Vite development server (Frontend)
npm run dev

# Start Express API server (Backend)
npm run server

# Run backend test suite (185+ unit and regression tests)
cd server && npm test

# Build production bundle
npm run build

# Run ESLint
npm run lint
```

---

## 3. Key Directory Structure

```
repricehq/
├── server/                   # Express 5 backend server
│   ├── index.js              # Main Express API entrypoint & route registry
│   ├── db.js                 # Database client (Postgres + Supabase REST, camel/snake helpers)
│   ├── email.js              # Nodemailer/Resend HTML email templates (PT/EN)
│   ├── priceIndex.js         # Nuitée price trends & quota manager
│   ├── serpApi.js            # SerpApi Google Hotels rate search engine
│   ├── awinApi.js            # Awin affiliate link builder & promo parser
│   ├── expediaApi.js         # Expedia affiliate link builder
│   ├── extractors/           # Deterministic booking extraction engine (PDF/OCR/HTML)
│   ├── routes/               # Modular Express routers
│   │   ├── documents.js      # Document upload & extraction routes
│   │   ├── inbound-email.js  # Inbound email webhook & token confirmation
│   │   ├── savings.js        # Savings confirmation & activity logs
│   │   └── specialFares.js   # Admin special fare case manager
│   └── whatsapp-webhook.js   # Twilio WhatsApp webhook (ESM)
├── src/                      # React 19 frontend application
│   ├── main.jsx              # React app entry point
│   ├── App.jsx               # React Router 7 routing & layout configuration
│   ├── api.js                # API base URL resolution (PROD vs DEV)
│   ├── components/           # UI Components (Dashboard, Admin, SubmitBooking, etc.)
│   └── contexts/             # AuthContext (token storage & authFetch wrapper)
├── cloudflare/               # Cloudflare Email Routing Worker
├── gmail-extension/          # Gmail Google Apps Script Add-on
├── design-system/            # UI design tokens, variables, & guidelines
└── voyu/                     # B2B Travel Agency CRM sub-project & documentation
```

---

## 4. API Endpoints & Security Rules

### Security Guidelines:
1. **Protected Routes**: All user-specific routes must use `authMiddleware`.
2. **Admin Routes**: All admin endpoints (`/api/admin/*`, `/api/awin/status`, `/api/awin/transactions`, `/api/special-fares`) must use `authMiddleware, adminMiddleware`.
3. **Inbound Webhooks**: Public webhooks (`/api/inbound/cloudflare-email`, `/api/inbound/webhook`) must validate `X-Inbound-Secret` when `INBOUND_WEBHOOK_SECRET` is set.
4. **Data Isolation**: User queries must always filter by `req.userEmail`.

### Critical Endpoints Summary:
- `POST /api/auth/login` & `POST /api/auth/signup`: User authentication (returns 256-bit token).
- `GET /api/bookings`: Fetch bookings for current user.
- `POST /api/bookings`: Create new booking.
- `POST /api/bookings/from-document`: Upload PDF/image for booking extraction.
- `POST /api/inbound/cloudflare-email`: Cloudflare Worker email receiver.
- `GET /api/admin/dashboard`: Admin overview statistics.
- `GET /api/awin/status` & `GET /api/awin/transactions`: Admin affiliate status (Protected).

---

## 5. Database Patterns & Function Signatures

- **Camel / Snake Case Normalization**: `db.js` provides `toSnake()` and `toCamel()` helpers. Always pass camelCase properties to higher-level DB functions.
- **Activity Logging**: `db.logActivity()` supports both single-object `{ entityType, entityId, action, actorEmail, details }` and 5-positional-argument `(entityType, entityId, action, actorEmail, details)` signatures.

---

## 6. Recent Audit & Hardening Summary

During the July 2026 full-app audit, the following security and stability fixes were applied:
1. **Awin Route Protection**: Secured `/api/awin/status` and `/api/awin/transactions` with `authMiddleware, adminMiddleware` guards.
2. **Inbound Webhook Secret Validation**: Added `X-Inbound-Secret` verification to `/api/inbound/webhook`.
3. **`db.logActivity` Object Parameter Support**: Normalized `logActivity` parameter handling to prevent null SQL writes.
4. **ESM Conversion for WhatsApp Webhook**: Converted `server/whatsapp-webhook.js` from CommonJS (`require`) to ESM (`import`/`export default`).
5. **Document Upload Field Mapping**: Explicitly mapped `checkinDate`, `checkoutDate`, and `originalPrice` in `server/routes/documents.js`.
6. **Gmail Extension Path Alignment**: Updated `gmail-extension/main.js` API target URL to `/api/bookings/from-email`.
