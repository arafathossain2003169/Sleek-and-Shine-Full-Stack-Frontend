'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Pagination } from '@/components/shared/pagination';
import { QueryError } from '@/components/shared/query-error';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useAuthStore } from '@/stores/auth.store';
import { canWriteCatalog } from '@/lib/permissions';
import { formatDate } from '@/lib/utils';
import { toast } from '@/stores/toast.store';
import { AdminCustomer } from '@/types/admin';

const PAGE_SIZE = 20;

export default function AdminCustomersPage() {
  const queryClient = useQueryClient();
  // Order managers can look customers up; only admins/managers can block them (matches the API).
  const canBlock = canWriteCatalog(useAuthStore((s) => s.user?.role));
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim());
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<AdminCustomer | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'customers', { search: debounced, page }],
    queryFn: () => adminApi.customers.list({ search: debounced || undefined, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const customers = data?.data.customers ?? [];

  async function confirmToggle() {
    if (!target) return;
    const next = target.status === 'active' ? 'blocked' : 'active';
    setBusy(true);
    try {
      await adminApi.customers.updateStatus(target.id, next);
      toast({ title: `Customer ${next === 'active' ? 'unblocked' : 'blocked'}`, variant: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
    } catch (err) {
      toast({ title: 'Could not update customer', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
      setTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">Customers</h1>

      <Input
        aria-label="Search customers"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="max-w-sm"
      />

      {error && !data ? <QueryError error={error} onRetry={() => refetch()} /> : isLoading ? <Skeleton className="h-96 w-full" /> : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Joined</TableHead><TableHead>Status</TableHead>
                {canBlock && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                  <TableCell><Badge variant={c.status === 'active' ? 'accent' : 'destructive'}>{c.status}</Badge></TableCell>
                  {canBlock && (
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setTarget(c)}>{c.status === 'active' ? 'Block' : 'Unblock'}</Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {customers.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No customers found.</p>}
        </div>
      )}

      <Pagination page={page} totalPages={Number(data?.meta?.totalPages ?? 1)} onChange={setPage} />

      <ConfirmDialog
        open={!!target}
        onOpenChange={(open) => !open && setTarget(null)}
        isDestructive={target?.status === 'active'}
        title={target?.status === 'active' ? `Block ${target?.name}?` : `Unblock ${target?.name}?`}
        description={target?.status === 'active'
          ? 'They are signed out immediately and cannot log in or place orders until unblocked.'
          : 'They will be able to log in and order again.'}
        onConfirm={confirmToggle}
        isLoading={busy}
      />
    </div>
  );
}
