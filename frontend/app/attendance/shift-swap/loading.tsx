export default function Loading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-[var(--bg-surface)] rounded"/>
      <div className="flex gap-4 border-b pb-2">
        {[1, 2, 3].map(i => <div key={i} className="h-6 w-28 bg-[var(--bg-surface)] rounded"/>)}
      </div>
      <div className="h-72 bg-[var(--bg-surface)] rounded-lg"/>
    </div>
  );
}
