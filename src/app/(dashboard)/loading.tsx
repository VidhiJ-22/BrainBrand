import SkeletonCard from "@/components/skeleton-card";

export default function DashboardLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="skeleton mb-2 h-8 w-48" />
        <div className="skeleton h-4 w-72" />
      </div>

      {/* Stats row skeleton */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="skeleton mb-2 h-4 w-24" />
            <div className="skeleton h-7 w-16" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <SkeletonCard lines={4} />
    </div>
  );
}
