export default function Loading() {
  return (
    <div className="container-page flex min-h-[50vh] items-center justify-center" aria-busy aria-label="Se încarcă">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
    </div>
  )
}
