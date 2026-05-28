export default function TablesLoading() {
  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
      </div>

      <div className="rounded-lg border-2 border-dashed border-blue-300 bg-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-11 w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-11 w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded bg-muted" />
          <div className="h-9 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border bg-card overflow-hidden space-y-3">
            <div className="p-4 flex items-center justify-between">
              <div className="h-6 w-24 animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-6 w-16 animate-pulse rounded bg-muted" />
                <div className="h-8 w-8 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="h-40 w-40 mx-auto animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-9 w-full animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
