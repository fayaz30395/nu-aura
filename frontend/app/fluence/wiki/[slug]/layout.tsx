import type {Metadata} from 'next';
export const metadata: Metadata = {title: 'Wiki Article'};
export default function Layout({children}: {children: React.ReactNode}) { return <>{children}</>; }
