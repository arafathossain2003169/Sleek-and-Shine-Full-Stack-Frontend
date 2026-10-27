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
import { fromLocalInput, toLocalInput } from '@/lib/datetime';
import { toast } from '@/stores/toast.store';
import { ContentSection } from '@/types/admin';

const SECTION_TYPES = ['hero', 'banner', 'offer', 'new_arrival', 'featured_category', 'custom'];

interface Form {
  type: string; title: string; subtitle: string; imageUrl: string; buttonText: string; buttonLink: string;
  sortOrder: string; startsAt: string; endsAt: string; isActive: boolean;
}
const EMPTY: Form = {
  type: 'banner', title: '', subtitle: '', imageUrl: '', buttonText: '', buttonLink: '', sortOrder: '0', startsAt: '', endsAt: '', isActive: true,
};

export default function AdminContentPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'content'], queryFn: () => adminApi.content.list() });
  const sections = data?.data.sections ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContentSection | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContentSection | null>(null);

  function openCreate() { setEditing(null); setForm(EMPTY); setFormError(null); setDialogOpen(true); }
  function openEdit(s: ContentSection) {
    setEditing(s);
    setForm({
      type: s.type, title: s.title, subtitle: s.subtitle ?? '', imageUrl: s.image_url ?? '', buttonText: s.button_text ?? '',
      buttonLink: s.button_link ?? '', sortOrder: String(s.sort_order), startsAt: toLocalInput(s.starts_at),
      endsAt: toLocalInput(s.ends_at), isActive: s.is_active,
    });
    setFormError(null);
    setDialogOpen(true);
  }
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'content'] }),
      queryClient.invalidateQueries({ queryKey: ['content'] }),
    ]);

  async function handleSave() {
    if (!form.title.trim()) return setFormError('Enter a title.');
    const link = form.buttonLink.trim();
    if (link && !(link.startsWith('/') && !link.startsWith('//')) && !/^https?:\/\/\S+$/i.test(link)) {
      return setFormError('The button link must start with "/" (e.g. /shop) or "https://".');
    }
    if (form.imageUrl.trim() && !/^https?:\/\/\S+$/i.test(form.imageUrl.trim())) return setFormError('The image URL must start with https://');
    if (!/^\d{1,6}$/.test(form.sortOrder.trim())) return setFormError('Sort order must be a whole number.');
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) return setFormError('The end must be after the start.');

    setIsSaving(true);
    setFormError(null);
    try {
      // null clears a value (undefined would silently keep the old one)
      const payload = {
        type: form.type, title: form.title.trim(), subtitle: form.subtitle.trim() || null,
        imageUrl: form.imageUrl.trim() || null, buttonText: form.buttonText.trim() || null, buttonLink: link || null,
        sortOrder: Number(form.sortOrder), isActive: form.isActive,
        startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt),
      };
      if (editing) await adminApi.content.update(editing.id, payload);
      else await adminApi.content.create(payload);
      toast({ title: editing ? 'Section updated' : 'Section created', variant: 'success' });
      setDialogOpen(false);
      await refresh();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save section'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await adminApi.content.delete(deleteTarget.id);
      toast({ title: 'Section deleted', variant: 'success' });
      await refresh();
    } catch (err) {
      toast({ title: 'Could not delete section', description: getErrorMessage(err), variant: 'destructive' });
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
        <h1 className="font-display text-2xl font-semibold">Homepage Content</h1>
        <Button variant="accent" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Add Section</Button>
      </div>

      {error && !data ? <QueryError error={error} onRetry={() => refetch()} title="Could not load homepage sections" /> : isLoading ? <Skeleton className="h-72 w-full" /> : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Order</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{s.type.replace('_', ' ')}</TableCell>
                  <TableCell className="text-muted-foreground">{s.sort_order}</TableCell>
                  <TableCell><Badge variant={s.is_active ? 'accent' : 'muted'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)} aria-label={`Edit ${s.title}`}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s)} aria-label={`Delete ${s.title}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sections.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No homepage sections yet.</p>}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Section' : 'Add Section'}</DialogTitle>
            <DialogDescription>The “hero” section controls the main banner of the homepage.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="secType">Type</Label>
                <select id="secType" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {SECTION_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="secOrder">Sort order</Label>
                <Input id="secOrder" inputMode="numeric" {...field('sortOrder')} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="secTitle">Title</Label><Input id="secTitle" {...field('title')} /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="secSub">Subtitle</Label><Input id="secSub" {...field('subtitle')} /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="secImg">Image URL</Label><Input id="secImg" type="url" placeholder="https://..." {...field('imageUrl')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5"><Label htmlFor="secBtn">Button text</Label><Input id="secBtn" {...field('buttonText')} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="secLink">Button link</Label><Input id="secLink" placeholder="/shop" {...field('buttonLink')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5"><Label htmlFor="secStart">Show from</Label><Input id="secStart" type="datetime-local" {...field('startsAt')} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="secEnd">Show until</Label><Input id="secEnd" type="datetime-local" {...field('endsAt')} /></div>
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
        title={`Delete “${deleteTarget?.title ?? ''}”?`}
        description="The section is removed from the homepage."
        onConfirm={handleDelete}
      />
    </div>
  );
}
