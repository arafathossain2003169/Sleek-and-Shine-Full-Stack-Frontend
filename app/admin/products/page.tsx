'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Copy, Pencil, Trash2, Archive } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Pagination } from '@/components/shared/pagination';
import { QueryError } from '@/components/shared/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useAuthStore } from '@/stores/auth.store';
import { canWriteCatalog } from '@/lib/permissions';
import { formatCurrency } from '@/lib/utils';
import { PRODUCT_STATUS_OPTIONS } from '@/lib/constants';
import { toast } from '@/stores/toast.store';

const STATUS_VARIANT: Record<string, 'default' | 'accent' | 'muted' | 'destructive'> = {
  draft: 'muted',
  published: 'accent',
  hidden: 'muted',
  archived: 'destructive',
};

const PAGE_SIZE = 20;

export default function AdminProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canWrite = canWriteCatalog(useAuthStore((s) => s.user?.role));
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'products', { search: debouncedSearch, status, page }],
    queryFn: () =>
      adminApi.products.list({ search: debouncedSearch || undefined, status: status || undefined, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });

  async function handleDuplicate(id: string) {
    try {
      await adminApi.products.duplicate(id);
      toast({ title: 'Product duplicated', description: 'The copy is a draft with no images and zero stock.', variant: 'success' });
      refresh();
    } catch (err) {
      toast({ title: 'Could not duplicate product', description: getErrorMessage(err), variant: 'destructive' });
    }
  }

  async function handleArchive(id: string) {
    try {
      await adminApi.products.updateStatus(id, 'archived');
      toast({ title: 'Product archived', description: 'It is hidden from the store but kept for order history.', variant: 'success' });
      refresh();
    } catch (err) {
      toast({ title: 'Could not archive product', description: getErrorMessage(err), variant: 'destructive' });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await adminApi.products.delete(deleteTarget);
      toast({ title: 'Product deleted', variant: 'success' });
      refresh();
    } catch (err) {
      // e.g. 409 "appears in existing orders - archive it instead" is shown verbatim
      toast({ title: 'Could not delete product', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  const totalPages = Number(data?.meta?.totalPages ?? 1);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Products</h1>
        {canWrite && (
          <Button variant="accent" onClick={() => router.push('/admin/products/new')}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Product
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search products"
            placeholder="Search products..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-40" aria-label="Filter by status"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PRODUCT_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && !data ? (
        <QueryError error={error} onRetry={() => refetch()} title="Could not load products" />
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stock</TableHead>
                {canWrite && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Link href={`/admin/products/${product.id}`} className="font-medium hover:underline">
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.category?.name ?? '—'}</TableCell>
                  <TableCell>{formatCurrency(product.finalPrice ?? product.basePrice, product.currency)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[product.status] ?? 'muted'} className="capitalize">{product.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.variants !== undefined && product.totalStock !== undefined && product.hasVariants
                      ? <span>{product.totalStock} units · <span className="capitalize">{product.stockStatus.replace('_', ' ')}</span></span>
                      : <span className="capitalize">{product.stockStatus.replace('_', ' ')}</span>}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/products/${product.id}`)} aria-label={`Edit ${product.name}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDuplicate(product.id)} aria-label={`Duplicate ${product.name}`}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        {product.status !== 'archived' && (
                          <Button variant="ghost" size="icon" onClick={() => handleArchive(product.id)} aria-label={`Archive ${product.name}`}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(product.id)} aria-label={`Delete ${product.name}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data?.data.products.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No products found.</p>
          )}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete product?"
        description="This permanently removes the product, its variants and images. Products that appear in past orders cannot be deleted — archive them instead."
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
