const extraHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? '')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    // Keep in sync with lib/images.ts. Other hosts still render (unoptimised) via <SafeImage>.
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      ...extraHosts.map((hostname) => ({ protocol: 'https', hostname })),
    ],
  },
};

export default nextConfig;
