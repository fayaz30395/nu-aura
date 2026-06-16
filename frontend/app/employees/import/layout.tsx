import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Import Employees'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
