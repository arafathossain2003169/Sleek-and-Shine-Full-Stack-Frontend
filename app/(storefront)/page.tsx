import { contentApi } from '@/lib/api/content';
import { HeroSection } from '@/components/home/hero-section';
import { CategoryGrid } from '@/components/home/category-grid';
import { ProductRail } from '@/components/home/product-rail';
import { BrandPromise } from '@/components/home/brand-promise';

// Rendered per request (never prerendered at build time, so `next build` does not need the API),
// while the API response itself is cached for 60s via the fetch options in contentApi.homepage().
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // No try/catch on purpose: if the API is down we show the error page instead of a blank
  // storefront that would also be cached for a minute.
  const { data: content } = await contentApi.homepage();

  const heroSection = content.sections.find((s) => s.type === 'hero');

  return (
    <>
      <HeroSection section={heroSection} />
      <CategoryGrid categories={content.categories} />
      <ProductRail
        title="New Arrivals"
        subtitle="Just landed — the newest additions to our collection."
        products={content.newArrivals}
        viewAllHref="/shop?isNewArrival=true"
      />
      <ProductRail
        title="Current Offers"
        subtitle="Limited-time savings on customer favorites."
        products={content.offers}
        viewAllHref="/shop?isOffer=true"
      />
      <BrandPromise />
      <ProductRail
        title="Featured Products"
        subtitle="Hand-picked essentials for your routine."
        products={content.featured}
        viewAllHref="/shop?isFeatured=true"
      />
    </>
  );
}
