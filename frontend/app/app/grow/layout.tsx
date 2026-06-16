import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'NU-Grow'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
