export default function Loading() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-56 bg-[var(--bg-surface)] rounded"/>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-[var(--bg-surface)] rounded-lg"/>)}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[var(--bg-surface)] rounded-lg"/>)}
      </div>
    </div>
  );
}
