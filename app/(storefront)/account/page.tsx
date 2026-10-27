'use client';

import Link from 'next/link';
import { Package, LogOut, ShieldCheck } from 'lucide-react';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { ProfileForm } from '@/components/account/profile-form';
import { AddressBook } from '@/components/account/address-book';
import { ChangePasswordForm } from '@/components/account/change-password-form';
import { useAuth } from '@/lib/hooks/useAuth';
import { ADMIN_ROLES } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function AccountContent() {
  const { user, logout } = useAuth();

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-6 font-display text-3xl font-semibold">My Account</h1>

      <div className="flex flex-col gap-6">
        <Link href="/account/orders">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <Package className="h-5 w-5 text-accent" />
              <div>
                <p className="font-medium">My Orders</p>
                <p className="text-sm text-muted-foreground">Track, view and cancel your orders</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {user && ADMIN_ROLES.includes(user.role) && (
          <Link href="/admin">
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <ShieldCheck className="h-5 w-5 text-accent" />
                <p className="font-medium">Admin Dashboard</p>
              </CardContent>
            </Card>
          </Link>
        )}

        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent><ProfileForm /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Saved Addresses</CardTitle></CardHeader>
          <CardContent><AddressBook /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
          <CardContent><ChangePasswordForm /></CardContent>
        </Card>

        <Button type="button" variant="outline" className="w-fit text-destructive" onClick={() => logout()}>
          <LogOut className="mr-2 h-4 w-4" /> Log Out
        </Button>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <ProtectedRoute>
      <AccountContent />
    </ProtectedRoute>
  );
}
