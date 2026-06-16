import type {Metadata} from 'next';
export const metadata: Metadata = {title: 'Time Entry'};
export default function Layout({children}: {children: React.ReactNode}) { return <>{children}</>; }
