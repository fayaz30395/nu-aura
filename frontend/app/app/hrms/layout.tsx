import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'NU-HRMS'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
