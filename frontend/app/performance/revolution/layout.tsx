import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Performance Revolution'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
