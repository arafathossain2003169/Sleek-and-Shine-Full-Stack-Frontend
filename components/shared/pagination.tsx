import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Link mode (server pages / SEO friendly): build the URL for a page. */
  hrefFor?: (page: number) => string;
  /** Button mode (client state). */
  onChange?: (page: number) => void;
}

export function Pagination({ page, totalPages, hrefFor, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);

  const control = (label: string, target: number, disabled: boolean) =>
    hrefFor && !disabled ? (
      <Button asChild variant="outline" size="sm">
        <Link href={hrefFor(target)}>{label}</Link>
      </Button>
    ) : (
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => onChange?.(target)}>
        {label}
      </Button>
    );

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
      {control('Previous', prev, page <= 1)}
      <span className="px-3 text-sm text-muted-foreground" aria-live="polite">
        Page {page} of {totalPages}
      </span>
      {control('Next', next, page >= totalPages)}
    </nav>
  );
}
