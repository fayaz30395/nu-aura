import type {Metadata} from 'next';
export const metadata: Metadata = {title: 'Training Course'};
export default function Layout({children}: {children: React.ReactNode}) { return <>{children}</>; }
