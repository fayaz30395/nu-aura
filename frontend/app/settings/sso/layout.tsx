import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Single Sign-On'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
