import { ProductForm } from '@/components/admin/product-form';
import { Card, CardContent } from '@/components/ui/card';

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">Add Product</h1>
      <Card>
        <CardContent className="p-5">
          <ProductForm />
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        Save the product first to unlock media, variants, and attribute management.
      </p>
    </div>
  );
}
