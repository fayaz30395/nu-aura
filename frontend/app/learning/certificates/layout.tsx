import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Certificates'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
