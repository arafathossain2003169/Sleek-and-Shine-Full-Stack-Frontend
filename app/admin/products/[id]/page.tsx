'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import { isNotFound } from '@/lib/api/errors';
import { ProductForm } from '@/components/admin/product-form';
import { ProductMediaManager } from '@/components/admin/product-media-manager';
import { ProductVariantsManager } from '@/components/admin/product-variants-manager';
import { ProductAttributesEditor } from '@/components/admin/product-attributes-editor';
import { QueryError } from '@/components/shared/query-error';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';
import { canWriteCatalog } from '@/lib/permissions';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const canWrite = canWriteCatalog(useAuthStore((s) => s.user?.role));

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'products', params.id],
    queryFn: () => adminApi.products.getById(params.id),
    retry: (count, err) => !isNotFound(err) && count < 1,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isNotFound(error)) return <p className="text-muted-foreground">Product not found.</p>;
  if (error || !data) return <QueryError error={error} onRetry={() => refetch()} title="Could not load this product" />;

  const product = data.data.product;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">{product.name}</h1>
      {!canWrite && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          You have read-only access to the catalogue. Use the Inventory page to adjust stock.
        </p>
      )}

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
        </TabsList>

        <fieldset disabled={!canWrite} className="contents">
          <TabsContent value="basic">
            <Card><CardContent className="p-5"><ProductForm product={product} /></CardContent></Card>
          </TabsContent>

          <TabsContent value="media">
            <Card>
              <CardContent className="p-5">
                <ProductMediaManager productId={product.id} images={product.images} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variants">
            <Card>
              <CardContent className="p-5">
                <ProductVariantsManager productId={product.id} variants={product.variants} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attributes">
            <Card>
              <CardContent className="p-5">
                <ProductAttributesEditor productId={product.id} attributes={product.attributes} />
              </CardContent>
            </Card>
          </TabsContent>
        </fieldset>
      </Tabs>
    </div>
  );
}
