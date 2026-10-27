import Image, { ImageProps } from 'next/image';
import { isOptimizableImage } from '@/lib/images';

/**
 * next/image throws at render time for hosts that aren't configured, which would crash the whole page
 * when an admin pastes an image URL from a new host. This wrapper falls back to an unoptimised image instead.
 */
export function SafeImage({ src, alt, ...props }: ImageProps & { src: string }) {
  return <Image src={src} alt={alt} unoptimized={!isOptimizableImage(src)} {...props} />;
}
