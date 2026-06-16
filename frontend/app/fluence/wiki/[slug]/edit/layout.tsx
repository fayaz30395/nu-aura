import type {Metadata} from 'next';
export const metadata: Metadata = {title: 'Edit Article'};
export default function Layout({children}: {children: React.ReactNode}) { return <>{children}</>; }
