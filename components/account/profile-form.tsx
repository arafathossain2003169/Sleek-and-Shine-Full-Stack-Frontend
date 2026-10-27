'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usersApi } from '@/lib/api/orders';
import { getErrorMessage } from '@/lib/api/errors';
import { profileFormSchema, ProfileFormValues } from '@/lib/schemas/auth';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/stores/toast.store';

export function ProfileForm() {
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: user?.name ?? '', phone: user?.phone ?? '' },
  });

  async function onSubmit(values: ProfileFormValues) {
    setServerError(null);
    try {
      const { data } = await usersApi.updateMe({ name: values.name, phone: values.phone?.trim() ? values.phone.trim() : null });
      setSession(data.user, '');
      reset({ name: data.user.name, phone: data.user.phone ?? '' });
      toast({ title: 'Profile updated', variant: 'success' });
    } catch (err) {
      setServerError(getErrorMessage(err, 'Could not update your profile'));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3" noValidate>
      {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-name">Full name</Label>
        <Input id="profile-name" autoComplete="name" error={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={user?.email ?? ''} disabled readOnly />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-phone">Phone</Label>
        <Input id="profile-phone" type="tel" autoComplete="tel" error={!!errors.phone} {...register('phone')} />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>
      <Button type="submit" variant="accent" className="w-fit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}
