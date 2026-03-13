export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 bg-gray-200 rounded w-52 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-36" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-5">
            <div className="h-8 bg-gray-100 rounded w-8 mb-3" />
            <div className="h-6 bg-gray-200 rounded w-16 mb-1" />
            <div className="h-3 bg-gray-100 rounded w-24" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 bg-gray-100 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-28 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-40" />
              </div>
              <div className="h-6 bg-gray-100 rounded-full w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
