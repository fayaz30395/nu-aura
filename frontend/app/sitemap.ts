import type {MetadataRoute} from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hrms-frontend-vert.vercel.app';

  const publicRoutes = [
    {url: baseUrl, priority: 1.0, changeFrequency: 'weekly' as const},
    {url: `${baseUrl}/about`, priority: 0.9, changeFrequency: 'monthly' as const},
    {url: `${baseUrl}/features`, priority: 0.9, changeFrequency: 'monthly' as const},
    {url: `${baseUrl}/pricing`, priority: 0.9, changeFrequency: 'monthly' as const},
    {url: `${baseUrl}/contact`, priority: 0.8, changeFrequency: 'monthly' as const},
    {url: `${baseUrl}/careers`, priority: 0.8, changeFrequency: 'weekly' as const},
  ];

  return publicRoutes.map(({url, priority, changeFrequency}) => ({
    url,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
