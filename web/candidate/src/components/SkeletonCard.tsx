export function SkeletonCard() {
  return (
    <div className="card-elevated p-5 space-y-3">
      <div className="skeleton-pulse h-4 w-3/4" />
      <div className="skeleton-pulse h-3 w-1/2" />
      <div className="flex gap-2">
        <div className="skeleton-pulse h-6 w-16 rounded-full" />
        <div className="skeleton-pulse h-6 w-20 rounded-full" />
      </div>
      <div className="skeleton-pulse h-3 w-full" />
      <div className="skeleton-pulse h-8 w-24 rounded-md" />
    </div>
  );
}
