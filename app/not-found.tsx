import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-accent">404</p>
      <h1 className="font-display text-3xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="max-w-md text-muted-foreground">The link may be broken, or the product may no longer be available.</p>
      <Button asChild variant="accent"><Link href="/shop">Browse the shop</Link></Button>
    </div>
  );
}
