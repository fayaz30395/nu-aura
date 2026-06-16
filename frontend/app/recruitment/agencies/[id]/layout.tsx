import type {Metadata} from 'next';
export const metadata: Metadata = {title: 'Agency Details'};
export default function Layout({children}: {children: React.ReactNode}) { return <>{children}</>; }
