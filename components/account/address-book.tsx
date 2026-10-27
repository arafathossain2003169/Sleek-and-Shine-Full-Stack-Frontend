'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { AddressForm } from '@/components/checkout/address-form';
import { QueryError } from '@/components/shared/query-error';
import { useAddresses, useDeleteAddress, useUpdateAddress } from '@/lib/hooks/useAddresses';
import { getErrorMessage } from '@/lib/api/errors';
import { toast } from '@/stores/toast.store';
import { Address } from '@/types/user';

export function AddressBook() {
  const { data: addresses, isLoading, error, refetch } = useAddresses();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const [dialog, setDialog] = useState<{ address?: Address } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);

  async function makeDefault(a: Address) {
    try {
      await updateAddress.mutateAsync({ id: a.id, input: { is_default: true } });
    } catch (err) {
      toast({ title: 'Could not change default address', description: getErrorMessage(err), variant: 'destructive' });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteAddress.mutateAsync(deleteTarget.id);
      toast({ title: 'Address removed', variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not remove address', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  }

  if (error && !addresses) return <QueryError error={error} onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading addresses...</p>
      ) : addresses && addresses.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {a.full_name} {a.is_default && <Badge variant="accent" className="ml-1">Default</Badge>}
                  </p>
                  <p className="text-muted-foreground">{a.phone}</p>
                  <p className="text-muted-foreground">
                    {a.address_line_1}{a.address_line_2 ? `, ${a.address_line_2}` : ''}, {a.city}
                    {a.zone ? `, ${a.zone}` : ''} {a.postal_code ?? ''}, {a.country}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="icon" aria-label="Edit address" onClick={() => setDialog({ address: a })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Delete address" onClick={() => setDeleteTarget(a)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {!a.is_default && (
                <button type="button" onClick={() => makeDefault(a)} className="mt-2 text-xs text-accent hover:underline">
                  Make default
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">You have no saved addresses yet.</p>
      )}

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setDialog({})}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Add Address
      </Button>

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.address ? 'Edit Address' : 'Add Address'}</DialogTitle>
            <DialogDescription>Used for delivery and order records.</DialogDescription>
          </DialogHeader>
          {dialog && <AddressForm address={dialog.address} onSuccess={() => setDialog(null)} onCancel={() => setDialog(null)} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove this address?"
        description="Past orders keep their own copy of the delivery address."
        onConfirm={confirmDelete}
        isLoading={deleteAddress.isPending}
      />
    </div>
  );
}
