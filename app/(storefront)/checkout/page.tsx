'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';
import { useAddresses } from '@/lib/hooks/useAddresses';
import { checkoutApi } from '@/lib/api/orders';
import { getErrorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddressForm } from '@/components/checkout/address-form';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/empty-state';
import { SafeImage } from '@/components/shared/safe-image';
import { PAYMENT_PROVIDER_LABELS } from '@/lib/constants';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from '@/stores/toast.store';
import { ShoppingBag, Plus, Check, X } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { cart, isLoading: cartLoading } = useCart();
  const { data: addresses, isLoading: addressesLoading } = useAddresses();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | undefined>(undefined);
  const [paymentProvider, setPaymentProvider] = useState<string | null>(null);
  const [customerNote, setCustomerNote] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const hasItems = cart.items.length > 0;

  // The server is the only authority on shipping, discounts and totals. The key includes the cart
  // contents, so the quote re-runs whenever the cart changes (no stale coupon/total).
  const quoteQuery = useQuery({
    queryKey: ['checkout-quote', appliedCode, cart.itemCount, cart.subtotal],
    queryFn: async () => (await checkoutApi.quote(appliedCode)).data.quote,
    enabled: isAuthenticated && hasItems,
    retry: false,
  });
  const quote = quoteQuery.data;
  const quoteError = quoteQuery.error ? getErrorMessage(quoteQuery.error) : null;

  const providers = quote?.paymentProviders ?? ['cod'];
  const activeProvider = paymentProvider && providers.includes(paymentProvider) ? paymentProvider : providers[0];
  const activeAddressId = selectedAddressId ?? addresses?.find((a) => a.is_default)?.id ?? addresses?.[0]?.id;

  function applyCoupon() {
    const code = couponInput.trim();
    if (code) setAppliedCode(code.toUpperCase());
  }

  function removeCoupon() {
    setAppliedCode(undefined);
    setCouponInput('');
  }

  async function handlePlaceOrder() {
    if (!activeAddressId || !quote) return;
    setIsPlacingOrder(true);
    setOrderError(null);
    try {
      const { data } = await checkoutApi.placeOrder({
        addressId: activeAddressId,
        couponCode: quote.couponCode ?? undefined,
        paymentProvider: activeProvider,
        customerNote: customerNote.trim() || undefined,
      });
      // The cart was emptied on the server and a new order exists: refresh both views right away.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cart'] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['checkout-quote'] }),
      ]);
      toast({ title: 'Order placed', description: `Order ${data.order.orderNumber} is confirmed.`, variant: 'success' });
      router.push(`/account/orders/${data.order.orderNumber}`);
    } catch (err) {
      setOrderError(getErrorMessage(err, 'Could not place your order. Please try again.'));
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } finally {
      setIsPlacingOrder(false);
    }
  }

  if (authLoading || cartLoading) {
    return <div className="container py-16 text-center text-muted-foreground">Loading checkout...</div>;
  }

  if (!hasItems) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="Add some products before checking out."
          action={<Button variant="accent" onClick={() => router.push('/shop')}>Shop Now</Button>}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container flex justify-center py-10">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 text-center font-display text-2xl font-semibold">Log In to Continue</h1>
          <Tabs defaultValue="login">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Log In</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">Register</TabsTrigger>
            </TabsList>
            {/* onSuccess keeps the shopper on the checkout page (the forms otherwise go to /account). */}
            <Suspense fallback={null}>
              <TabsContent value="login"><LoginForm onSuccess={() => undefined} /></TabsContent>
              <TabsContent value="register"><RegisterForm onSuccess={() => undefined} /></TabsContent>
            </Suspense>
          </Tabs>
        </div>
      </div>
    );
  }

  const blocked = cart.hasIssues || !!quoteError;

  return (
    <div className="container py-8">
      <h1 className="mb-6 font-display text-3xl font-semibold">Checkout</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Delivery Address</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setAddressDialogOpen(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> New Address
              </Button>
            </CardHeader>
            <CardContent>
              {addressesLoading ? (
                <p className="text-sm text-muted-foreground">Loading addresses...</p>
              ) : addresses && addresses.length > 0 ? (
                <div className="flex flex-col gap-2" role="radiogroup" aria-label="Delivery address">
                  {addresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      role="radio"
                      aria-checked={activeAddressId === addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={cn(
                        'flex items-start gap-3 rounded-md border p-3 text-left text-sm',
                        activeAddressId === addr.id ? 'border-accent bg-accent-soft' : 'border-border'
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                          activeAddressId === addr.id ? 'border-accent bg-accent' : 'border-border'
                        )}
                      >
                        {activeAddressId === addr.id && <Check className="h-3 w-3 text-accent-foreground" />}
                      </div>
                      <div>
                        <p className="font-medium">{addr.full_name} · {addr.phone}</p>
                        <p className="text-muted-foreground">
                          {addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}, {addr.city}
                          {addr.zone ? `, ${addr.zone}` : ''} {addr.postal_code ?? ''}, {addr.country}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No saved addresses yet. Add one to continue.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Coupon</CardTitle></CardHeader>
            <CardContent>
              {quote?.couponCode ? (
                <div className="flex items-center justify-between rounded-md bg-accent-soft px-3 py-2 text-sm">
                  <span>
                    Coupon <strong>{quote.couponCode}</strong> applied — {formatCurrency(quote.discountTotal, quote.currency)} off
                  </span>
                  <button type="button" onClick={removeCoupon} aria-label="Remove coupon" className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Label htmlFor="coupon" className="sr-only">Coupon code</Label>
                    <Input
                      id="coupon"
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyCoupon())}
                    />
                    <Button type="button" variant="outline" onClick={applyCoupon} disabled={!couponInput.trim()}>Apply</Button>
                  </div>
                  {quote?.couponError && <p className="mt-2 text-sm text-destructive">{quote.couponError}</p>}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Payment Method</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {providers.map((value) => (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm',
                    activeProvider === value ? 'border-accent bg-accent-soft' : 'border-border'
                  )}
                >
                  <input
                    type="radio"
                    name="paymentProvider"
                    value={value}
                    checked={activeProvider === value}
                    onChange={() => setPaymentProvider(value)}
                    className="accent-current"
                  />
                  {PAYMENT_PROVIDER_LABELS[value] ?? value}
                </label>
              ))}
              {activeProvider === 'cod' && (
                <p className="text-xs text-muted-foreground">Pay in cash when your order is delivered.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Order Note (optional)</CardTitle></CardHeader>
            <CardContent>
              <Label htmlFor="note" className="sr-only">Order note</Label>
              <textarea
                id="note"
                maxLength={1000}
                className="w-full rounded-md border border-input bg-background p-3 text-sm"
                rows={3}
                placeholder="Delivery instructions, gift note, etc."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-20">
            <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ul className="flex flex-col gap-3">
                {cart.items.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.image && <SafeImage src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />}
                    </div>
                    <div className="flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.variantName ? `${item.variantName} · ` : ''}Qty {item.quantity}
                      </p>
                      {item.warning && <p className="text-xs text-destructive">{item.warning}</p>}
                    </div>
                    <span className="text-sm">{formatCurrency(item.subtotal)}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
                {quote ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(quote.subtotal, quote.currency)}</span>
                    </div>
                    {quote.discountTotal > 0 && (
                      <div className="flex justify-between text-accent">
                        <span>Discount</span>
                        <span>-{formatCurrency(quote.discountTotal, quote.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery</span>
                      <span>{quote.deliveryFee === 0 ? 'Free' : formatCurrency(quote.deliveryFee, quote.currency)}</span>
                    </div>
                    {quote.deliveryFee > 0 && quote.freeDeliveryThreshold > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Free delivery on orders over {formatCurrency(quote.freeDeliveryThreshold, quote.currency)}.
                      </p>
                    )}
                    <div className="flex justify-between border-t border-border pt-2 font-display text-lg font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(quote.total, quote.currency)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">{quoteQuery.isLoading ? 'Calculating totals...' : 'Totals unavailable'}</p>
                )}
              </div>

              {quoteError && <p role="alert" className="text-sm text-destructive">{quoteError}</p>}
              {cart.hasIssues && !quoteError && (
                <p role="alert" className="text-sm text-destructive">Some items in your bag are unavailable. Please update your bag.</p>
              )}
              {orderError && <p role="alert" className="text-sm text-destructive">{orderError}</p>}

              <Button
                size="lg"
                variant="accent"
                className="w-full"
                disabled={!activeAddressId || !quote || blocked || isPlacingOrder}
                onClick={handlePlaceOrder}
              >
                {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
              </Button>
              {!activeAddressId && <p className="text-center text-xs text-muted-foreground">Add a delivery address to place your order.</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Delivery Address</DialogTitle>
            <DialogDescription>Where should we deliver your order?</DialogDescription>
          </DialogHeader>
          <AddressForm
            onSuccess={(addr) => {
              if (addr) setSelectedAddressId(addr.id);
              setAddressDialogOpen(false);
            }}
            onCancel={() => setAddressDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
