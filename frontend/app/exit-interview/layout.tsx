import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Exit Interview'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
