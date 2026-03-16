export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 bg-surface-200 rounded w-48 mb-2" />
          <div className="h-4 bg-surface-100 rounded w-72" />
        </div>
        <div className="h-10 bg-surface-200 rounded-2xl w-36" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card">
            <div className="h-8 bg-surface-100 rounded w-8 mb-3" />
            <div className="h-6 bg-surface-200 rounded w-16 mb-1" />
            <div className="h-3 bg-surface-100 rounded w-24" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="card">
        <div className="h-5 bg-surface-200 rounded w-40 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-9 w-9 bg-surface-100 rounded-xl" />
              <div className="flex-1">
                <div className="h-4 bg-surface-200 rounded w-32 mb-1" />
                <div className="h-3 bg-surface-100 rounded w-20" />
              </div>
              <div className="h-6 bg-surface-100 rounded-full w-16" />
              <div className="h-4 bg-surface-100 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
