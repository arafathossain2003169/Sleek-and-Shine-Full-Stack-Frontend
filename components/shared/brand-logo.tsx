import Image from 'next/image';
import { cn } from '@/lib/utils';
import { SITE_NAME } from '@/lib/constants';

interface BrandLogoProps {
  /** rendered size in px (the logo is square) */
  size?: number;
  /** set when the logo stands alone (no "SleeknShine" text next to it) */
  labelled?: boolean;
  className?: string;
}

/** The SleeknShine "S" mark. Transparent PNG; it is inverted in dark mode so the dark ink stays visible. */
export function BrandLogo({ size = 32, labelled = false, className }: BrandLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt={labelled ? SITE_NAME : ''}
      width={size}
      height={size}
      priority
      className={cn('shrink-0 select-none dark:invert', className)}
      style={{ width: size, height: size }}
    />
  );
}
