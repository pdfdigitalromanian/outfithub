export default function Loading() {
  return (
    <div className="container-page pt-8" aria-busy aria-label="Se încarcă produsul">
      <div className="grid gap-8 md:grid-cols-12">
        <div className="skeleton aspect-[4/5] rounded-xl md:col-span-7" />
        <div className="flex flex-col gap-4 md:col-span-5">
          <div className="skeleton h-4 w-24 rounded-full" />
          <div className="skeleton h-12 w-3/4 rounded-full" />
          <div className="skeleton h-6 w-32 rounded-full" />
          <div className="skeleton mt-6 h-12 w-full rounded-full" />
          <div className="skeleton h-12 w-full rounded-full" />
          <div className="skeleton mt-4 h-14 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}
