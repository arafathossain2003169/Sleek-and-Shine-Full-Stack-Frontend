'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { AddressInput, usersApi } from '@/lib/api/orders';
import { useAuthStore } from '@/stores/auth.store';

export function useAddresses() {
  // Guests have no addresses: don't fire a doomed 401 (+ token refresh) request.
  const isAuthenticated = !!useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['addresses'],
    queryFn: async () => (await usersApi.listAddresses()).data.addresses,
    enabled: isAuthenticated,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddressInput) => usersApi.createAddress(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AddressInput> }) => usersApi.updateAddress(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.deleteAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
}
