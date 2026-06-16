import type {Metadata} from 'next';

export const metadata: Metadata = {title: '360 Feedback'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
