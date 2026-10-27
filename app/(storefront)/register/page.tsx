import { Suspense } from 'react';
import { RedirectIfAuthenticated } from '@/components/auth/redirect-if-authenticated';
import { RegisterForm } from '@/components/auth/register-form';
import { BrandLogo } from '@/components/shared/brand-logo';

export const metadata = { title: 'Create Account' };

export default function RegisterPage() {
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <BrandLogo size={72} labelled className="mx-auto mb-3" />
          <h1 className="font-display text-2xl font-semibold">Create Your Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Join SleeknShine for a personalized experience</p>
        </div>
        <Suspense fallback={null}>
          <RedirectIfAuthenticated />
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
