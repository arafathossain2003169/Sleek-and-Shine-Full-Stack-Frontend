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
import { loginFormSchema, LoginFormValues } from '@/lib/schemas/auth';

interface LoginFormProps {
  /** Called after a successful login INSTEAD of navigating (used when embedded, e.g. in checkout). */
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps = {}) {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  function finish() {
    if (onSuccess) onSuccess();
    else router.push(safeRedirect(searchParams.get('redirect')));
  }

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const next = await login(values);
      if (next) setChallenge(next);
      else finish();
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const registerHref = searchParams.get('redirect')
    ? `/register?redirect=${encodeURIComponent(safeRedirect(searchParams.get('redirect')))}`
    : '/register';

  const forgotHref = searchParams.get('redirect')
    ? `/forgot-password?redirect=${encodeURIComponent(safeRedirect(searchParams.get('redirect')))}`
    : '/forgot-password';

  if (challenge) {
    return <OtpStep challenge={challenge} onVerified={finish} onBack={() => setChallenge(null)} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {serverError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" error={!!errors.email} {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <Link href={forgotHref} className="text-xs text-accent hover:underline">Forgot password?</Link>
        </div>
        <Input id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" error={!!errors.password} {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <Button type="submit" variant="accent" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Log In'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href={registerHref} className="text-accent hover:underline">Create one</Link>
      </p>
    </form>
  );
}
