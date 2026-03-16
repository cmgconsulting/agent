export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-4 bg-surface-200 rounded-lg w-32 mb-3" />
          <div className="h-7 bg-surface-200 rounded-lg w-52 mb-2" />
          <div className="h-4 bg-surface-100 rounded-lg w-64" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-surface-100 shadow-soft p-6">
            <div className="w-10 h-10 bg-surface-100 rounded-xl mb-3" />
            <div className="h-7 bg-surface-200 rounded-lg w-16 mb-2" />
            <div className="h-4 bg-surface-100 rounded-lg w-28" />
          </div>
        ))}
      </div>

      <div className="h-5 bg-surface-200 rounded-lg w-36 mb-4" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-surface-100 shadow-soft p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-surface-100 rounded-xl" />
              <div className="h-5 bg-surface-100 rounded-full w-14" />
            </div>
            <div className="h-5 bg-surface-200 rounded-lg w-20 mb-2" />
            <div className="h-3 bg-surface-100 rounded-lg w-28" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-surface-100 shadow-soft p-6">
        <div className="h-5 bg-surface-200 rounded-lg w-36 mb-5" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <div className="w-2.5 h-2.5 bg-surface-200 rounded-full" />
              <div className="flex-1 h-4 bg-surface-100 rounded-lg" />
              <div className="h-3 bg-surface-100 rounded-lg w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
