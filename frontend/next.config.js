const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: false,
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
  },

  // Performance optimizations
  experimental: {
    // Enable optimized package imports for common libraries
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@tanstack/react-query',
      '@tanstack/react-table',
      'date-fns',
      'recharts',
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
      // MinIO local object storage (development)
      // In production, assets are served via S3/CloudFront (already covered above).
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
    ],
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Headers for caching and security
  async headers() {
    // API base (used in connect-src)
    const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1')
      .replace(/\/api\/v1.*$/, '');

    const securityHeaders = [
      // Prevent clickjacking
      { key: 'X-Frame-Options', value: 'DENY' },
      // Prevent MIME-type sniffing
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      // Control referrer information
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // HSTS (only active over HTTPS; browsers ignore over HTTP)
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      // Disable sensitive browser features the app does not use
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()' },
      // Content-Security-Policy
      // Notes:
      //   • 'unsafe-inline' on script-src is required by Next.js RSC hydration scripts.
      //     Once a nonce-based middleware (next.config cspHeader) is adopted, remove it.
      //   • 'unsafe-eval' is required by Next.js dev mode only; excluded in production.
      //   • frame-src allows Google Docs viewer used for PDF preview in course player.
      //   • worker-src blob: is required by PDF.js workers if added later.
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          process.env.NODE_ENV === 'development'
            ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com"
            : "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
          "style-src 'self' 'unsafe-inline' https://accounts.google.com",
          `connect-src 'self' ${apiOrigin} wss: https://accounts.google.com https://*.googleapis.com https://www.googleapis.com`,
          "img-src 'self' data: blob: https:",
          "font-src 'self' https://fonts.gstatic.com",
          "frame-src 'self' https://docs.google.com https://accounts.google.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "upgrade-insecure-requests",
        ].join('; '),
      },
    ];

    return [
      // Security headers on all HTML routes
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Static asset caching (cache headers override security headers for assets only where needed)
      {
        source: '/:all*(svg|jpg|png|webp|avif)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations only
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // Separate vendor chunks for better caching
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // Separate React Query chunk
            reactQuery: {
              test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
              name: 'react-query',
              chunks: 'all',
              priority: 20,
            },
            // Separate chart libraries
            charts: {
              test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 20,
            },
          },
        },
      };
    }
    return config;
  },
}

module.exports = withBundleAnalyzer(nextConfig)
