export default function Loading() {
  return (
    <div className="page-shell-centered fade-slide-up">
      <div className="page-shell-card w-full max-w-6xl fade-slide-up auth-delay-20 float-subtle p-6 sm:p-8 space-y-6">
        <div className="skeleton-aura h-8 w-56 rounded"/>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-aura h-24 rounded-lg"/>)}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton-aura h-20 rounded-lg"/>)}
        </div>
      </div>
    </div>
  );
}
