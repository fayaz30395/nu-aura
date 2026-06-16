import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Company Spotlight'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
