import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Performance Improvement'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
