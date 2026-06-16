import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'NU Mail'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
