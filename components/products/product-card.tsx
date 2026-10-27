'use client';

import Link from 'next/link';
import { ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { ProductSummary } from '@/types/product';
import { PriceDisplay } from './price-display';
import { SafeImage } from '@/components/shared/safe-image';
import { useCart } from '@/lib/hooks/useCart';
import { getErrorMessage } from '@/lib/api/errors';
import { toast } from '@/stores/toast.store';

export function isSoldOut(product: Pick<ProductSummary, 'stockStatus'>) {
  return product.stockStatus === 'out_of_stock' || product.stockStatus === 'discontinued';
}

export function ProductCard({ product }: { product: ProductSummary }) {
  const { addItem } = useCart();
  const mainImage = product.images?.find((i) => i.isMain) ?? product.images?.[0];
  const soldOut = isSoldOut(product);
  // Products with options need a variant choice, so they send you to the product page instead.
  const needsOptions = !!product.hasVariants;
  const price = product.finalPrice ?? product.salePrice ?? product.basePrice;

  async function handleQuickAdd() {
    try {
      await addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: mainImage?.url ?? null,
        price,
        quantity: 1,
      });
      toast({ title: 'Added to cart', description: product.name, variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not add to cart', description: getErrorMessage(err), variant: 'destructive' });
    }
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {mainImage ? (
            <SafeImage
              src={mainImage.url}
              alt={mainImage.altText ?? product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className={`object-cover transition-transform duration-300 group-hover:scale-105 ${soldOut ? 'opacity-60' : ''}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <span className="swatch-dot" />
            </div>
          )}

          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {soldOut && (
              <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-background">
                Sold out
              </span>
            )}
            {product.isNewArrival && (
              <span className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">New</span>
            )}
            {product.isOffer && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-foreground">Offer</span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          {product.brand && (
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{product.brand.name}</span>
          )}
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</h3>
          <div className="mt-auto pt-1">
            <PriceDisplay basePrice={product.basePrice} salePrice={product.salePrice} currency={product.currency} />
          </div>
        </div>
      </Link>

      {/* Sibling of the link (not nested inside it): valid HTML, keyboard + screen-reader friendly,
          and always visible on touch screens where there is no hover. */}
      {!soldOut &&
        (needsOptions ? (
          <Link
            href={`/products/${product.slug}`}
            aria-label={`Choose options for ${product.name}`}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-background text-foreground shadow-md md:opacity-0 md:transition-opacity md:group-hover:opacity-100 focus-visible:opacity-100"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label={`Add ${product.name} to cart`}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-background text-foreground shadow-md md:opacity-0 md:transition-opacity md:group-hover:opacity-100 focus-visible:opacity-100"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        ))}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="aspect-square w-full animate-pulse bg-muted" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
