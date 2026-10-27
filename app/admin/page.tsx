'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, ShoppingCart, Package, AlertTriangle } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { StatCard } from '@/components/admin/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryError } from '@/components/shared/query-error';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.dashboard.stats(),
  });

  const stats = data?.data;

  if (error && !data) return <QueryError error={error} onRetry={() => refetch()} title="Could not load the dashboard" />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Dashboard</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={DollarSign} label="Revenue (paid orders)" value={formatCurrency(stats?.totalRevenue ?? 0)} />
          <StatCard icon={ShoppingCart} label="Orders" value={stats?.orderCount ?? 0} />
          <StatCard icon={Package} label="Total Products" value={stats?.productCount ?? 0} />
          <StatCard icon={AlertTriangle} label="Low Stock Items" value={stats?.lowStockCount ?? 0} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {stats?.recentOrders.length ? (
              stats.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between rounded-md border border-border p-3 text-sm hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.customer_name} · {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-xs font-medium">{formatCurrency(order.total)}</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Low Stock Alerts</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {stats?.lowStockItems.length ? (
              stats.lowStockItems.map((item) => (
                <Link
                  key={item.variant_id}
                  href={`/admin/inventory`}
                  className="flex items-center justify-between rounded-md border border-border p-3 text-sm hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                  </div>
                  <span className="text-xs font-medium text-destructive">
                    {item.stock_quantity} left
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">All stock levels look healthy.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
