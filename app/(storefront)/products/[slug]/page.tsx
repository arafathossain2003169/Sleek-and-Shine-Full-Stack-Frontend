import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { productsApi } from '@/lib/api/products';
import { isNotFound } from '@/lib/api/errors';
import { ProductGallery } from '@/components/products/product-gallery';
import { PriceDisplay } from '@/components/products/price-display';
import { AddToCartBar } from '@/components/products/add-to-cart-bar';
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion';
import { ProductRail } from '@/components/home/product-rail';
import { Banknote, ShieldCheck } from 'lucide-react';

// Rendered per request so a missing product/category is a real HTTP 404 (ISR returned 200 + a "not found" body: a soft-404).
// The API data is still cached for 60s through the fetch options in lib/api/products.ts, so edits appear within a minute.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? '';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { data } = await productsApi.getBySlug(params.slug);
    return {
      title: data.product.seoTitle ?? data.product.name,
      description: data.product.seoDescription ?? data.product.shortDescription ?? undefined,
      alternates: SITE_URL ? { canonical: `${SITE_URL}/products/${data.product.slug}` } : undefined,
      openGraph: { images: data.product.images.map((i) => i.url) },
    };
  } catch {
    return { title: 'Product' };
  }
}

function formatAttributeValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export default async function ProductDetailPage({ params }: PageProps) {
  let product;
  let related;
  try {
    const [productRes, relatedRes] = await Promise.all([
      productsApi.getBySlug(params.slug),
      productsApi.related(params.slug),
    ]);
    product = productRes.data.product;
    related = relatedRes.data.products;
  } catch (err) {
    // A genuine 404 is a 404. An API outage must NOT be reported to crawlers/shoppers as "not found".
    if (isNotFound(err)) notFound();
    throw err;
  }

  const details = product.attributeDetails ?? [];
  const inStock = product.variants.length
    ? product.variants.some((v) => v.status === 'active' && v.stockQuantity > 0)
    : !['out_of_stock', 'discontinued'].includes(product.stockStatus);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? undefined,
    image: product.images.map((i) => i.url),
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    offers: {
      '@type': 'Offer',
      price: product.finalPrice ?? product.salePrice ?? product.basePrice,
      priceCurrency: product.currency,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="container py-6 md:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> /{' '}
        {product.category && (
          <>
            <Link href={`/categories/${product.category.slug}`} className="hover:text-foreground">{product.category.name}</Link> /{' '}
          </>
        )}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          {product.brand && (
            <p className="text-sm uppercase tracking-wide text-muted-foreground">{product.brand.name}</p>
          )}
          <h1 className="mt-1 font-display text-3xl font-semibold">{product.name}</h1>

          <div className="mt-3">
            <PriceDisplay basePrice={product.basePrice} salePrice={product.salePrice} currency={product.currency} size="lg" />
          </div>

          {product.shortDescription && <p className="mt-4 text-muted-foreground">{product.shortDescription}</p>}

          <div className="mt-6">
            <AddToCartBar product={product} />
          </div>

          <div className="mt-6 flex flex-col gap-2 rounded-lg border border-border p-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Banknote className="h-4 w-4" /> Cash on delivery available
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4" /> Secure checkout &amp; easy order tracking
            </div>
          </div>

          <Accordion type="single" collapsible className="mt-6">
            {product.fullDescription && (
              <AccordionItem value="description">
                <AccordionTrigger>Description</AccordionTrigger>
                <AccordionContent className="whitespace-pre-line">{product.fullDescription}</AccordionContent>
              </AccordionItem>
            )}
            {details.length > 0 && (
              <AccordionItem value="attributes">
                <AccordionTrigger>Details</AccordionTrigger>
                <AccordionContent>
                  <ul className="flex flex-col gap-1">
                    {details.map((d) => (
                      <li key={d.slug} className="flex justify-between gap-4">
                        <span>{d.name}</span>
                        <span className="text-right text-foreground">{formatAttributeValue(d.value)}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      </div>

      {related && related.length > 0 && product.category && (
        <ProductRail
          title="You May Also Like"
          products={related}
          viewAllHref={`/categories/${product.category.slug}`}
        />
      )}
    </div>
  );
}
