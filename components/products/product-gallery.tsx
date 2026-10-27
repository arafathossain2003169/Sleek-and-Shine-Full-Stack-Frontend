'use client';

import { useState } from 'react';
import { ProductImage } from '@/types/product';
import { SafeImage } from '@/components/shared/safe-image';
import { cn } from '@/lib/utils';

export function ProductGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  // Main image first, then by the stored order; guard against the list shrinking.
  const ordered = [...images].sort((a, b) => Number(b.isMain) - Number(a.isMain));
  const active = ordered[Math.min(activeIndex, Math.max(ordered.length - 1, 0))];

  if (ordered.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted">
        <span className="swatch-dot h-4 w-4" />
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
        <SafeImage
          src={active.url}
          alt={active.altText ?? productName}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      {ordered.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
          {ordered.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Show image ${i + 1} of ${ordered.length}`}
              aria-current={i === activeIndex}
              className={cn(
                'relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2',
                i === activeIndex ? 'border-accent' : 'border-transparent'
              )}
            >
              <SafeImage src={img.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
