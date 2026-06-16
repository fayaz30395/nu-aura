import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for HR teams of all sizes. Start free and scale as you grow with NU-AURA.',
  openGraph: {
    title: 'Pricing | NU-AURA',
    description: 'Simple, transparent pricing for HR teams of all sizes.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing | NU-AURA',
    description: 'Simple, transparent pricing for HR teams of all sizes.',
  },
};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
