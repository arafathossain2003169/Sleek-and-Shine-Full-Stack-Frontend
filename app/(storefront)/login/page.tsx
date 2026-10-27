import { Suspense } from 'react';
import { RedirectIfAuthenticated } from '@/components/auth/redirect-if-authenticated';
import { LoginForm } from '@/components/auth/login-form';
import { BrandLogo } from '@/components/shared/brand-logo';

export const metadata = { title: 'Log In' };

export default function LoginPage() {
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <BrandLogo size={72} labelled className="mx-auto mb-3" />
          <h1 className="font-display text-2xl font-semibold">Welcome Back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Log in to continue to SleeknShine</p>
        </div>
        <Suspense fallback={null}>
          <RedirectIfAuthenticated />
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
