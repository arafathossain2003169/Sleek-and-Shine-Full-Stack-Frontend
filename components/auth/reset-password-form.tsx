'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi, OtpChallenge } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/errors';
import { resetPasswordFormSchema, ResetPasswordFormValues } from '@/lib/schemas/auth';

interface ResetPasswordFormProps {
  challenge: OtpChallenge;
  loginHref: string;
  /** back to the e-mail step (wrong address) */
  onBack: () => void;
}

const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(name.length - 2, 1))}@${domain}`;
};

/** Step 2 of "forgot password": the e-mailed code + the new password. */
export function ResetPasswordForm({ challenge, loginHref, onBack }: ResetPasswordFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [cooldown, setCooldown] = useState(challenge.resendAfterSeconds);

  const {
    register,
    handleSubmit,
    setFocus,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordFormSchema) });

  useEffect(() => setFocus('code'), [setFocus]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onSubmit(values: ResetPasswordFormValues) {
    setServerError(null);
    setInfo(null);
    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ email: challenge.email, code: values.code, newPassword: values.newPassword });
      setDone(true);
    } catch (err) {
      setServerError(getErrorMessage(err, 'Could not reset your password. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resend() {
    setServerError(null);
    setInfo(null);
    try {
      const { data } = await authApi.forgotPassword({ email: challenge.email });
      setCooldown(data.resendAfterSeconds);
      setInfo('If the account exists, a new code is on its way.');
    } catch (err) {
      setServerError(getErrorMessage(err, 'Could not send a new code.'));
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft"><CheckCircle2 className="h-6 w-6 text-accent" /></span>
        <h2 className="font-display text-xl font-semibold">Password updated</h2>
        <p className="text-sm text-muted-foreground">
          Your password was changed and you were signed out of all devices. Log in with your new password.
        </p>
        <Button asChild variant="accent" size="lg" className="w-full">
          <Link href={loginHref}>Log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft"><MailCheck className="h-6 w-6 text-accent" /></span>
        <h2 className="font-display text-xl font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          If an account exists for <strong className="text-foreground">{maskEmail(challenge.email)}</strong>, we sent a
          6-digit code. It expires in {Math.round(challenge.expiresInSeconds / 60)} minutes.
        </p>
      </div>

      {serverError && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>}
      {info && <p role="status" className="rounded-md bg-accent-soft px-3 py-2 text-sm">{info}</p>}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-code">Verification code</Label>
        <Input
          id="reset-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          error={!!errors.code}
          className="h-12 text-center font-mono text-xl tracking-[0.5em]"
          {...register('code', { onChange: (e) => setValue('code', e.target.value.replace(/\D/g, '').slice(0, 6)) })}
        />
        {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-new-password">New password</Label>
        <Input id="reset-new-password" type="password" autoComplete="new-password" placeholder="••••••••" error={!!errors.newPassword} {...register('newPassword')} />
        {errors.newPassword
          ? <p className="text-xs text-destructive">{errors.newPassword.message}</p>
          : <p className="text-xs text-muted-foreground">At least 8 characters, with a letter and a number.</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-confirm-password">Confirm new password</Label>
        <Input id="reset-confirm-password" type="password" autoComplete="new-password" placeholder="••••••••" error={!!errors.confirmPassword} {...register('confirmPassword')} />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>

      <Button type="submit" variant="accent" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Updating...' : 'Reset password'}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground">← Change email</button>
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0 || isSubmitting}
          className="text-accent hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
}
