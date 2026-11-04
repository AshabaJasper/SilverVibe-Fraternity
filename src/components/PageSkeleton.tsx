/** Shimmering placeholder shown while a route segment loads. */
const block = "rounded-xl dm-surface-hover animate-pulse";

export default function PageSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className={`${block} h-7 w-56`} />
        <div className={`${block} h-4 w-80 max-w-full`} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${block} h-28`} />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className={`${block} h-72 lg:col-span-2`} />
        <div className={`${block} h-72`} />
      </div>
      <div className={`${block} h-64`} />
    </div>
  );
}
