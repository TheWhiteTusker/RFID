# Project Architecture & Standards

## 1. File Length Limit (Max 200 Lines)
- **Strict Constraint**: No source code file (`.js`, `.mjs`, `.css`, `.html`) may exceed 200 lines.
- Keep client modules focused (e.g. `public/js/` modules separated by responsibility: showcase, animate, engrave, lasers, router, view).
- Keep data records and tools modular and under 200 lines.

## 2. Dynamic Routing
- All product views, kiosk pages, and resource lookups must be dynamically routed via parameters:
  - Page routes: `/product/:slug`
  - API routes: `/api/products/:slug`, `/api/next/:slug`
- Avoid hardcoded static endpoints for each individual product or item; route all interactions dynamically through parameterized slugs.
