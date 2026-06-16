import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Talent Acquisition'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
