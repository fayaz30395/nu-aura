import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Wellness'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
