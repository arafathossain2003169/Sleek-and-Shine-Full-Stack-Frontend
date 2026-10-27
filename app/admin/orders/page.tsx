'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shared/status-badge';
import { Pagination } from '@/components/shared/pagination';
import { QueryError } from '@/components/shared/query-error';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_OPTIONS } from '@/lib/constants';

const PAGE_SIZE = 20;

export default function AdminOrdersPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'orders', { search: debouncedSearch, status, paymentStatus, page }],
    queryFn: () =>
      adminApi.orders.list({
        search: debouncedSearch || undefined,
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const totalPages = Number(data?.meta?.totalPages ?? 1);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">Orders</h1>

      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Search orders"
          placeholder="Search by order number, name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44" aria-label="Filter by order status"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s] ?? s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentStatus || 'all'} onValueChange={(v) => { setPaymentStatus(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44" aria-label="Filter by payment status"><SelectValue placeholder="All payments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            {PAYMENT_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{PAYMENT_STATUS_LABELS[s] ?? s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && !data ? (
        <QueryError error={error} onRetry={() => refetch()} title="Could not load orders" />
      ) : isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">{order.order_number}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{order.customer_name ?? '—'}</TableCell>
                  <TableCell><OrderStatusBadge status={order.status} /></TableCell>
                  <TableCell><PaymentStatusBadge status={order.payment_status} /></TableCell>
                  <TableCell>{formatCurrency(order.total, order.currency)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(order.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data?.data.orders.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No orders match these filters.</p>}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
