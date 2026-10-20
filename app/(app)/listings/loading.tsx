export default function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="در حال بارگذاری">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-xl border border-line bg-surface" />
      ))}
    </div>
  );
}
