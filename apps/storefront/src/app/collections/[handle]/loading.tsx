export default function Loading() {
  return (
    <div className="container-page pt-12" aria-busy aria-label="Se încarcă">
      <div className="skeleton h-12 w-72 rounded-full" />
      <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[4/5] rounded-lg" />
            <div className="skeleton mt-3 h-4 w-2/3 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
