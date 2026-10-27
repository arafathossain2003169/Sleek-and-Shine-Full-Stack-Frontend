'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { ordersApi } from '@/lib/api/orders';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { OrderStatusBadge } from '@/components/shared/status-badge';
import { OrderProgressBar } from '@/components/orders/order-progress';
import { Pagination } from '@/components/shared/pagination';
import { QueryError } from '@/components/shared/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';

const PAGE_SIZE = 10;

function OrdersContent() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', 'my', 'list', page],
    queryFn: () => ordersApi.listMy({ page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    // a fresh order must show up at once (no stale 30s window)
    staleTime: 0,
  });

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 font-display text-3xl font-semibold">My Orders</h1>

      {error && !data ? (
        <QueryError error={error} onRetry={() => refetch()} title="Could not load your orders" />
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !data?.data.orders.length ? (
        <EmptyState icon={Package} title="No orders yet" description="Your order history will appear here." />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {data.data.orders.map((order) => (
              <Link key={order.id} href={`/account/orders/${order.order_number}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-3 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.created_at)} · {order.items.length} item{order.items.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <OrderStatusBadge status={order.status} />
                        <span className="text-sm font-medium">{formatCurrency(order.total, order.currency)}</span>
                      </div>
                    </div>
                    <OrderProgressBar status={order.status} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={Number(data.meta?.totalPages ?? 1)} onChange={setPage} />
        </>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersContent />
    </ProtectedRoute>
  );
}
