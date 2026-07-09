# PRD — المتخصص الذكي للعقارات (Smart Specialist for Real Estate)

## Original Problem Statement
Build a production-ready, enterprise-grade Progressive Web App titled "المتخصص الذكي للعقارات" for personal, zero-cost use. Must be 100% client-side (no backend), offline-first, storing all data in IndexedDB via Dexie.js. Fully Arabic RTL UI. Ready to build with Vite and deploy to GitHub Pages.

## Architecture
- **Stack**: Vite + React 19 + TypeScript (strict) + TailwindCSS + Framer Motion
- **DB**: Dexie.js on IndexedDB (single `SmartRealEstateDB` class, 9 stores)
- **PWA**: `vite-plugin-pwa` + Workbox (CacheFirst for static assets, Google Fonts cached)
- **Reports**: `pdfmake` with Tajawal Arabic font (runtime-fetched & cached as Base64 in localStorage) + SheetJS `xlsx` with native RTL sheet views
- **State**: TanStack Query + `dexie-react-hooks` `useLiveQuery` for reactive queries
- **Forms**: React Hook Form + Zod (validation is inline for simplicity)
- **UI**: shadcn/ui (radix primitives) + Lucide icons + Sonner toasts

## Core Requirements (Static)
1. 100% client-side, zero backend, no external APIs (fonts loaded from Google Fonts once and cached)
2. IndexedDB via Dexie for all transactional data
3. Pure Arabic UI, RTL mandatory
4. PWA-installable with offline support
5. Import/export JSON backup
6. PDF & Excel report generation with Arabic RTL

## What's Been Implemented (2026-02)
- ✅ Full Vite + TS + Tailwind setup on port 3000, alias `@` → `src`
- ✅ Dexie DB with 9 stores, TypeScript models & migration-ready
- ✅ 8 pages: Dashboard, Properties, Customers, Contracts, Payments, Settings, FinancialReport, VacancyTracker
- ✅ CRUD flows for properties, customers, contracts, payments, invoices
- ✅ Automatic invoice installment generator with sequential `INV-YYYY-XXXX` numbering
- ✅ Search, filter, sort on properties/customers/invoices with `useMemo` pipelines
- ✅ Dashboard KPIs + Recharts (bar, pie, line)
- ✅ Financial report + Vacancy tracker with PDF/Excel export
- ✅ JSON backup export/import with schema validation
- ✅ Database reset (danger zone)
- ✅ Dark/light theme with glassmorphism
- ✅ Mobile bottom nav + desktop sidebar
- ✅ PWA manifest, service worker, install prompt, offline indicator
- ✅ Arabic-compliant date formatting via date-fns/locale/ar
- ✅ Seed demo data on first launch (4 properties, 2 customers)
- ✅ Activity log with reactive updates
- ✅ Local notification API integration (permission request in Settings)

## Personas
- Individual property owner tracking rentals/sales
- Small real-estate broker managing dozens of properties
- Accountant needing exportable financial reports

## Prioritized Backlog (P1/P2)
- P1: Document uploads UI on Properties/Contracts detail pages (backend function exists in `queries.ts`)
- P1: Contract detail page (view + upload attachments)
- P2: Recurring notification scheduling for upcoming invoices
- P2: Multi-currency support beyond SAR display
- P2: E-signature capture on printed contracts
- P2: Playwright & Vitest test suites (per spec)

## Notes
- Application runs entirely in the browser. `REACT_APP_BACKEND_URL` from `.env` is preserved but unused.
- To deploy to GitHub Pages: `yarn build`, then push `/app/frontend/build` to `gh-pages` branch. Vite `base: './'` already configured for subpath hosting.
