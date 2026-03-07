export default function Loading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="h-16 bg-gray-100 rounded-lg" />
      <div className="h-64 bg-gray-100 rounded-lg" />
    </div>
  );
}
