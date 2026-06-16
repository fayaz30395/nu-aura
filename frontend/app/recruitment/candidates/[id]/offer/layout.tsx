import type {Metadata} from 'next';
export const metadata: Metadata = {title: 'Candidate Offer'};
export default function Layout({children}: {children: React.ReactNode}) { return <>{children}</>; }
