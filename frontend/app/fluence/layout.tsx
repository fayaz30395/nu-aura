import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'NU-Fluence'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
