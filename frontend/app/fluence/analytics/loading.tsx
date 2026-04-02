import { layout, card } from '@/lib/design-system';

export default function AnalyticsLoading() {
  return (
    <div className={`${layout.pagePadding} ${layout.sectionGap}`}>
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-[var(--bg-secondary)] animate-pulse" />
          <div className="flex-1">
            <div className="h-6 w-48 rounded bg-[var(--bg-secondary)] animate-pulse mb-2" />
            <div className="h-4 w-64 rounded bg-[var(--bg-secondary)] animate-pulse" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`${card.base} ${card.paddingLarge} h-24 animate-pulse`}
          />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div className={`${card.base} ${card.paddingLarge} h-80 animate-pulse`} />
        </div>
        <div>
          <div className={`${card.base} ${card.paddingLarge} h-80 animate-pulse`} />
        </div>
      </div>

      {/* Top Content Table */}
      <div className="mb-6">
        <div className={`${card.base} ${card.paddingLarge} space-y-4`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-[var(--bg-secondary)] rounded animate-pulse" />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className={`${card.base} ${card.paddingLarge} space-y-4`}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-[var(--bg-secondary)] rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
