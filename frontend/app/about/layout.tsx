import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'About NULogic',
  description: 'Learn about NULogic and how NU-AURA is transforming HR, recruitment, performance, and knowledge management for modern teams.',
  openGraph: {
    title: 'About NULogic | NU-AURA',
    description: 'Learn about NULogic and how NU-AURA is transforming HR for modern teams.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About NULogic | NU-AURA',
    description: 'Learn about NULogic and how NU-AURA is transforming HR for modern teams.',
  },
};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
