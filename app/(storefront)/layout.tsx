import { CustomerLayout } from '@/components/layout/customer-layout';

// The shared chrome (sidebar, header search) reads the URL. On statically prerendered pages Next would
// only render those parts after hydration, so the sidebar would pop in and shift the page.
// Rendering the storefront per request puts them in the first HTML.
export const dynamic = 'force-dynamic';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <CustomerLayout>{children}</CustomerLayout>;
}
