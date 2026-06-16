import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Comp Off'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
