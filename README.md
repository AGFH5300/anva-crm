# Anva CRM

A Next.js powered CRM front-end scaffolded for enquiry handling, quotation preparation, sales/purchase orders, invoicing, delivery notes, and analytics. The solution is designed to integrate with Supabase for persistence and applies United Arab Emirates VAT and corporate tax regulations when preparing commercial documents.

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` now uses the startup helper at `scripts/startup-dev.mjs`, which launches `npm run dev:hot` and warms discovered routes automatically.

Create a `.env.local` file with your Supabase credentials before running locally:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
```

## Key features

- **Supabase ready** – `src/lib/supabaseClient.ts` instantiates the Supabase SDK. Hooks and stores are structured to plug into real tables when available.
- **Quotation workflow** – `QuotationComposer` transforms enquiries into VAT-compliant quotations using reusable document builders.
- **End-to-end modules** – Routes for clients, enquiries, orders, finance, logistics, reporting, and settings outline the CRM lifecycle.
- **UAE tax compliance** – Utilities in `src/config/uaeTax.ts` encapsulate VAT (5%) and corporate tax (9% above AED 375,000 profits).
- **Document engine** – `src/services/documentBuilder.ts` normalises commercial documents (quotations, invoices, etc.) with structured tax summaries.

## Next steps

1. Provision Supabase tables for clients, enquiries, quotations, orders, invoices, and delivery notes.
2. Secure environment variables and deploy the Next.js application to your preferred hosting provider.
3. Extend document generation with PDF/email outputs that reference the `CommercialDocument` data contracts.
4. Connect analytics widgets to real Supabase SQL views for dynamic KPIs and compliance exports.

## Scripts

- `npm run dev` – Run `scripts/startup-dev.mjs` to start `npm run dev:hot` and trigger automatic route warmup via `scripts/warmup-dev.mjs`.
- `npm run dev:hot` – Start Next.js in Turbopack mode (`next dev --turbo`).
- `npm run build` – Produce an optimized production build.
- `npm run start` – Start the production server.
