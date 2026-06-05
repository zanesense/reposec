export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-xl border-[2.5px] border-ink bg-card" />
        <div className="h-40 w-full animate-pulse rounded-2xl border-[2.5px] border-ink bg-card" />
        <div className="h-64 w-full animate-pulse rounded-2xl border-[2.5px] border-ink bg-card" />
      </div>
    </div>
  );
}
