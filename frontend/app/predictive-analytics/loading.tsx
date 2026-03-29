export default function PredictiveAnalyticsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-[var(--text-muted)] font-medium">Loading predictive analytics...</p>
      </div>
    </div>
  );
}
