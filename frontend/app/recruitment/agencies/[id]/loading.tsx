import { AppLayout } from '@/components/layout';
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function AgencyDetailLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="h-8 bg-[var(--bg-secondary)] rounded w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    </AppLayout>
  );
}
