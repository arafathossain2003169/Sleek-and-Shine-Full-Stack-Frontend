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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Pagination } from '@/components/shared/pagination';
import { QueryError } from '@/components/shared/query-error';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { formatDateTime } from '@/lib/utils';
import { toast } from '@/stores/toast.store';
import { InventoryRow } from '@/types/admin';

const PAGE_SIZE = 25;
const REASONS = ['Manual correction', 'Stock count', 'New shipment received', 'Damaged / expired', 'Returned to supplier'];

export default function AdminInventoryPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">Inventory</h1>
      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock levels</TabsTrigger>
          <TabsTrigger value="history">Movement history</TabsTrigger>
        </TabsList>
        <TabsContent value="stock"><StockTable /></TabsContent>
        <TabsContent value="history"><MovementHistory /></TabsContent>
      </Tabs>
    </div>
  );
}

function StockTable() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim());
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'inventory', { search: debounced, lowOnly, page }],
    queryFn: () => adminApi.inventory.list({ search: debounced || undefined, lowStock: lowOnly ? 'true' : undefined, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const [target, setTarget] = useState<InventoryRow | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openAdjust(row: InventoryRow) {
    setTarget(row);
    setNewQuantity(String(row.stock_quantity));
    setReason(REASONS[0]);
    setNote('');
    setFormError(null);
  }

  async function handleAdjust() {
    if (!target) return;
    if (!/^\d{1,7}$/.test(newQuantity.trim())) return setFormError('Enter a whole number (0 or more).');
    if (Number(newQuantity) === target.stock_quantity) return setFormError('The quantity is unchanged.');
    setIsSaving(true);
    setFormError(null);
    try {
      await adminApi.inventory.adjust({
        productId: target.product_id,
        variantId: target.variant_id,
        newQuantity: Number(newQuantity),
        reason,
        note: note.trim() || undefined,
      });
      toast({ title: 'Stock adjusted', variant: 'success' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
      ]);
      setTarget(null);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not adjust stock'));
    } finally {
      setIsSaving(false);
    }
  }

  const rows = data?.data.inventory ?? [];
  const LOW_STOCK = data?.data.lowStockThreshold ?? 10; // configurable under Admin → Settings
  const totalPages = Number(data?.meta?.totalPages ?? 1);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <Input
          aria-label="Search inventory"
          placeholder="Search product, variant or SKU..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={lowOnly} onCheckedChange={(v) => { setLowOnly(v === true); setPage(1); }} />
          Low stock only (≤ {LOW_STOCK})
        </label>
      </div>

      {error && !data ? (
        <QueryError error={error} onRetry={() => refetch()} title="Could not load inventory" />
      ) : isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.variant_id}>
                  <TableCell>{row.product_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.variant_name} {row.status !== 'active' && <Badge variant="muted">inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.sku ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={row.stock_quantity <= LOW_STOCK ? 'destructive' : 'muted'}>{row.stock_quantity}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openAdjust(row)}>Adjust</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No stock records match.</p>}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>{target?.product_name} — {target?.variant_name} (currently {target?.stock_quantity})</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newQuantity">New quantity</Label>
              <Input id="newQuantity" type="number" min={0} value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">Reason</Label>
              <select id="reason" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adjNote">Note (optional)</Label>
              <Input id="adjNote" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button variant="accent" onClick={handleAdjust} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MovementHistory() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'inventory', 'movements', page],
    queryFn: () => adminApi.inventory.movements({ page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const movements = data?.data.movements ?? [];

  return (
    <div className="mt-4 flex flex-col gap-4">
      {error && !data ? (
        <QueryError error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead><TableHead>Product</TableHead><TableHead>Change</TableHead><TableHead>Reason</TableHead><TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-muted-foreground">{formatDateTime(m.created_at)}</TableCell>
                  <TableCell>{m.product_name}{m.variant_name ? ` — ${m.variant_name}` : ''}</TableCell>
                  <TableCell>
                    <span className={m.change_quantity < 0 ? 'text-destructive' : 'text-accent'}>
                      {m.change_quantity > 0 ? '+' : ''}{m.change_quantity}
                    </span>{' '}
                    <span className="text-xs text-muted-foreground">({m.previous_quantity} → {m.new_quantity})</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.reason}{m.note ? ` · ${m.note}` : ''}</TableCell>
                  <TableCell className="text-muted-foreground">{m.admin_name ?? 'System'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {movements.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No stock movements yet.</p>}
        </div>
      )}
      <Pagination page={page} totalPages={Number(data?.meta?.totalPages ?? 1)} onChange={setPage} />
    </div>
  );
}
