import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Restricted Holidays'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
