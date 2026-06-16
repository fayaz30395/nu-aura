import type {Metadata} from 'next';

export const metadata: Metadata = {title: '1:1 Meetings'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
