import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Document Signing | NU-AURA',
  description: 'Securely sign documents with NU-AURA e-signature.',
  robots: {index: false, follow: false}, // private: token-gated pages
};

export default function SignLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
