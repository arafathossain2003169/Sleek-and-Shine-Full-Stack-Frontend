'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useAdminCategories, useAdminBrands } from '@/lib/hooks/useAdminData';
import { adminApi } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';
import { toast } from '@/stores/toast.store';
import { PRODUCT_STATUS_OPTIONS } from '@/lib/constants';
import { AdminProduct } from '@/types/admin';

/**
 * Prices are kept as STRINGS in the form on purpose: z.coerce.number() turns a blank input ("")
 * into 0, which silently made an empty "Sale price" a $0 sale price (free product).
 * Blank now means "no sale price"; the values are converted explicitly on submit.
 */
const isMoney = (v: string) => /^\d{1,7}(\.\d{1,2})?$/.test(v.trim());

const productSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter at least 2 characters'),
    slug: z.string().trim().optional(),
    categoryId: z.string().uuid('Select a category'),
    brandId: z.string().optional(),
    shortDescription: z.string().optional(),
    fullDescription: z.string().optional(),
    basePrice: z.string().trim().min(1, 'Enter a price').refine(isMoney, 'Enter a valid price (max 2 decimals)'),
    salePrice: z.string().trim().optional(),
    sku: z.string().trim().optional(),
    barcode: z.string().trim().optional(),
    status: z.enum(['draft', 'published', 'hidden', 'archived']),
    stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'discontinued']),
    isFeatured: z.boolean().optional(),
    isNewArrival: z.boolean().optional(),
    isOffer: z.boolean().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.salePrice) {
      if (!isMoney(v.salePrice)) {
        ctx.addIssue({ code: 'custom', path: ['salePrice'], message: 'Enter a valid price (max 2 decimals)' });
      } else if (isMoney(v.basePrice) && Number(v.salePrice) >= Number(v.basePrice)) {
        ctx.addIssue({ code: 'custom', path: ['salePrice'], message: 'Sale price must be lower than the base price' });
      } else if (Number(v.salePrice) <= 0) {
        ctx.addIssue({ code: 'custom', path: ['salePrice'], message: 'Sale price must be above 0 (leave blank for no sale)' });
      }
    }
  });

type ProductFormValues = z.infer<typeof productSchema>;

const FIELD_NAMES = new Set(Object.keys(productSchema.innerType().shape));

