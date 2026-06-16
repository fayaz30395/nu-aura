import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Features',
  description: 'Explore NU-AURA\'s full feature set — HR, recruitment, performance management, payroll, learning, and more in one unified platform.',
  openGraph: {
    title: 'Features | NU-AURA',
    description: 'HR, recruitment, performance, payroll, and learning — one unified platform.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Features | NU-AURA',
    description: 'HR, recruitment, performance, payroll, and learning — one unified platform.',
  },
};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
