'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { QueryError } from '@/components/shared/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { fromLocalInput, toLocalInput } from '@/lib/datetime';
import { toast } from '@/stores/toast.store';
import { Coupon } from '@/types/admin';

interface Form {
  code: string; type: 'percentage' | 'fixed'; value: string; minOrderAmount: string; maxDiscount: string;
  usageLimit: string; perUserLimit: string; startsAt: string; endsAt: string; isActive: boolean;
}
const EMPTY: Form = {
  code: '', type: 'percentage', value: '', minOrderAmount: '', maxDiscount: '', usageLimit: '', perUserLimit: '',
  startsAt: '', endsAt: '', isActive: true,
};

const num = (v: string) => (v.trim() === '' ? null : Number(v));
const isMoney = (v: string) => v.trim() === '' || /^\d{1,7}(\.\d{1,2})?$/.test(v.trim());
const isInt = (v: string) => v.trim() === '' || /^[1-9]\d{0,8}$/.test(v.trim());

function validate(f: Form): string | null {
  if (!/^[A-Za-z0-9_-]{2,50}$/.test(f.code.trim())) return 'Code: 2–50 letters, numbers, - or _.';
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(f.value.trim()) || Number(f.value) <= 0) return 'Enter a discount value above 0.';
  if (f.type === 'percentage' && Number(f.value) > 100) return 'A percentage discount cannot exceed 100.';
  if (!isMoney(f.minOrderAmount) || !isMoney(f.maxDiscount)) return 'Amounts must be numbers with at most 2 decimals.';
  if (!isInt(f.usageLimit) || !isInt(f.perUserLimit)) return 'Limits must be whole numbers above 0.';
  if (f.startsAt && f.endsAt && new Date(f.endsAt) <= new Date(f.startsAt)) return 'The end date must be after the start date.';
  return null;
}

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'coupons'], queryFn: () => adminApi.coupons.list() });
  const coupons = data?.data.coupons ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  function openCreate() { setEditing(null); setForm(EMPTY); setFormError(null); setDialogOpen(true); }
  function openEdit(c: Coupon) {
    setEditing(c);
    setForm({
      code: c.code, type: c.type, value: String(Number(c.value)),
      minOrderAmount: c.min_order_amount != null ? String(Number(c.min_order_amount)) : '',
      maxDiscount: c.max_discount != null ? String(Number(c.max_discount)) : '',
      usageLimit: c.usage_limit != null ? String(c.usage_limit) : '',
      perUserLimit: c.per_user_limit != null ? String(c.per_user_limit) : '',
      startsAt: toLocalInput(c.starts_at), endsAt: toLocalInput(c.ends_at), isActive: c.is_active,
    });
    setFormError(null);
    setDialogOpen(true);
  }
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });

  async function handleSave() {
    const problem = validate(form);
    if (problem) return setFormError(problem);
    setIsSaving(true);
    setFormError(null);
    try {
      // null = clear the limit (the old form sent `undefined`, so a limit could never be removed)
      const payload = {
        code: form.code.trim(), type: form.type, value: Number(form.value),
        minOrderAmount: num(form.minOrderAmount), maxDiscount: num(form.maxDiscount),
        usageLimit: num(form.usageLimit), perUserLimit: num(form.perUserLimit),
        startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt), isActive: form.isActive,
      };
      if (editing) await adminApi.coupons.update(editing.id, payload);
      else await adminApi.coupons.create(payload);
      toast({ title: editing ? 'Coupon updated' : 'Coupon created', variant: 'success' });
      setDialogOpen(false);
      await refresh();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save coupon'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await adminApi.coupons.delete(deleteTarget.id);
      toast({ title: 'Coupon deleted', variant: 'success' });
      await refresh();
    } catch (err) {
      toast({ title: 'Could not delete coupon', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  }

  const field = (key: keyof Form) => ({
    value: String(form[key]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Coupons</h1>
        <Button variant="accent" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Add Coupon</Button>
      </div>

      {error && !data ? <QueryError error={error} onRetry={() => refetch()} /> : isLoading ? <Skeleton className="h-72 w-full" /> : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Code</TableHead><TableHead>Value</TableHead><TableHead>Valid</TableHead><TableHead>Usage</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.code}</TableCell>
                  <TableCell>{c.type === 'percentage' ? `${Number(c.value)}%` : formatCurrency(Number(c.value))}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.starts_at || c.ends_at ? `${c.starts_at ? formatDate(c.starts_at) : '…'} → ${c.ends_at ? formatDate(c.ends_at) : '…'}` : 'Always'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</TableCell>
                  <TableCell><Badge variant={c.is_active ? 'accent' : 'muted'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label={`Edit ${c.code}`}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)} aria-label={`Delete ${c.code}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {coupons.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No coupons yet.</p>}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Coupon' : 'Add Coupon'}</DialogTitle>
            <DialogDescription>Leave an optional field empty for “no limit”.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="couponCode">Code</Label>
              <Input id="couponCode" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="couponType">Type</Label>
                <select id="couponType" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Form['type'] })}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="couponValue">Value {form.type === 'percentage' ? '(%)' : ''}</Label>
                <Input id="couponValue" inputMode="decimal" {...field('value')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minOrder">Min order amount</Label>
                <Input id="minOrder" inputMode="decimal" {...field('minOrderAmount')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="maxDiscount">Max discount</Label>
                <Input id="maxDiscount" inputMode="decimal" {...field('maxDiscount')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="usageLimit">Total uses</Label>
                <Input id="usageLimit" inputMode="numeric" {...field('usageLimit')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="perUserLimit">Uses per customer</Label>
                <Input id="perUserLimit" inputMode="numeric" {...field('perUserLimit')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="startsAt">Starts</Label>
                <Input id="startsAt" type="datetime-local" {...field('startsAt')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="endsAt">Ends</Label>
                <Input id="endsAt" type="datetime-local" {...field('endsAt')} />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v === true })} />
              <span className="text-sm">Active</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete coupon ${deleteTarget?.code ?? ''}?`}
        description="It can no longer be used at checkout. Past orders keep their discount."
        onConfirm={handleDelete}
      />
    </div>
  );
}