export function ProductForm({ product }: { product?: AdminProduct }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: categories } = useAdminCategories();
  const { data: brands } = useAdminBrands();
  const [serverError, setServerError] = useState<string | null>(null);
  const hasVariants = (product?.variants.length ?? 0) > 0;

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? toFormValues(product) : { status: 'draft', stockStatus: 'in_stock', basePrice: '', salePrice: '' },
  });

  async function onSubmit(values: ProductFormValues) {
    setServerError(null);
    const blank = (s?: string) => (s && s.trim() !== '' ? s.trim() : null);
    const payload: Record<string, unknown> = {
      name: values.name,
      categoryId: values.categoryId,
      brandId: values.brandId || null,
      shortDescription: blank(values.shortDescription),
      fullDescription: blank(values.fullDescription),
      basePrice: Number(values.basePrice),
      // blank => null => "no sale price" (never 0)
      salePrice: values.salePrice?.trim() ? Number(values.salePrice) : null,
      sku: blank(values.sku),
      barcode: blank(values.barcode),
      status: values.status,
      isFeatured: !!values.isFeatured,
      isNewArrival: !!values.isNewArrival,
      isOffer: !!values.isOffer,
      seoTitle: blank(values.seoTitle),
      seoDescription: blank(values.seoDescription),
    };
    // Stock status of products WITH variants is derived from their stock by the server.
    if (!hasVariants) payload.stockStatus = values.stockStatus;
    // An empty slug means "generate it from the name": don't send it at all.
    if (values.slug?.trim()) payload.slug = values.slug.trim();

    try {
      if (product) {
        const { data } = await adminApi.products.update(product.id, payload);
        reset(toFormValues({ ...product, ...data.product, variants: product.variants }));
        await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        toast({ title: 'Product updated', variant: 'success' });
      } else {
        const { data } = await adminApi.products.create(payload);
        await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        toast({ title: 'Product created', variant: 'success' });
        router.push(`/admin/products/${data.product.id}`);
      }
    } catch (err) {
      // Show WHICH field the server rejected, next to the field, not just "Validation failed".
      if (err instanceof ApiError) {
        for (const e of err.errors ?? []) {
          if (e.path && FIELD_NAMES.has(e.path)) setError(e.path as Path<ProductFormValues>, { message: e.message });
        }
      }
      setServerError(getErrorMessage(err, 'Could not save the product'));
    }
  }

  const err = (name: keyof ProductFormValues) =>
    errors[name]?.message ? <p className="text-xs text-destructive">{String(errors[name]?.message)}</p> : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      {serverError && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Product name</Label>
          <Input id="name" error={!!errors.name} {...register('name')} />
          {err('name')}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">URL slug (generated from the name if empty)</Label>
          <Input id="slug" placeholder="e.g. vitamin-c-serum" error={!!errors.slug} {...register('slug')} />
          {err('slug')}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="shortDescription">Short description</Label>
        <Textarea id="shortDescription" rows={2} {...register('shortDescription')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullDescription">Full description</Label>
        <Textarea id="fullDescription" rows={5} {...register('fullDescription')} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="categoryId">Category</Label>
          <Select value={watch('categoryId') ?? ''} onValueChange={(v) => setValue('categoryId', v, { shouldValidate: true })}>
            <SelectTrigger id="categoryId"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.is_active === false ? ' (inactive)' : ''}</SelectItem>)}
            </SelectContent>
          </Select>
          {err('categoryId')}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brandId">Brand</Label>
          <Select value={watch('brandId') || 'none'} onValueChange={(v) => setValue('brandId', v === 'none' ? '' : v)}>
            <SelectTrigger id="brandId"><SelectValue placeholder="Select brand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No brand</SelectItem>
              {brands?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}{b.is_active === false ? ' (inactive)' : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="basePrice">Price</Label>
          <Input id="basePrice" inputMode="decimal" placeholder="0.00" error={!!errors.basePrice} {...register('basePrice')} />
          {err('basePrice')}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salePrice">Sale price (optional)</Label>
          <Input id="salePrice" inputMode="decimal" placeholder="leave blank for none" error={!!errors.salePrice} {...register('salePrice')} />
          {err('salePrice')}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" error={!!errors.sku} {...register('sku')} />
          {err('sku')}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" {...register('barcode')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Visibility</Label>
          <Select value={watch('status')} onValueChange={(v) => setValue('status', v as ProductFormValues['status'])}>
            <SelectTrigger id="status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRODUCT_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Only “published” products are visible in the store.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stockStatus">Stock status</Label>
          <Select
            value={watch('stockStatus')}
            onValueChange={(v) => setValue('stockStatus', v as ProductFormValues['stockStatus'])}
            disabled={hasVariants}
          >
            <SelectTrigger id="stockStatus"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['in_stock', 'low_stock', 'out_of_stock', 'discontinued'].map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {hasVariants ? 'Calculated automatically from the variants’ stock.' : 'For products without variants, set this manually.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        {([['isFeatured', 'Featured'], ['isNewArrival', 'New Arrival'], ['isOffer', 'On Offer']] as const).map(([name, label]) => (
          <label key={name} className="flex items-center gap-2">
            <Checkbox checked={!!watch(name)} onCheckedChange={(v) => setValue(name, v === true)} />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seoTitle">SEO title</Label>
          <Input id="seoTitle" {...register('seoTitle')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seoDescription">SEO description</Label>
          <Input id="seoDescription" {...register('seoDescription')} />
        </div>
      </div>

      <Button type="submit" variant="accent" size="lg" className="w-fit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : product ? 'Save Changes' : 'Create Product'}
      </Button>
    </form>
  );
}

function toFormValues(product: AdminProduct): ProductFormValues {
  return {
    name: product.name,
    slug: product.slug,
    categoryId: product.category?.id ?? '',
    brandId: product.brand?.id ?? '',
    shortDescription: product.shortDescription ?? '',
    fullDescription: product.fullDescription ?? '',
    basePrice: String(product.basePrice),
    salePrice: product.salePrice != null ? String(product.salePrice) : '',
    sku: product.sku ?? '',
    barcode: product.barcode ?? '',
    status: product.status,
    stockStatus: product.stockStatus as ProductFormValues['stockStatus'],
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    isOffer: product.isOffer,
    seoTitle: product.seoTitle ?? '',
    seoDescription: product.seoDescription ?? '',
  };
}
