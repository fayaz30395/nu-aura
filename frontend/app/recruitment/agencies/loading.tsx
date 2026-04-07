import { AppLayout } from '@/components/layout';
import { SkeletonCard, SkeletonStatCard } from '@/components/ui/Skeleton';

export default function AgenciesLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="h-12 bg-[var(--bg-secondary)] rounded-lg w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </AppLayout>
  );
}
