'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi, OtpChallenge } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/errors';
import { safeRedirect } from '@/lib/utils';
import { forgotPasswordFormSchema, ForgotPasswordFormValues } from '@/lib/schemas/auth';
import { ResetPasswordForm } from './reset-password-form';

/** Step 1 of "forgot password": ask for the account email; a 6-digit code is e-mailed. */
export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordFormSchema) });

  useEffect(() => setFocus('email'), [setFocus]);

  const loginHref = searchParams.get('redirect')
    ? `/login?redirect=${encodeURIComponent(safeRedirect(searchParams.get('redirect')))}`
    : '/login';

  async function onSubmit(values: ForgotPasswordFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const { data } = await authApi.forgotPassword({ email: values.email });
      setChallenge(data);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (challenge) {
    return <ResetPasswordForm challenge={challenge} loginHref={loginHref} onBack={() => setChallenge(null)} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft"><KeyRound className="h-6 w-6 text-accent" /></span>
        <h2 className="font-display text-xl font-semibold">Forgot your password?</h2>
        <p className="text-sm text-muted-foreground">Enter your email and we&apos;ll send you a 6-digit code to reset it.</p>
      </div>

      {serverError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="forgot-email">Email</Label>
        <Input id="forgot-email" type="email" autoComplete="email" placeholder="you@example.com" error={!!errors.email} {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <Button type="submit" variant="accent" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Sending code...' : 'Send reset code'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link href={loginHref} className="text-accent hover:underline">Back to log in</Link>
      </p>
    </form>
  );
}
