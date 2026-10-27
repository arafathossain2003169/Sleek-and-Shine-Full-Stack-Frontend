'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { useAuthStore } from '@/stores/auth.store';
import { canWriteCatalog } from '@/lib/permissions';
import { useAdminBrands } from '@/lib/hooks/useAdminData';
import { toast } from '@/stores/toast.store';
import { Brand } from '@/types/product';

interface Form { name: string; slug: string; description: string; logoUrl: string; isActive: boolean }
const EMPTY: Form = { name: '', slug: '', description: '', logoUrl: '', isActive: true };

export default function AdminBrandsPage() {
  const queryClient = useQueryClient();
  const canWrite = canWriteCatalog(useAuthStore((s) => s.user?.role));
  const { data, isLoading, error, refetch } = useAdminBrands();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);

  function openCreate() { setEditing(null); setForm(EMPTY); setFormError(null); setDialogOpen(true); }
  function openEdit(b: Brand) {
    setEditing(b);
    setForm({ name: b.name, slug: b.slug, description: b.description ?? '', logoUrl: b.logo_url ?? '', isActive: b.is_active ?? true });
    setFormError(null);
    setDialogOpen(true);
  }
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'brands'] }),
      queryClient.invalidateQueries({ queryKey: ['brands'] }),
    ]);

  async function handleSave() {
    if (!form.name.trim()) return setFormError('Enter a name.');
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        logoUrl: form.logoUrl.trim() || null,
        isActive: form.isActive,
        ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
      };
      if (editing) await adminApi.brands.update(editing.id, payload);
      else await adminApi.brands.create(payload);
      toast({ title: editing ? 'Brand updated' : 'Brand created', variant: 'success' });
      setDialogOpen(false);
      await refresh();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save brand'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await adminApi.brands.delete(deleteTarget.id);
      toast({ title: 'Brand deleted', variant: 'success' });
      await refresh();
    } catch (err) {
      toast({ title: 'Could not delete brand', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  }

  const brands = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Brands</h1>
        {canWrite && <Button variant="accent" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Add Brand</Button>}
      </div>

      {error && !data ? <QueryError error={error} onRetry={() => refetch()} /> : isLoading ? <Skeleton className="h-72 w-full" /> : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead>{canWrite && <TableHead className="text-right">Actions</TableHead>}</TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell className="text-muted-foreground">{brand.slug}</TableCell>
                  <TableCell><Badge variant={brand.is_active ? 'accent' : 'muted'}>{brand.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(brand)} aria-label={`Edit ${brand.name}`}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(brand)} aria-label={`Delete ${brand.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {brands.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No brands yet.</p>}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
            <DialogDescription>Inactive brands and their products are hidden from the store.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brandName">Name</Label>
              <Input id="brandName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brandSlug">URL slug (optional)</Label>
              <Input id="brandSlug" placeholder="generated from the name" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brandLogo">Logo URL (optional)</Label>
              <Input id="brandLogo" type="url" placeholder="https://..." value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brandDesc">Description</Label>
              <Input id="brandDesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
        title={`Delete “${deleteTarget?.name ?? ''}”?`}
        description="Products of this brand stay in the store but lose their brand."
        onConfirm={handleDelete}
      />
    </div>
  );
}
