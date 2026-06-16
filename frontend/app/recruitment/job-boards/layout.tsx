import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Job Boards'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
