import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Payroll Structures'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
