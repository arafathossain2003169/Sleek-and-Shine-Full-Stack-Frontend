'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { QueryError } from '@/components/shared/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { formatDate } from '@/lib/utils';
import { toast } from '@/stores/toast.store';
import { StaffMember } from '@/types/admin';

const ROLE_INFO: { value: string; label: string; can: string }[] = [
  { value: 'super_admin', label: 'Super admin', can: 'Everything, including granting the super admin role.' },
  { value: 'admin', label: 'Admin', can: 'Everything except the super admin role: catalogue, orders, customers, coupons, content, settings, staff.' },
  { value: 'manager', label: 'Manager', can: 'Catalogue, inventory, orders, customers, coupons, homepage content, audit logs.' },
  { value: 'order_manager', label: 'Order manager', can: 'View and process orders, look up customers.' },
  { value: 'inventory_staff', label: 'Inventory staff', can: 'View the catalogue and adjust stock.' },
];
const roleLabel = (role: string) => ROLE_INFO.find((r) => r.value === role)?.label ?? 'Customer';

export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const iAmSuper = me?.role === 'super_admin';
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'staff'], queryFn: () => adminApi.staff.list() });
  const staff = data?.data.staff ?? [];
  // an admin can never grant or touch the super admin role (the server enforces it too)
  const assignable = ROLE_INFO.filter((r) => iAmSuper || r.value !== 'super_admin');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<StaffMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null);

  // --- promote an existing account ---
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim(), 350);
  const found = useQuery({
    queryKey: ['admin', 'staff-search', debounced],
    queryFn: async () => (await adminApi.staff.searchUsers(debounced)).data.users,
    enabled: dialogOpen && debounced.length >= 2,
  });
  const [picked, setPicked] = useState<StaffMember | null>(null);
  const [promoteRole, setPromoteRole] = useState('admin');

  // --- create a brand-new account ---
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'order_manager' });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff-search'] }),
    ]);

  function openDialog() {
    setSearch(''); setPicked(null); setPromoteRole('admin'); setFormError(null);
    setForm({ name: '', email: '', password: '', role: 'order_manager' });
    setDialogOpen(true);
  }

  async function handlePromote() {
    if (!picked) return setFormError('Search for an account and select it first.');
    setIsSaving(true);
    setFormError(null);
    try {
      await adminApi.staff.update(picked.id, { role: promoteRole });
      toast({ title: `${picked.name} is now ${roleLabel(promoteRole)}`, description: 'It applies immediately — they may need to refresh the page.', variant: 'success' });
      setDialogOpen(false);
      await refresh();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not change the role'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreate() {
    if (form.name.trim().length < 2) return setFormError('Enter a name.');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setFormError('Enter a valid email.');
    if (form.password.length < 10 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      return setFormError('The password needs at least 10 characters, with a letter and a number.');
    }
    setIsSaving(true);
    setFormError(null);
    try {
      await adminApi.staff.create({ ...form, name: form.name.trim(), email: form.email.trim() });
      toast({ title: 'Staff account created', description: 'They log in with this email + password, then a code sent to their inbox.', variant: 'success' });
      setDialogOpen(false);
      await refresh();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not create the account'));
    } finally {
      setIsSaving(false);
    }
  }

  async function changeRole(member: StaffMember, role: string) {
    try {
      await adminApi.staff.update(member.id, { role });
      toast({ title: 'Role updated', description: `${member.name} is now ${roleLabel(role)}.`, variant: 'success' });
      await refresh();
    } catch (err) {
      toast({ title: 'Could not change the role', description: getErrorMessage(err), variant: 'destructive' });
      await refresh(); // put the dropdown back to the real value
    }
  }

  async function toggleStatus() {
    if (!toggleTarget) return;
    try {
      await adminApi.staff.update(toggleTarget.id, { status: toggleTarget.status === 'active' ? 'blocked' : 'active' });
      await refresh();
    } catch (err) {
      toast({ title: 'Could not update the account', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setToggleTarget(null);
    }
  }

  async function removeAccess() {
    if (!removeTarget) return;
    await changeRole(removeTarget, 'customer');
    setRemoveTarget(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Staff &amp; roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">Give other people access to this panel. Changes apply immediately.</p>
        </div>
        <Button variant="accent" onClick={openDialog}><Plus className="mr-1.5 h-4 w-4" /> Add staff</Button>
      </div>

      {error && !data ? <QueryError error={error} onRetry={() => refetch()} /> : isLoading ? <Skeleton className="h-72 w-full" /> : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Since</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((m) => {
                const isMe = m.id === me?.id;
                const locked = isMe || (m.role === 'super_admin' && !iAmSuper); // admins cannot touch super admins
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}{isMe && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      <select
                        aria-label={`Role for ${m.name}`}
                        disabled={locked}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
                        value={m.role}
                        onChange={(e) => changeRole(m, e.target.value)}
                      >
                        {(m.role === 'super_admin' ? ROLE_INFO : assignable).map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        <option value="customer">Customer (no panel access)</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(m.created_at)}</TableCell>
                    <TableCell><Badge variant={m.status === 'active' ? 'accent' : 'destructive'}>{m.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {!locked && (
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setToggleTarget(m)}>{m.status === 'active' ? 'Block' : 'Unblock'}</Button>
                          <Button variant="outline" size="sm" onClick={() => setRemoveTarget(m)}>Remove access</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">What each role can do</h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
          {ROLE_INFO.map((r) => (
            <div key={r.value} className="contents">
              <dt className="font-medium">{r.label}</dt>
              <dd className="text-muted-foreground">{r.can}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add staff</DialogTitle>
            <DialogDescription>Promote someone who already has an account, or create a new account for them.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="existing" onValueChange={() => setFormError(null)}>
            <TabsList className="w-full">
              <TabsTrigger value="existing" className="flex-1">Existing account</TabsTrigger>
              <TabsTrigger value="new" className="flex-1">New account</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stSearch">Find by name or email</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="stSearch" className="pl-9" placeholder="e.g. jane@example.com" value={search}
                    onChange={(e) => { setSearch(e.target.value); setPicked(null); }} />
                </div>
              </div>

              {debounced.length >= 2 && !picked && (
                <ul className="max-h-48 overflow-y-auto rounded-md border border-border">
                  {found.isLoading && <li className="p-3 text-sm text-muted-foreground">Searching…</li>}
                  {found.data?.length === 0 && <li className="p-3 text-sm text-muted-foreground">No account matches. Ask them to register first, or use “New account”.</li>}
                  {found.data?.map((u) => (
                    <li key={u.id}>
                      <button type="button" onClick={() => { setPicked(u); setPromoteRole(u.role !== 'customer' ? u.role : 'admin'); }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted">
                        <span><span className="font-medium">{u.name}</span><br /><span className="text-xs text-muted-foreground">{u.email}</span></span>
                        <Badge variant={u.role === 'customer' ? 'muted' : 'accent'}>{roleLabel(u.role)}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {picked && (
                <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-3">
                  <p className="text-sm"><span className="font-medium">{picked.name}</span> <span className="text-muted-foreground">· {picked.email}</span></p>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="promoteRole">Give this role</Label>
                    <select id="promoteRole" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={promoteRole} onChange={(e) => setPromoteRole(e.target.value)}>
                      {assignable.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <p className="text-xs text-muted-foreground">{ROLE_INFO.find((r) => r.value === promoteRole)?.can}</p>
                  </div>
                </div>
              )}

              {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="accent" onClick={handlePromote} disabled={isSaving || !picked}>{isSaving ? 'Saving...' : 'Give access'}</Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="new" className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5"><Label htmlFor="stName">Name</Label><Input id="stName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="stEmail">Email</Label><Input id="stEmail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="stPass">Temporary password</Label><Input id="stPass" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stRole">Role</Label>
                <select id="stRole" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {assignable.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">They sign in with this password and then a code emailed to their address, so use an inbox they can read.</p>
              {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="accent" onClick={handleCreate} disabled={isSaving}>{isSaving ? 'Creating...' : 'Create account'}</Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        isDestructive={toggleTarget?.status === 'active'}
        title={toggleTarget?.status === 'active' ? `Block ${toggleTarget?.name}?` : `Unblock ${toggleTarget?.name}?`}
        description={toggleTarget?.status === 'active' ? 'They are signed out immediately and cannot log in until unblocked.' : 'They can log in again.'}
        onConfirm={toggleStatus}
      />
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        isDestructive
        title={`Remove panel access for ${removeTarget?.name ?? ''}?`}
        description="Their account stays as a normal customer account; they just lose all admin access and are signed out."
        onConfirm={removeAccess}
      />
    </div>
  );
}
