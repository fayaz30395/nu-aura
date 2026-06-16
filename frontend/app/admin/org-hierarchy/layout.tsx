import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Org Hierarchy'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
