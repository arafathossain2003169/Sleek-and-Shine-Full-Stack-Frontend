import { Suspense } from 'react';
import { RedirectIfAuthenticated } from '@/components/auth/redirect-if-authenticated';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { BrandLogo } from '@/components/shared/brand-logo';

export const metadata = { title: 'Forgot Password' };

export default function ForgotPasswordPage() {
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-10">
      <div className="w-full max-w-sm">
        <BrandLogo size={72} labelled className="mx-auto mb-4" />
        <Suspense fallback={null}>
          <RedirectIfAuthenticated />
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
