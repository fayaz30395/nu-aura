import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Labour Welfare Fund'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
