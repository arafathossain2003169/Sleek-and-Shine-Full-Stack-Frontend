'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/errors';
import { changePasswordFormSchema, ChangePasswordFormValues } from '@/lib/schemas/auth';
import { toast } from '@/stores/toast.store';

export function ChangePasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
  });

  async function onSubmit(values: ChangePasswordFormValues) {
    setServerError(null);
    try {
      await authApi.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      reset();
      toast({ title: 'Password changed', description: 'You were signed out on your other devices.', variant: 'success' });
    } catch (err) {
      setServerError(getErrorMessage(err, 'Could not change your password'));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3" noValidate>
      {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-current">Current password</Label>
        <Input id="cp-current" type="password" autoComplete="current-password" error={!!errors.currentPassword} {...register('currentPassword')} />
        {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-new">New password</Label>
        <Input id="cp-new" type="password" autoComplete="new-password" error={!!errors.newPassword} {...register('newPassword')} />
        {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-confirm">Confirm new password</Label>
        <Input id="cp-confirm" type="password" autoComplete="new-password" error={!!errors.confirmPassword} {...register('confirmPassword')} />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>
      <Button type="submit" variant="outline" className="w-fit" disabled={isSubmitting}>
        {isSubmitting ? 'Updating...' : 'Update Password'}
      </Button>
    </form>
  );
}
