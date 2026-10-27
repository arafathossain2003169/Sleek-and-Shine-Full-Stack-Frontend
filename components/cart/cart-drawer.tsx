'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2, AlertTriangle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { SafeImage } from '@/components/shared/safe-image';
import { useUiStore } from '@/stores/ui.store';
import { useCart } from '@/lib/hooks/useCart';
import { getErrorMessage } from '@/lib/api/errors';
import { toast } from '@/stores/toast.store';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const MAX_QTY = 99;

export function CartDrawer() {
  const isOpen = useUiStore((s) => s.isCartOpen);
  const closeCart = useUiStore((s) => s.closeCart);
  const { cart, updateQuantity, removeItem, isLoading } = useCart();
  const router = useRouter();
  // One in-flight change per line: stops double-clicks from sending stale quantities.
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(itemId: string, action: () => Promise<void>) {
    setBusyId(itemId);
    try {
      await action();
    } catch (err) {
      toast({ title: 'Could not update your bag', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  }

  const availableCount = cart.items.filter((i) => i.isAvailable).reduce((n, i) => n + i.quantity, 0);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? undefined : closeCart())}>
      <SheetContent side="right" className="w-full max-w-md p-0">
        <SheetHeader>
          <SheetTitle>Your Bag {availableCount > 0 && `(${availableCount})`}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : cart.items.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Your bag is empty"
              description="Discover products you'll love."
              action={
                <SheetClose asChild>
                  <Button variant="outline" onClick={() => router.push('/shop')}>Continue shopping</Button>
                </SheetClose>
              }
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {cart.items.map((item) => {
                const busy = busyId === item.id;
                const atMax = item.quantity >= MAX_QTY || (item.stockAvailable !== null && item.quantity >= item.stockAvailable);
                return (
                  <li key={item.id} className={`flex gap-3 ${busy ? 'opacity-60' : ''}`}>
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.image ? (
                        <SafeImage src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="swatch-dot" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link href={`/products/${item.slug}`} onClick={closeCart} className="line-clamp-1 text-sm font-medium hover:underline">
                            {item.name}
                          </Link>
                          {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(item.id, () => removeItem(item.id, item.productId, item.variantId))}
                          aria-label={`Remove ${item.name}`}
                          className="text-muted-foreground hover:text-destructive disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {item.warning && (
                        <p className="flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="h-3 w-3" /> {item.warning}
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-2 rounded-md border border-border">
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center disabled:opacity-40"
                            disabled={item.quantity <= 1 || busy}
                            onClick={() => run(item.id, () => updateQuantity(item.id, item.productId, item.variantId, item.quantity - 1))}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-sm">{item.quantity}</span>
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center disabled:opacity-40"
                            disabled={busy || atMax}
                            onClick={() => run(item.id, () => updateQuantity(item.id, item.productId, item.variantId, item.quantity + 1))}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(item.subtotal)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {cart.items.length > 0 && (
          <SheetFooter>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-display text-lg font-semibold">{formatCurrency(cart.subtotal)}</span>
            </div>
            {cart.hasIssues ? (
              <p role="alert" className="text-xs text-destructive">
                Some items are unavailable. Remove or adjust them to continue to checkout.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Shipping is calculated at checkout.</p>
            )}
            <SheetClose asChild>
              <Button size="lg" variant="accent" className="w-full" disabled={cart.hasIssues} onClick={() => router.push('/checkout')}>
                Checkout
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button variant="ghost" className="w-full" onClick={() => router.push('/shop')}>Continue shopping</Button>
            </SheetClose>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
