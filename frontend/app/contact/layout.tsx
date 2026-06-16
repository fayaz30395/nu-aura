import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the NULogic team. We\'re here to help with questions about NU-AURA, demos, and enterprise plans.',
  openGraph: {
    title: 'Contact Us | NU-AURA',
    description: 'Get in touch with the NULogic team. We\'re here to help.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us | NU-AURA',
    description: 'Get in touch with the NULogic team. We\'re here to help.',
  },
};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
