# SleeknShine — Frontend

Mobile-first Next.js (App Router) storefront and admin dashboard for the
SleeknShine cosmetics e-commerce platform, connecting to the companion
Express/PostgreSQL backend.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS with a custom design-token theme (light/dark)
- Hand-built UI primitives in the shadcn/ui style, using Radix UI primitives +
  class-variance-authority (this project does **not** use the shadcn CLI —
  see "Design system" below for why, and how to swap in real shadcn/ui if
  you prefer)
- Zustand for cart/UI/auth/toast state
- TanStack Query for server state
- react-hook-form + zod for forms
- lucide-react icons

## Setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` (see `.env.example` for every option):
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000     # canonical URLs, sitemap.xml, robots.txt
NEXT_PUBLIC_CURRENCY=USD                      # must match the backend's DEFAULT_CURRENCY
```

Make sure the backend (see `../backend/README.md`) is running and seeded
first — the homepage and shop pages fetch live data on load.

```bash
npm run dev
```

Frontend runs at `http://localhost:3000`.

## Design system

The brief asked for a "shadcn design language." Real shadcn/ui components are
generated interactively via `npx shadcn init` / `shadcn add <component>`,
which isn't something that can be scripted non-interactively in this
environment. Instead, `components/ui/*` contains hand-written equivalents
(Button, Input, Card, Sheet, Dialog, Tabs, Accordion, Select, Checkbox,
Dropdown Menu, Table, Toaster, Skeleton, Label, Textarea, Badge) built the
same way shadcn's generator would: Radix UI primitives styled with Tailwind
via `class-variance-authority`, using the same `cn()` merge helper. They're
drop-in compatible with the real shadcn output — if you want the genuine
CLI-generated versions later, run `npx shadcn@latest init` in this project
and `npx shadcn@latest add button input card ...` to replace files in
`components/ui/` one-for-one; nothing else in the app needs to change since
the import paths and prop shapes match.

**Theme**: light mode uses warm off-white/beige with black text and muted
gray borders; dark mode uses near-black charcoal with soft borders. Both
share a restrained rose/champagne accent (`--accent` in `app/globals.css`).
The signature visual motif is a small circular "swatch dot" (`.swatch-dot`
utility class) used as a logo mark, bullet, and loading placeholder — a nod
to cosmetics shade swatches. Headings use Cormorant Garamond (serif,
display), body text uses Inter.

## Project structure

```
app/
  layout.tsx                Root layout (fonts, providers — no chrome)
  providers.tsx              ThemeProvider, QueryClientProvider, toaster
  (storefront)/               Route group sharing CustomerLayout (header,
                              footer, mobile nav, cart drawer) — URLs are
                              unaffected by the group, e.g. still /shop
    page.tsx                  Home
    shop/                      Product listing with filters/sort
    products/[slug]/            Product detail
    categories/[slug]/          Category listing
    search/                     Search
    checkout/                   Multi-section checkout
    account/                    Profile, orders list, order detail
    login/ register/            Auth
  admin/                       Admin dashboard (own layout, sidebar+topbar)
    page.tsx                    Dashboard stats
    products/ (+new, [id])       List + tabbed editor (basic/media/variants/attributes)
    inventory/ orders/ (+[id])   customers/ categories/ brands/ attributes/
    coupons/ content/ audit-logs/
components/
  ui/                         Hand-built primitives (see Design system)
  layout/                      Header, footer, mobile nav, category sidebar/sheet
  home/                        Homepage sections
  products/                    Product card/grid/gallery/filters/add-to-cart
  cart/                        Cart drawer
  checkout/                    Address form
  auth/                        Login/register forms
  admin/                       Sidebar, topbar, product editor sub-panels, etc.
  shared/                      Empty state, theme toggle, protected route, etc.
lib/
  api/                        Typed fetch wrapper + one module per resource
  hooks/                       useAuth, useCart, useProducts, useAddresses, etc.
  schemas/                     zod schemas for forms
  utils.ts constants.ts
stores/                       Zustand: cart (guest, persisted), ui, auth, toast
types/                        Shared TS types mirroring the API contract
```

