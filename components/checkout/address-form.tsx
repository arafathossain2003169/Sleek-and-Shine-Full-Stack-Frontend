'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateAddress, useUpdateAddress } from '@/lib/hooks/useAddresses';
import { getErrorMessage } from '@/lib/api/errors';
import { Address } from '@/types/user';

const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the recipient name'),
  phone: z.string().trim().min(5, 'Enter a phone number'),
  addressLine1: z.string().trim().min(3, 'Enter the street address'),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(1, 'Enter the city'),
  zone: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().min(1, 'Enter the country'),
  isDefault: z.boolean(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressFormProps {
  /** When given, the form edits this address instead of creating a new one. */
  address?: Address;
  onSuccess: (address?: Address) => void;
  onCancel?: () => void;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function AddressForm({ address, onSuccess, onCancel }: AddressFormProps) {
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: address?.full_name ?? '',
      phone: address?.phone ?? '',
      addressLine1: address?.address_line_1 ?? '',
      addressLine2: address?.address_line_2 ?? '',
      city: address?.city ?? '',
      zone: address?.zone ?? '',
      postalCode: address?.postal_code ?? '',
      country: address?.country ?? '',
      isDefault: address?.is_default ?? false,
    },
  });

  async function onSubmit(values: AddressFormValues) {
    setServerError(null);
    const payload = {
      full_name: values.fullName,
      phone: values.phone,
      address_line_1: values.addressLine1,
      address_line_2: values.addressLine2 || null,
      city: values.city,
      zone: values.zone || null,
      postal_code: values.postalCode || null,
      country: values.country,
      is_default: values.isDefault,
    };
    try {
      const result = address
        ? await updateAddress.mutateAsync({ id: address.id, input: payload })
        : await createAddress.mutateAsync(payload);
      onSuccess(result.data.address);
    } catch (err) {
      setServerError(getErrorMessage(err, 'Could not save the address. Please check the fields and try again.'));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3" noValidate>
      {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" autoComplete="name" error={!!errors.fullName} {...register('fullName')} />
          <FieldError message={errors.fullName?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" autoComplete="tel" error={!!errors.phone} {...register('phone')} />
          <FieldError message={errors.phone?.message} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="addressLine1">Address line 1</Label>
        <Input id="addressLine1" autoComplete="address-line1" error={!!errors.addressLine1} {...register('addressLine1')} />
        <FieldError message={errors.addressLine1?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="addressLine2">Address line 2 (optional)</Label>
        <Input id="addressLine2" autoComplete="address-line2" {...register('addressLine2')} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" autoComplete="address-level2" error={!!errors.city} {...register('city')} />
          <FieldError message={errors.city?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="zone">State / Zone (optional)</Label>
          <Input id="zone" autoComplete="address-level1" {...register('zone')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="postalCode">Postal code (optional)</Label>
          <Input id="postalCode" autoComplete="postal-code" {...register('postalCode')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">Country</Label>
          <Input id="country" autoComplete="country-name" error={!!errors.country} {...register('country')} />
          <FieldError message={errors.country?.message} />
        </div>
      </div>

      {/* Radix Checkbox is not a native input, so it must be wired through Controller. */}
      <div className="flex items-center gap-2 pt-1">
        <Controller
          control={control}
          name="isDefault"
          render={({ field }) => (
            <Checkbox
              id="isDefault"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              disabled={address?.is_default}
            />
          )}
        />
        <Label htmlFor="isDefault" className="text-sm font-normal">Set as default address</Label>
      </div>

      <div className="mt-2 flex gap-2">
        <Button type="submit" variant="accent" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Saving...' : address ? 'Save Changes' : 'Save Address'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
}
