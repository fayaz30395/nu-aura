export default function Loading() {
  return (
    <div className="page-shell-centered fade-slide-up">
      <div className="page-shell-card w-full max-w-5xl fade-slide-up auth-delay-20 float-subtle p-6 sm:p-8 space-y-6">
        <div className="skeleton-aura h-8 w-56 rounded"/>
        <div className="skeleton-aura h-72 rounded-lg"/>
      </div>
    </div>
  );
}
