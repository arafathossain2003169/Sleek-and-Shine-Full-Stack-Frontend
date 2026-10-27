import Link from 'next/link';
import { SITE_NAME } from '@/lib/constants';
import { BrandLogo } from '@/components/shared/brand-logo';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border pb-20 pt-10 md:pb-10">
      <div className="container grid grid-cols-2 gap-8 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <BrandLogo size={32} />
            <span className="font-display text-lg font-semibold">{SITE_NAME}</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Premium cosmetics crafted for your everyday glow.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-medium">Shop</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/shop" className="hover:text-foreground">All Products</Link></li>
            <li><Link href="/shop?isNewArrival=true" className="hover:text-foreground">New Arrivals</Link></li>
            <li><Link href="/shop?isOffer=true" className="hover:text-foreground">Offers</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium">My Account</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/account" className="hover:text-foreground">Account</Link></li>
            <li><Link href="/account/orders" className="hover:text-foreground">Track Orders</Link></li>
            <li><Link href="/search" className="hover:text-foreground">Search</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium">Payment</h4>
          <p className="mt-3 text-sm text-muted-foreground">
            Cash on delivery is available on every order.
          </p>
        </div>
      </div>

      <div className="container mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
