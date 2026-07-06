export default function Loading() {
  return (
    <main className="min-h-screen bg-paper px-4 py-5 dark:bg-[#0b0f0e] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-4">
          <div className="h-16 animate-pulse rounded-lg border border-line bg-white dark:bg-[#121816]" />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="min-h-[320px] animate-pulse rounded-lg border border-line bg-white dark:bg-[#121816]" />
            <div className="space-y-4">
              <div className="h-8 w-2/3 animate-pulse rounded bg-white dark:bg-[#121816]" />
              <div className="h-24 animate-pulse rounded-lg bg-white dark:bg-[#121816]" />
              <div className="h-32 animate-pulse rounded-lg bg-white dark:bg-[#121816]" />
            </div>
          </div>
        </section>
        <aside className="hidden space-y-4 lg:block">
          <div className="h-56 animate-pulse rounded-lg border border-line bg-white dark:bg-[#121816]" />
          <div className="h-40 animate-pulse rounded-lg border border-line bg-white dark:bg-[#121816]" />
        </aside>
      </div>
    </main>
  );
}
