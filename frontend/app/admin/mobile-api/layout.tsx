import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Mobile API'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
