'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { ProductVariant } from '@/types/product';
import { toast } from '@/stores/toast.store';
import { formatCurrency } from '@/lib/utils';

interface VariantForm {
  name: string;
  sku: string;
  price: string;
  salePrice: string;
  stockQuantity: string;
  status: 'active' | 'inactive';
}

const EMPTY: VariantForm = { name: '', sku: '', price: '', salePrice: '', stockQuantity: '0', status: 'active' };
const isMoney = (v: string) => /^\d{1,7}(\.\d{1,2})?$/.test(v.trim());

function validate(form: VariantForm, creating: boolean): string | null {
  if (!form.name.trim()) return 'Enter a name for the variant.';
  if (form.price.trim() && !isMoney(form.price)) return 'Price must be a number with at most 2 decimals.';
  if (form.salePrice.trim() && !isMoney(form.salePrice)) return 'Sale price must be a number with at most 2 decimals.';
  if (form.salePrice.trim() && !form.price.trim()) return 'Set a price override before adding a sale price override.';
  if (form.salePrice.trim() && Number(form.salePrice) >= Number(form.price)) return 'Sale price must be lower than the price.';
  if (creating && !/^\d{1,7}$/.test(form.stockQuantity.trim())) return 'Stock must be a whole number (0 or more).';
  return null;
}

export function ProductVariantsManager({ productId, variants }: { productId: string; variants: ProductVariant[] }) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<{ mode: 'create' } | { mode: 'edit'; variant: ProductVariant } | null>(null);
  const [form, setForm] = useState<VariantForm>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductVariant | null>(null);
  // stock edits stay local until the admin presses Save (the old onBlur auto-save fired on every blur)
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});
  const [savingStockId, setSavingStockId] = useState<string | null>(null);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] }),
    ]);

  function openCreate() {
    setForm(EMPTY);
    setFormError(null);
    setDialog({ mode: 'create' });
  }

  function openEdit(v: ProductVariant) {
    setForm({
      name: v.name,
      sku: v.sku ?? '',
      price: v.price != null ? String(v.price) : '',
      salePrice: v.salePrice != null ? String(v.salePrice) : '',
      stockQuantity: String(v.stockQuantity),
      status: v.status,
    });
    setFormError(null);
    setDialog({ mode: 'edit', variant: v });
  }

  async function handleSubmit() {
    if (!dialog) return;
    const problem = validate(form, dialog.mode === 'create');
    if (problem) return setFormError(problem);
    setIsSaving(true);
    setFormError(null);
    try {
      if (dialog.mode === 'create') {
        await adminApi.products.createVariant(productId, {
          name: form.name.trim(),
          sku: form.sku.trim() || undefined,
          price: form.price.trim() ? Number(form.price) : undefined,
          salePrice: form.salePrice.trim() ? Number(form.salePrice) : undefined,
          stockQuantity: Number(form.stockQuantity),
          status: form.status,
        });
        toast({ title: 'Variant added', variant: 'success' });
      } else {
        // null clears an override; stock is changed through the inventory flow below
        await adminApi.products.updateVariant(productId, dialog.variant.id, {
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          price: form.price.trim() ? Number(form.price) : null,
          salePrice: form.salePrice.trim() ? Number(form.salePrice) : null,
          status: form.status,
        });
        toast({ title: 'Variant updated', variant: 'success' });
      }
      setDialog(null);
      await refresh();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save the variant'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await adminApi.products.deleteVariant(productId, deleteTarget.id);
      toast({ title: 'Variant removed', variant: 'success' });
      await refresh();
    } catch (err) {
      toast({ title: 'Could not remove variant', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  }

  async function saveStock(v: ProductVariant) {
    const raw = (stockDraft[v.id] ?? '').trim();
    if (!/^\d{1,7}$/.test(raw)) {
      toast({ title: 'Invalid stock', description: 'Enter a whole number (0 or more).', variant: 'destructive' });
      return;
    }
    setSavingStockId(v.id);
    try {
      // Goes through the audited inventory endpoint so a movement is recorded.
      await adminApi.inventory.adjust({
        productId, variantId: v.id, newQuantity: Number(raw), reason: 'Manual correction (product editor)',
      });
      setStockDraft((d) => { const { [v.id]: _drop, ...rest } = d; return rest; });
      toast({ title: 'Stock updated', variant: 'success' });
      await refresh();
    } catch (err) {
      toast({ title: 'Could not update stock', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setSavingStockId(null);
    }
  }

  const field = (key: keyof VariantForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Variant
        </Button>
      </div>

      {variants.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No variants yet. Without variants this product is sold as a single item and its stock status is set manually.
          Add variants (sizes, shades...) to track stock for each one.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v) => {
                const draft = stockDraft[v.id];
                const dirty = draft !== undefined && draft !== String(v.stockQuantity);
                return (
                  <TableRow key={v.id}>
                    <TableCell>{v.name}</TableCell>
                    <TableCell className="text-muted-foreground">{v.sku ?? '—'}</TableCell>
                    <TableCell>{v.price !== null ? formatCurrency(v.finalPrice ?? v.price) : <span className="text-muted-foreground">Product price</span>}</TableCell>
                    <TableCell><Badge variant={v.status === 'active' ? 'accent' : 'muted'}>{v.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          aria-label={`Stock for ${v.name}`}
                          value={draft ?? String(v.stockQuantity)}
                          onChange={(e) => setStockDraft({ ...stockDraft, [v.id]: e.target.value })}
                          className="h-8 w-20"
                        />
                        {dirty && (
                          <Button type="button" size="sm" variant="accent" disabled={savingStockId === v.id} onClick={() => saveStock(v)}>
                            {savingStockId === v.id ? '...' : 'Save'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(v)} aria-label={`Edit ${v.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteTarget(v)} aria-label={`Delete ${v.name}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.mode === 'edit' ? 'Edit Variant' : 'Add Variant'}</DialogTitle>
            <DialogDescription>
              {dialog?.mode === 'edit'
                ? 'Leave a price override empty to use the product price. Stock is edited in the table.'
                : 'Overrides are optional; leave them empty to use the product price.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="variantName">Name</Label>
              <Input id="variantName" {...field('name')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="variantSku">SKU</Label>
                <Input id="variantSku" {...field('sku')} />
              </div>
              {dialog?.mode === 'create' ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="variantStock">Initial stock</Label>
                  <Input id="variantStock" type="number" min={0} {...field('stockQuantity')} />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="variantStatus">Status</Label>
                  <select
                    id="variantStatus"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as VariantForm['status'] })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive (hidden)</option>
                  </select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="variantPrice">Price override</Label>
                <Input id="variantPrice" inputMode="decimal" {...field('price')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="variantSalePrice">Sale price override</Label>
                <Input id="variantSalePrice" inputMode="decimal" {...field('salePrice')} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button type="button" variant="accent" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Saving...' : dialog?.mode === 'edit' ? 'Save Changes' : 'Add Variant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete “${deleteTarget?.name ?? ''}”?`}
        description="This also removes the variant's images and takes it out of any shopper's cart. Past orders keep their details."
        onConfirm={handleDelete}
      />
    </div>
  );
}
