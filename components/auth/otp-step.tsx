'use client';

import { useEffect, useRef, useState } from 'react';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpChallenge } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/errors';
import { useAuth } from '@/lib/hooks/useAuth';

interface OtpStepProps {
  challenge: OtpChallenge;
  onVerified: () => void;
  /** go back to the previous form (wrong e-mail, etc.) */
  onBack: () => void;
}

const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(name.length - 2, 1))}@${domain}`;
};

/** Second step of sign-up and login: enter the 6-digit code that was e-mailed. */
export function OtpStep({ challenge, onVerified, onBack }: OtpStepProps) {
  const { verifyOtp, resendOtp } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(challenge.resendAfterSeconds);
  const inputRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit(value: string) {
    if (submitting.current || value.length !== 6) return;
    submitting.current = true;
    setIsVerifying(true);
    setError(null);
    setInfo(null);
    try {
      await verifyOtp({ email: challenge.email, purpose: challenge.purpose, code: value });
      onVerified();
    } catch (err) {
      setError(getErrorMessage(err, 'That code did not work. Please try again.'));
      setCode('');
      inputRef.current?.focus();
    } finally {
      submitting.current = false;
      setIsVerifying(false);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) void submit(digits); // submit as soon as the 6th digit is typed or pasted
  }

  async function resend() {
    setError(null);
    setInfo(null);
    try {
      const next = await resendOtp({ email: challenge.email, purpose: challenge.purpose });
      setCooldown(next.resendAfterSeconds);
      setInfo('A new code is on its way.');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send a new code.'));
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void submit(code); }}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft"><MailCheck className="h-6 w-6 text-accent" /></span>
        <h2 className="font-display text-xl font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to <strong className="text-foreground">{maskEmail(challenge.email)}</strong>.
          It expires in {Math.round(challenge.expiresInSeconds / 60)} minutes.
        </p>
      </div>

      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {info && <p role="status" className="rounded-md bg-accent-soft px-3 py-2 text-sm">{info}</p>}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="otp-code" className="sr-only">Verification code</Label>
        <Input
          id="otp-code"
          ref={inputRef}
          value={code}
          onChange={onChange}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="••••••"
          disabled={isVerifying}
          className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
          aria-describedby="otp-help"
        />
        <p id="otp-help" className="text-center text-xs text-muted-foreground">
          {challenge.purpose === 'register' ? 'This confirms your email address.' : 'This confirms it is really you signing in.'}
        </p>
      </div>

      <Button type="submit" variant="accent" size="lg" disabled={isVerifying || code.length !== 6}>
        {isVerifying ? 'Verifying...' : challenge.purpose === 'register' ? 'Verify & create account' : 'Verify & log in'}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          ← Back
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0 || isVerifying}
          className="text-accent hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
}
