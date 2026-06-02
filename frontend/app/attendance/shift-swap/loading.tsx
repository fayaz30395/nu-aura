export default function Loading() {
  return (
    <div className="page-shell-centered fade-slide-up">
      <div className="page-shell-card w-full max-w-5xl fade-slide-up auth-delay-20 float-subtle p-6 sm:p-8 space-y-6">
        <div className="skeleton-aura h-8 w-48 rounded"/>
        <div className="flex gap-4 border-b pb-2">
          {[1, 2, 3].map(i => <div key={i} className="skeleton-aura h-6 w-28 rounded"/>) }
        </div>
        <div className="skeleton-aura h-72 rounded-lg"/>
      </div>
    </div>
  );
}
