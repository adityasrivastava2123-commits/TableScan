export default function OrdersLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-7 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 overflow-x-auto pb-2 -mx-4 px-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="min-h-[500px] w-80 flex-shrink-0 rounded-lg border bg-muted/20 p-4 space-y-3">
            <div className="h-5 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-24 animate-pulse rounded-md bg-muted/70" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
