import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductSummary } from '@/types/product';
import { ProductGrid } from '@/components/products/product-grid';

export function ProductRail({
  title,
  subtitle,
  products,
  viewAllHref,
}: {
  title: string;
  subtitle?: string;
  products: ProductSummary[];
  viewAllHref: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="container py-10 md:py-14">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold md:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <Link
          href={viewAllHref}
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
