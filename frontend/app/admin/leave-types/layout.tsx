import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Leave Types'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
