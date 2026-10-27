import Link from 'next/link';
import { CategoryTreeNode } from '@/types/product';
import { SafeImage } from '@/components/shared/safe-image';

export function CategoryGrid({ categories }: { categories: CategoryTreeNode[] }) {
  if (categories.length === 0) return null;

  return (
    <section id="categories" className="container py-10 md:py-14">
      <h2 className="mb-6 font-display text-2xl font-semibold md:text-3xl">Shop by Category</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {categories.slice(0, 10).map((cat) => (
          <Link
            key={cat.id}
            href={`/categories/${cat.slug}`}
            className="group flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-5 text-center transition-shadow hover:shadow-md"
          >
            <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-accent-soft transition-transform group-hover:scale-105">
              {cat.imageUrl ? (
                <SafeImage src={cat.imageUrl} alt="" fill sizes="56px" className="object-cover" />
              ) : (
                <span className="swatch-dot h-3 w-3" />
              )}
            </div>
            <span className="text-sm font-medium">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
