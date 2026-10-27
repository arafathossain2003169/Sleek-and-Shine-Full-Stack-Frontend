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
import { useAdminAttributes } from '@/lib/hooks/useAdminData';
import { toast } from '@/stores/toast.store';
import { AttributeDefinition } from '@/types/product';

const ATTRIBUTE_TYPES = ['text', 'number', 'select', 'multiselect', 'boolean', 'richtext', 'date', 'color', 'measurement'];
const TYPES_WITH_OPTIONS = ['select', 'multiselect'];

interface Form {
  name: string; type: string; appliesTo: string; isRequired: boolean; isFilterable: boolean; isVisible: boolean; optionsText: string;
}
const EMPTY: Form = { name: '', type: 'text', appliesTo: 'product', isRequired: false, isFilterable: false, isVisible: true, optionsText: '' };

export default function AdminAttributesPage() {
  const queryClient = useQueryClient();
  const canWrite = canWriteCatalog(useAuthStore((s) => s.user?.role));
  const { data, isLoading, error, refetch } = useAdminAttributes();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AttributeDefinition | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttributeDefinition | null>(null);

  function openCreate() { setEditing(null); setForm(EMPTY); setFormError(null); setDialogOpen(true); }
  function openEdit(a: AttributeDefinition) {
    setEditing(a);
    setForm({
      name: a.name, type: a.type, appliesTo: a.applies_to, isRequired: a.is_required, isFilterable: a.is_filterable,
      isVisible: a.is_visible, optionsText: (a.predefined_values as string[]).join(', '),
    });
    setFormError(null);
    setDialogOpen(true);
  }
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'attributes'] });

  async function handleSave() {
    if (!form.name.trim()) return setFormError('Enter a name.');
    const options = form.optionsText.split(',').map((v) => v.trim()).filter(Boolean);
    if (TYPES_WITH_OPTIONS.includes(form.type) && options.length === 0) {
      return setFormError('List the allowed values (comma-separated) for a select / multiselect attribute.');
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(), type: form.type, appliesTo: form.appliesTo,
        isRequired: form.isRequired, isFilterable: form.isFilterable, isVisible: form.isVisible,
        predefinedValues: TYPES_WITH_OPTIONS.includes(form.type) ? options : [],
      };
      if (editing) await adminApi.attributes.update(editing.id, payload);
      else await adminApi.attributes.create(payload);
      toast({ title: editing ? 'Attribute updated' : 'Attribute created', variant: 'success' });
      setDialogOpen(false);
      await refresh();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save attribute'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await adminApi.attributes.delete(deleteTarget.id);
      toast({ title: 'Attribute deleted', variant: 'success' });
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })]);
    } catch (err) {
      toast({ title: 'Could not delete attribute', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  }

  const attributes = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Attributes</h1>
        {canWrite && <Button variant="accent" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Add Attribute</Button>}
      </div>

      {error && !data ? <QueryError error={error} onRetry={() => refetch()} /> : isLoading ? <Skeleton className="h-72 w-full" /> : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Applies To</TableHead><TableHead>Flags</TableHead>{canWrite && <TableHead className="text-right">Actions</TableHead>}</TableRow>
            </TableHeader>
            <TableBody>
              {attributes.map((attr) => (
                <TableRow key={attr.id}>
                  <TableCell className="font-medium">{attr.name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{attr.type}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{attr.applies_to}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {attr.is_required && <Badge variant="muted">Required</Badge>}
                      {attr.is_filterable && <Badge variant="soft">Filterable</Badge>}
                      {!attr.is_visible && <Badge variant="muted">Hidden</Badge>}
                    </div>
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(attr)} aria-label={`Edit ${attr.name}`}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(attr)} aria-label={`Delete ${attr.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {attributes.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No attributes yet.</p>}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Attribute' : 'Add Attribute'}</DialogTitle>
            <DialogDescription>Values entered on products are validated against this definition.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="attrName">Name</Label>
              <Input id="attrName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="attrType">Type</Label>
                <select id="attrType" className="h-10 rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {ATTRIBUTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="attrApplies">Applies to</Label>
                <select id="attrApplies" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}>
                  <option value="product">Product</option>
                  <option value="variant">Variant</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
            {TYPES_WITH_OPTIONS.includes(form.type) && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="predefinedValues">Allowed values (comma-separated)</Label>
                <Input id="predefinedValues" value={form.optionsText} onChange={(e) => setForm({ ...form, optionsText: e.target.value })} placeholder="Oily, Dry, Combination" />
              </div>
            )}
            <div className="flex flex-wrap gap-4">
              {([['isRequired', 'Required to publish'], ['isFilterable', 'Filterable in shop'], ['isVisible', 'Visible to customers']] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <Checkbox checked={form[key]} onCheckedChange={(v) => setForm({ ...form, [key]: v === true })} />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
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
        description="The definition AND every value stored under it on products and variants will be removed."
        onConfirm={handleDelete}
      />
    </div>
  );
}
