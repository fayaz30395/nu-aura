import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'SLA Management'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
