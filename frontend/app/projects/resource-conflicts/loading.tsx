export default function Loading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-56 bg-[var(--bg-surface)] rounded" />
      <div className="h-72 bg-[var(--bg-surface)] rounded-lg" />
    </div>
  );
}