## API integration

- `lib/api/client.ts` is the single fetch wrapper: sends `credentials:
  'include'` on every request so the backend's HttpOnly cookies work, unwraps
  the `{ success, message, data, meta }` envelope, applies a 20s timeout, turns
  network failures into readable errors, and — on a 401 (except login/register/
  refresh/logout) — makes one silent call to `/auth/refresh` and retries.
  `lib/api/errors.ts#getErrorMessage` turns API validation errors into
  field-specific messages.
- Every other file in `lib/api/` is a thin, fully-typed set of functions per
  backend resource (`auth.ts`, `products.ts`, `cart.ts`, `orders.ts`,
  `content.ts`, `admin.ts`). Nothing in the app calls `fetch` directly.

## Guest cart → backend cart

- Signed out: `stores/cart.store.ts` (`useGuestCartStore`) persists cart
  items to `localStorage` via Zustand's `persist` middleware.
- `lib/hooks/useCart.ts` is what components actually use — it transparently
  reads/writes the guest store when signed out and the backend cart (via
  TanStack Query + `lib/api/cart.ts`) when signed in, so product cards,
  the cart drawer, and checkout never need to know which mode they're in.
- On login/register (`lib/hooks/useAuth.ts`), any items in the guest cart are
  posted to `POST /cart/sync` and the local store is cleared; the backend
  cart becomes the source of truth from then on.

## Admin dashboard

Protected by `components/admin/admin-auth-guard.tsx`, which wraps every
`/admin/*` route and redirects non-admin-role users away. The product editor
(`/admin/products/[id]`) is tabbed: Basic Info submits the core product
fields; Media, Variants, and Attributes each manage their own sub-resource
independently via the product's own `id` (so create a product first — the
"Add Product" page shows a note to that effect — before uploading images or
adding variants).

## Behaviour worth knowing

- **Totals come from the server.** The checkout page calls `POST /checkout/quote` for subtotal, coupon
  discount, shipping and total (re-quoted whenever the cart changes). The client never computes shipping.
- **Payment methods** are whatever the backend enables (`ENABLED_PAYMENT_PROVIDERS`, default cash on delivery).
- **Server-rendered pages** (`/`, `/products/[slug]`, `/categories/[slug]`) render per request with a 60-second
  API data cache, so edits show up within a minute, a missing product/category is a real HTTP 404, and an API
  outage is a 500 error page instead of a fake 404 or an empty store.
- **Roles**: the admin navigation and route guard follow `lib/permissions.ts`, which mirrors the backend matrix
  (the API remains the source of truth). Super admins get a *Staff* page.
- **Images**: `<SafeImage>` falls back to an unoptimised `<img>` for hosts that are not whitelisted in
  `next.config.mjs` / `NEXT_PUBLIC_IMAGE_HOSTS`, so an admin pasting a new image URL can never crash a page.
- Account area: profile, address book (add/edit/delete/default), change password, paginated orders,
  order progress timeline and self-service cancellation of pending/confirmed orders.

## Known limitations / next steps

- **Next.js 14 has open security advisories** (`npm audit`) whose fixes only exist in Next 16, which also requires
  React 19 and the async `params`/`searchParams` migration. This was not attempted without browser-level
  regression testing. Plan the upgrade; until then keep the app behind a reverse proxy, do not use Server Actions
  or rewrites with user-controlled input, and consider `images.unoptimized: true` (Cloudinary already optimises
  images) to remove the `/_next/image` endpoint from the attack surface.
- The UI primitives are hand-built rather than CLI-generated shadcn/ui (see above).
- Password reset, e-mail verification and OTP/magic-link login are not implemented (they need an e-mail/SMS provider).
- No brand pages (`/brands/[slug]`) yet; the API supports them.
- Admin product images support upload, set-main and delete; drag-to-reorder is not implemented.
- Frontend automated tests are not included (backend has an integration suite). Recommended first Playwright
  flows: guest → add to cart → login → checkout, and admin product create/edit.
