export default function PredictiveAnalyticsLoading() {
  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-accent-200 border-t-accent-500 rounded-full animate-spin"/>
        <p className="text-[var(--text-muted)] font-medium">Loading predictive analytics...</p>
      </div>
    </div>
  );
}
