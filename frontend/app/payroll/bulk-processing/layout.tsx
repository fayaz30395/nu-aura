import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Bulk Processing'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
