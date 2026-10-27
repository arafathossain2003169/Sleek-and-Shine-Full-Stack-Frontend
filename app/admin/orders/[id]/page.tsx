'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { getErrorMessage, isNotFound } from '@/lib/api/errors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { OrderProgress } from '@/components/orders/order-progress';
import { QueryError } from '@/components/shared/query-error';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ORDER_STATUS_LABELS, ORDER_TRANSITIONS, PAYMENT_PROVIDER_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_OPTIONS,
} from '@/lib/constants';
import { toast } from '@/stores/toast.store';

const DESTRUCTIVE = new Set(['cancelled', 'returned', 'refunded', 'failed_payment']);

const CONFIRM_TEXT: Record<string, string> = {
  cancelled: 'The order is cancelled, its items go back into stock and any coupon use is released. This cannot be undone.',
  returned: 'The returned items go back into stock. This cannot be undone.',
  refunded: 'The order is closed as refunded and the payment is marked refunded. This cannot be undone.',
  failed_payment: 'The order is marked as having failed payment.',
};

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'orders', params.id],
    queryFn: () => adminApi.orders.getById(params.id),
    retry: (count, err) => !isNotFound(err) && count < 1,
  });
  const order = data?.data.order;

  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // Start from the SAVED note. (Previously the state began as "" so pressing Save without typing wiped the note.)
  useEffect(() => setNoteDraft(null), [order?.admin_note]);
  const noteValue = noteDraft ?? order?.admin_note ?? '';
  const noteDirty = noteDraft !== null && noteDraft !== (order?.admin_note ?? '');

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
    ]);

  async function changeStatus(status: string) {
    setBusy(true);
    try {
      await adminApi.orders.updateStatus(params.id, status);
      toast({ title: `Order marked ${ORDER_STATUS_LABELS[status] ?? status}`, variant: 'success' });
      await refresh();
    } catch (err) {
      toast({ title: 'Could not update status', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
      setPendingStatus(null);
    }
  }

  async function changePayment(paymentStatus: string) {
    setBusy(true);
    try {
      await adminApi.orders.updatePaymentStatus(params.id, paymentStatus);
      toast({ title: `Payment marked ${PAYMENT_STATUS_LABELS[paymentStatus] ?? paymentStatus}`, variant: 'success' });
      await refresh();
    } catch (err) {
      toast({ title: 'Could not update payment', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    setIsSavingNote(true);
    try {
      await adminApi.orders.updateAdminNote(params.id, noteValue);
      toast({ title: 'Note saved', variant: 'success' });
      await refresh();
    } catch (err) {
      toast({ title: 'Could not save note', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsSavingNote(false);
    }
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isNotFound(error)) return <p className="text-muted-foreground">Order not found.</p>;
  if (error || !order) return <QueryError error={error} onRetry={() => refetch()} title="Could not load this order" />;

  const nextStatuses = ORDER_TRANSITIONS[order.status] ?? [];
  const history = order.statusHistory ?? [];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/orders" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            {order.customer_name} · {order.customer_email} · {formatDateTime(order.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.payment_status} />
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          <OrderProgress status={order.status} history={history} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      {item.variantName && <p className="text-muted-foreground">{item.variantName}</p>}
                      <p className="text-muted-foreground">Qty {item.quantity} · SKU {item.sku ?? '—'}</p>
                    </div>
                    <span>{formatCurrency(item.totalPrice, order.currency)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(order.subtotal, order.currency)}</span></div>
                {order.discount_total > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatCurrency(order.discount_total, order.currency)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{formatCurrency(order.delivery_fee, order.currency)}</span></div>
                <div className="flex justify-between font-display text-lg font-semibold"><span>Total</span><span>{formatCurrency(order.total, order.currency)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
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
            <Card>
              <CardHeader><CardTitle>Status History</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-3">
                {history.map((h, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <OrderStatusBadge status={h.status} />
                      {h.note && <p className="mt-1 text-muted-foreground">{h.note}</p>}
                      {h.changed_by_name && <p className="text-xs text-muted-foreground">by {h.changed_by_name}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(h.created_at)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader><CardTitle>Update Status</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {nextStatuses.length === 0 ? (
                <p className="text-sm text-muted-foreground">This order is {ORDER_STATUS_LABELS[order.status] ?? order.status} and can no longer change.</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Move this order to:</p>
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.map((s) => (
                      <Button
                        key={s}
                        type="button"
                        size="sm"
                        variant={DESTRUCTIVE.has(s) ? 'outline' : 'accent'}
                        disabled={busy}
                        onClick={() => (DESTRUCTIVE.has(s) ? setPendingStatus(s) : changeStatus(s))}
                      >
                        {ORDER_STATUS_LABELS[s] ?? s}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="text-muted-foreground">
                Method: {PAYMENT_PROVIDER_LABELS[order.payment_provider ?? ''] ?? order.payment_provider ?? '—'}
              </p>
              <Select value={order.payment_status} onValueChange={changePayment} disabled={busy}>
                <SelectTrigger aria-label="Payment status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{PAYMENT_STATUS_LABELS[s] ?? s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Cash-on-delivery orders are marked paid automatically when delivered.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Admin Note</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Textarea
                aria-label="Admin note"
                rows={4}
                value={noteValue}
                onChange={(e) => setNoteDraft(e.target.value)}
                maxLength={2000}
                placeholder="Internal note (not visible to customer)"
              />
              <Button type="button" variant="outline" size="sm" onClick={saveNote} disabled={isSavingNote || !noteDirty} className="w-fit">
                {isSavingNote ? 'Saving...' : 'Save Note'}
              </Button>
            </CardContent>
          </Card>

          {order.customer_note && (
            <Card>
              <CardHeader><CardTitle>Customer Note</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{order.customer_note}</CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingStatus}
        onOpenChange={(open) => !open && setPendingStatus(null)}
        title={`Mark order as ${pendingStatus ? ORDER_STATUS_LABELS[pendingStatus] ?? pendingStatus : ''}?`}
        description={pendingStatus ? CONFIRM_TEXT[pendingStatus] ?? 'This changes the order status.' : ''}
        onConfirm={() => pendingStatus && changeStatus(pendingStatus)}
        isLoading={busy}
      />
    </div>
  );
}
