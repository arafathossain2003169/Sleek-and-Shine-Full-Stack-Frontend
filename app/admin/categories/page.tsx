'use client';

import { useMemo, useState } from 'react';
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
import { useAdminCategories } from '@/lib/hooks/useAdminData';
import { toast } from '@/stores/toast.store';
import { Category } from '@/types/product';

interface Form {
  name: string;
  slug: string;
  parentId: string;
  description: string;
  imageUrl: string;
  sortOrder: string;
  isActive: boolean;
}
const EMPTY: Form = { name: '', slug: '', parentId: '', description: '', imageUrl: '', sortOrder: '0', isActive: true };

/** All ids below `rootId` (so a category can't be offered as its own parent / descendant). */
function descendantIds(all: Category[], rootId: string): Set<string> {
  const out = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of all) if (c.parent_id && out.has(c.parent_id) && !out.has(c.id)) { out.add(c.id); grew = true; }
  }
  return out;
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const canWrite = canWriteCatalog(useAuthStore((s) => s.user?.role));
  // Shared hook => the cache entry for ['admin','categories'] always holds the same shape (an array).
  const { data, isLoading, error, refetch } = useAdminCategories();
  const categories = useMemo(() => data ?? [], [data]);
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const parentOptions = editing ? categories.filter((c) => !descendantIds(categories, editing.id).has(c.id)) : categories;

  function openCreate() {
    setEditing(null); setForm(EMPTY); setFormError(null); setDialogOpen(true);
  }
  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({
      name: cat.name, slug: cat.slug, parentId: cat.parent_id ?? '', description: cat.description ?? '',
      imageUrl: cat.image_url ?? '', sortOrder: String(cat.sort_order ?? 0), isActive: cat.is_active ?? true,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
    ]);

  async function handleSave() {
    if (form.name.trim().length < 1) return setFormError('Enter a name.');
    if (!/^\d{1,6}$/.test(form.sortOrder.trim())) return setFormError('Sort order must be a whole number.');
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        parentId: form.parentId || null,
        description: form.description.trim() || null, // null clears it
        imageUrl: form.imageUrl.trim() || null,
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
        ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
      };
      if (editing) await adminApi.categories.update(editing.id, payload);
      else await adminApi.categories.create(payload);
      toast({ title: editing ? 'Category updated' : 'Category created', variant: 'success' });
      setDialogOpen(false);
      await refresh();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save category'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await adminApi.categories.delete(deleteTarget.id);
      toast({ title: 'Category deleted', variant: 'success' });
      await refresh();
    } catch (err) {
      // e.g. "This category still contains 3 product(s)..." is shown as-is
      toast({ title: 'Could not delete category', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Categories</h1>
        {canWrite && <Button variant="accent" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Add Category</Button>}
      </div>

      {error && !data ? <QueryError error={error} onRetry={() => refetch()} /> : isLoading ? <Skeleton className="h-72 w-full" /> : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Parent</TableHead><TableHead>Slug</TableHead><TableHead>Order</TableHead>
                <TableHead>Status</TableHead>{canWrite && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-muted-foreground">{cat.parent_id ? byId.get(cat.parent_id)?.name ?? '—' : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                  <TableCell className="text-muted-foreground">{cat.sort_order ?? 0}</TableCell>
                  <TableCell><Badge variant={cat.is_active ? 'accent' : 'muted'}>{cat.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} aria-label={`Edit ${cat.name}`}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(cat)} aria-label={`Delete ${cat.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {categories.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No categories yet.</p>}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>Inactive categories (and their products) are hidden from the store.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="catName">Name</Label>
              <Input id="catName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="catParent">Parent category</Label>
                <select id="catParent" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                  <option value="">None (top level)</option>
                  {parentOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="catSort">Sort order</Label>
                <Input id="catSort" inputMode="numeric" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="catSlug">URL slug (optional)</Label>
              <Input id="catSlug" placeholder="generated from the name" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="catImage">Image URL (optional)</Label>
              <Input id="catImage" type="url" placeholder="https://..." value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="catDesc">Description</Label>
              <Input id="catDesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
        description="Categories that still contain products cannot be deleted: move the products first, or mark the category inactive to hide it. Sub-categories become top-level."
        onConfirm={handleDelete}
      />
    </div>
  );
}
