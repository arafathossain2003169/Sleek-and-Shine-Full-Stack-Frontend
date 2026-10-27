'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { ordersApi } from '@/lib/api/orders';
import { getErrorMessage, isNotFound } from '@/lib/api/errors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { QueryError } from '@/components/shared/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderProgress } from '@/components/orders/order-progress';
import { PAYMENT_PROVIDER_LABELS } from '@/lib/constants';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from '@/stores/toast.store';

function OrderDetailContent() {
  const params = useParams<{ orderNumber: string }>();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', 'my', 'detail', params.orderNumber],
    queryFn: () => ordersApi.getMy(params.orderNumber),
    staleTime: 0,
    retry: (count, err) => !isNotFound(err) && count < 1,
  });

  async function handleCancel() {
    setCancelling(true);
    try {
      await ordersApi.cancelMy(params.orderNumber);
      toast({ title: 'Order cancelled', variant: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err) {
      toast({ title: 'Could not cancel the order', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setCancelling(false);
      setConfirmOpen(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }
  if (isNotFound(error)) return <div className="container py-16 text-center">Order not found.</div>;
  if (error || !data) return <div className="container max-w-2xl py-8"><QueryError error={error} onRetry={() => refetch()} title="Could not load this order" /></div>;

  const order = data.data.order;
  const history = order.status_history ?? [];

  return (
    <div className="container max-w-3xl py-8">
      <Link href="/account/orders" className="mb-4 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">Placed {formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.payment_status} />
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>Order progress</CardTitle></CardHeader>
        <CardContent>
          <OrderProgress status={order.status} history={history} />
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  {item.variantName && <p className="text-muted-foreground">{item.variantName}</p>}
                  <p className="text-muted-foreground">Qty {item.quantity}</p>
                </div>
                <span>{formatCurrency(item.totalPrice, order.currency)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(order.subtotal, order.currency)}</span></div>
            {order.discount_total > 0 && (
              <div className="flex justify-between text-accent"><span>Discount</span><span>-{formatCurrency(order.discount_total, order.currency)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{order.delivery_fee === 0 ? 'Free' : formatCurrency(order.delivery_fee, order.currency)}</span></div>
            <div className="flex justify-between font-display text-lg font-semibold"><span>Total</span><span>{formatCurrency(order.total, order.currency)}</span></div>
            <p className="pt-1 text-xs text-muted-foreground">
              Payment: {PAYMENT_PROVIDER_LABELS[order.payment_provider ?? ''] ?? order.payment_provider ?? '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Delivery Address</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{order.shipping_address.fullName}</p>
          <p>{order.shipping_address.phone}</p>
          <p>{order.shipping_address.addressLine1}{order.shipping_address.addressLine2 ? `, ${order.shipping_address.addressLine2}` : ''}</p>
          <p>{order.shipping_address.city}{order.shipping_address.zone ? `, ${order.shipping_address.zone}` : ''} {order.shipping_address.postalCode ?? ''}</p>
          <p>{order.shipping_address.country}</p>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {history.map((h, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <OrderStatusBadge status={h.status} />
                    {h.note && <p className="mt-1 text-muted-foreground">{h.note}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(h.created_at)}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {order.can_cancel && (
        <Button type="button" variant="outline" className="text-destructive" onClick={() => setConfirmOpen(true)}>
          Cancel this order
        </Button>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Cancel this order?"
        description="Your items go back into stock and this cannot be undone. You can always place a new order."
        onConfirm={handleCancel}
        isLoading={cancelling}
      />
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <ProtectedRoute>
      <OrderDetailContent />
    </ProtectedRoute>
  );
}
