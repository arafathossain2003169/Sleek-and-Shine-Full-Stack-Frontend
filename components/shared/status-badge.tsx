import { Badge } from '@/components/ui/badge';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants';

const STATUS_VARIANT: Record<string, 'default' | 'accent' | 'soft' | 'muted' | 'destructive'> = {
  pending: 'muted',
  confirmed: 'soft',
  processing: 'soft',
  packed: 'soft',
  shipped: 'accent',
  delivered: 'accent',
  cancelled: 'destructive',
  returned: 'destructive',
  refunded: 'destructive',
  failed_payment: 'destructive',
};

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? 'muted'}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const variant = status === 'paid' ? 'accent' : status === 'failed' ? 'destructive' : 'muted';
  return <Badge variant={variant}>{PAYMENT_STATUS_LABELS[status] ?? status}</Badge>;
}
