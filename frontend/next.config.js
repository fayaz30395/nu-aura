const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const backendOrigin = process.env.BACKEND_ORIGIN?.replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,

  // Performance optimizations
  experimental: {
    // Enable optimized package imports for common libraries
    optimizePackageImports: [
      'lucide-react',
      '@tabler/icons-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@tanstack/react-query',
      '@tanstack/react-table',
      'date-fns',
      'recharts',
      // framer-motion ships a single barrel; tree-shaking benefits a lot from
      // optimizePackageImports because most callers only need motion + AnimatePresence.
      'framer-motion',
      // Mantine barrels are large; optimizePackageImports trims unused exports
      // per usage site.
      '@mantine/core',
      '@mantine/hooks',
    ],
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    remotePatterns: [
      // Google (OAuth profile pictures)
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      // AWS S3 (user-uploaded documents and avatars)
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
      // CloudFront CDN
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
        pathname: '/**',
      },
      // Google Cloud Storage
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
      // LinkedIn (post images in company feed)
      {
        protocol: 'https',
        hostname: 'media.licdn.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.licdn.com',
        pathname: '/**',
      },
      // UI Avatars (generated avatar fallbacks)
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/**',
      },
      // Google Drive (file previews and thumbnails)
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        pathname: '/**',
      },
      // Local-only patterns (MinIO + backend API) — gated to non-production so
      // production builds don't whitelist http://localhost as a valid image origin.
      ...(process.env.NODE_ENV !== 'production'
        ? [
          // MinIO local object storage (development)
          {
            protocol: 'http',
            hostname: 'localhost',
            port: '9000',
            pathname: '/**',
          },
          // Backend API server (serves files proxied from MinIO in development/staging)
          {
            protocol: 'http',
            hostname: 'localhost',
            port: '8080',
            pathname: '/api/v1/files/**',
          },
        ]
        : []),
    ],
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  // Headers for caching and security
  async headers() {
    const securityHeaders = [
      // Prevent clickjacking
      {key: 'X-Frame-Options', value: 'DENY'},
      // Prevent MIME-type sniffing
      {key: 'X-Content-Type-Options', value: 'nosniff'},
      // Control referrer information
      {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
      // HSTS (only active over HTTPS; browsers ignore over HTTP)
      {key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload'},
      // Disable sensitive browser features the app does not use
      {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()'},
      // NOTE: Content-Security-Policy is set in middleware.ts (single source of truth).
      // Previously it was duplicated here, causing two CSP headers to be emitted; browsers
      // then intersect the policies and the most-restrictive wins, which is fragile.
    ];

    return [
      // Security headers on all HTML routes
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Static asset caching for public images. Next.js owns immutable cache
      // headers for /_next/static chunks.
      {
        source: '/:all*(svg|jpg|png|webp|avif)',
        headers: [
          {key: 'Cache-Control', value: 'public, max-age=31536000, immutable'},
        ],
      },
    ];
  },

  async rewrites() {
    if (!backendOrigin) {
      return [];
    }

    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendOrigin}/api/v1/:path*`,
      },
      {
        source: '/ws/:path*',
        destination: `${backendOrigin}/ws/:path*`,
      },
    ];
  },

  // Keep the App Router chunk graph under Next.js control. Custom splitChunks
  // cache groups caused CSS assets to land in rootMainFiles under Next 16,
  // which made production pages emit CSS as <script> tags and fail smoke tests.
  webpack: (config) => config,
}

module.exports = withBundleAnalyzer(nextConfig)
