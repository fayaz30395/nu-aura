import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Custom Fields'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
