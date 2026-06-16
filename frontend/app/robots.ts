import type {MetadataRoute} from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hrms-frontend-vert.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/pricing',
          '/contact',
          '/features',
          '/careers',
          '/careers/',
        ],
        disallow: [
          '/admin/',
          '/me/',
          '/employees/',
          '/recruitment/',
          '/payroll/',
          '/performance/',
          '/leave/',
          '/attendance/',
          '/reports/',
          '/settings/',
          '/auth/',
          '/api/',
          '/_next/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
