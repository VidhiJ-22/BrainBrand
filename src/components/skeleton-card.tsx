interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

export default function SkeletonCard({
  lines = 3,
  className = "",
}: SkeletonCardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}
    >
      <div className="skeleton mb-4 h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton mb-2 h-4"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  );
}
