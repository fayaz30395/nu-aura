import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Import from Keka'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
