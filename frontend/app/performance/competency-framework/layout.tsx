import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Competency Framework'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
