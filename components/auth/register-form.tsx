'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpStep } from './otp-step';
import { OtpChallenge } from '@/lib/api/auth';
import { useAuth } from '@/lib/hooks/useAuth';
import { getErrorMessage } from '@/lib/api/errors';
import { safeRedirect } from '@/lib/utils';
import { registerFormSchema, RegisterFormValues } from '@/lib/schemas/auth';

interface RegisterFormProps {
  /** Called after a successful sign-up INSTEAD of navigating (used when embedded, e.g. in checkout). */
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps = {}) {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerFormSchema) });

  function finish() {
    if (onSuccess) onSuccess();
    else router.push(safeRedirect(searchParams.get('redirect')));
  }

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const next = await registerUser({ ...values, phone: values.phone?.trim() ? values.phone.trim() : undefined });
      if (next) setChallenge(next);
      else finish();
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const loginHref = searchParams.get('redirect')
    ? `/login?redirect=${encodeURIComponent(safeRedirect(searchParams.get('redirect')))}`
    : '/login';

  if (challenge) {
    return <OtpStep challenge={challenge} onVerified={finish} onBack={() => setChallenge(null)} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {serverError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-name">Full name</Label>
        <Input id="reg-name" autoComplete="name" placeholder="Jane Doe" error={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-email">Email</Label>
        <Input id="reg-email" type="email" autoComplete="email" placeholder="you@example.com" error={!!errors.email} {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-phone">Phone (optional)</Label>
        <Input id="reg-phone" type="tel" autoComplete="tel" placeholder="+880 1XXX-XXXXXX" error={!!errors.phone} {...register('phone')} />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-password">Password</Label>
        <Input id="reg-password" type="password" autoComplete="new-password" placeholder="At least 8 characters, with a number" error={!!errors.password} {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <Button type="submit" variant="accent" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account...' : 'Create Account'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={loginHref} className="text-accent hover:underline">Log in</Link>
      </p>
    </form>
  );
}
