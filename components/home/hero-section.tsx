import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HomepageSection } from '@/lib/api/content';
import { safeHref } from '@/lib/utils';

export function HeroSection({ section }: { section?: HomepageSection }) {
  const title = section?.title ?? 'Radiance, Redefined';
  const subtitle =
    section?.subtitle ?? 'Discover premium cosmetics crafted for your everyday glow.';
  const buttonText = section?.button_text ?? 'Shop Now';
  const buttonLink = safeHref(section?.button_link, '/shop');

  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-accent-soft/40 to-transparent">
      <div className="container flex flex-col items-start gap-5 py-16 md:py-24">
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-accent">
          <span className="swatch-dot" /> New Season Collection
        </span>
        <h1 className="max-w-xl font-display text-4xl font-semibold leading-tight md:text-6xl">
          {title}
        </h1>
        <p className="max-w-md text-muted-foreground md:text-lg">{subtitle}</p>
        <Button asChild size="lg" variant="accent">
          <Link href={buttonLink}>{buttonText}</Link>
        </Button>
      </div>
    </section>
  );
}
