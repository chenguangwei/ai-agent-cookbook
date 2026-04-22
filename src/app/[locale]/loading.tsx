export default function LocaleLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-primary-100 dark:bg-primary-900/30" />
            <div className="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="hidden gap-3 md:flex">
            <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1200px] px-6 py-12 lg:px-10 lg:py-16">
        <div className="mb-8 h-4 w-28 animate-pulse rounded-full bg-primary-100 dark:bg-primary-900/30" />
        <div className="mb-4 h-14 w-full max-w-3xl animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="mb-12 h-6 w-full max-w-2xl animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 aspect-video animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="mb-3 h-6 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mb-2 h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
