/**
 * Hosts next/image may optimise. Keep in sync with `images.remotePatterns` in next.config.mjs
 * (add yours via NEXT_PUBLIC_IMAGE_HOSTS=cdn.example.com,images.example.com).
 */
export const ALLOWED_IMAGE_HOSTS = [
  'res.cloudinary.com',
  'images.unsplash.com',
  ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean),
];

export function isOptimizableImage(src: string): boolean {
  if (src.startsWith('/') || src.startsWith('data:')) return true;
  try {
    return ALLOWED_IMAGE_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}
