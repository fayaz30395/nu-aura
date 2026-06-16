import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Review Cycles'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
