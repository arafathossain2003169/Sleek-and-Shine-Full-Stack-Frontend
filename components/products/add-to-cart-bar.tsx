'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus } from 'lucide-react';
import { ProductDetail, ProductVariant } from '@/types/product';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/hooks/useCart';
import { useUiStore } from '@/stores/ui.store';
import { toast } from '@/stores/toast.store';
import { getErrorMessage } from '@/lib/api/errors';
import { cn, formatCurrency } from '@/lib/utils';

const MAX_QTY = 99;

const variantInStock = (v: ProductVariant) => v.status === 'active' && v.stockQuantity > 0;

/**
 * Variant + quantity picker and the add-to-cart / buy-now buttons.
 * Works on every screen size (the pickers used to be hidden below the md breakpoint, which left
 * phone users unable to choose a variant or quantity).
 */
export function AddToCartBar({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const { addItem } = useCart();
  const openCart = useUiStore((s) => s.openCart);
  const hasVariants = product.variants.length > 0;

  // Pre-select the first variant that can actually be bought.
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    hasVariants ? (product.variants.find(variantInStock) ?? product.variants[0]).id : null
  );
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedVariant: ProductVariant | undefined = useMemo(
    () => product.variants.find((v) => v.id === selectedVariantId),
    [product.variants, selectedVariantId]
  );

  const price = selectedVariant
    ? selectedVariant.finalPrice ?? selectedVariant.salePrice ?? selectedVariant.price ?? product.finalPrice ?? product.basePrice
    : product.finalPrice ?? product.salePrice ?? product.basePrice;

  const soldOut = hasVariants
    ? !selectedVariant || !variantInStock(selectedVariant)
    : product.stockStatus === 'out_of_stock' || product.stockStatus === 'discontinued';

  const maxQty = selectedVariant ? Math.max(1, Math.min(MAX_QTY, selectedVariant.stockQuantity)) : MAX_QTY;
  const lowStock = selectedVariant && selectedVariant.stockQuantity > 0 && selectedVariant.stockQuantity <= 5;

  function selectVariant(id: string) {
    setSelectedVariantId(id);
    setQuantity(1);
  }

  async function handleAdd(buyNow: boolean) {
    setIsSubmitting(true);
    try {
      await addItem({
        productId: product.id,
        variantId: selectedVariant?.id ?? null,
        slug: product.slug,
        name: product.name,
        variantName: selectedVariant?.name ?? null,
        image: selectedVariant?.images?.[0]?.url ?? selectedVariant?.imageUrl ?? product.images[0]?.url ?? null,
        price,
        quantity,
      });
      if (buyNow) {
        router.push('/checkout');
      } else {
        toast({ title: 'Added to cart', description: product.name, variant: 'success' });
        openCart();
      }
    } catch (err) {
      toast({ title: 'Could not add to cart', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {hasVariants && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            Option{selectedVariant ? <span className="font-normal text-muted-foreground"> — {selectedVariant.name}</span> : null}
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {product.variants.map((variant) => {
              const available = variantInStock(variant);
              return (
                <button
                  key={variant.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedVariantId === variant.id}
                  onClick={() => selectVariant(variant.id)}
                  disabled={!available}
                  title={available ? undefined : 'Sold out'}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through',
                    selectedVariantId === variant.id ? 'border-accent bg-accent-soft text-foreground' : 'border-border hover:border-accent'
                  )}
                >
                  {variant.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {hasVariants && selectedVariant && (
        <p className="text-sm text-muted-foreground">
          {formatCurrency(price, product.currency)}
          {lowStock && <span className="ml-2 font-medium text-destructive">Only {selectedVariant.stockQuantity} left</span>}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-md border border-border" role="group" aria-label="Quantity">
          <button
            type="button"
            aria-label="Decrease quantity"
            className="flex h-10 w-10 items-center justify-center disabled:opacity-40"
            disabled={quantity <= 1 || soldOut}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-sm" aria-live="polite">{quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            className="flex h-10 w-10 items-center justify-center disabled:opacity-40"
            disabled={quantity >= maxQty || soldOut}
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <Button variant="outline" size="lg" className="min-w-[8rem] flex-1" disabled={soldOut || isSubmitting} onClick={() => handleAdd(false)}>
          {soldOut ? 'Out of Stock' : isSubmitting ? 'Adding...' : 'Add to Cart'}
        </Button>
        <Button variant="accent" size="lg" className="min-w-[8rem] flex-1" disabled={soldOut || isSubmitting} onClick={() => handleAdd(true)}>
          Buy Now
        </Button>
      </div>
    </div>
  );
}
