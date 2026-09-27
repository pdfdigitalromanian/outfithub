import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { marked } from "marked"
import { fillTokens, getPage, getStoreConfig } from "@/lib/data/content"
import { SITE_URL } from "@/lib/env"
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo"
import { JsonLd } from "@/components/json-ld"
import { formatDate } from "@/lib/util/format"

type Props = { params: Promise<{ handle: string }> }

export const revalidate = 300

export async function generateStaticParams() {
  return (await getStoreConfig()).pages.map((p) => ({ handle: p.handle }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const page = await getPage(handle)
  if (!page) return {}
  return pageMetadata({ title: page.seo_title || page.title, description: page.seo_description, path: `/pages/${handle}`, type: "article" })
}

/** Renders admin-authored Markdown. Raw HTML in the source is escaped. */
function renderMarkdown(md: string) {
  const escaped = md.replace(/<(?!\s*$)/g, "&lt;")
  return marked.parse(escaped, { async: false, gfm: true, breaks: false }) as string
}

export default async function ContentPage({ params }: Props) {
  const { handle } = await params
  const [page, { content, pages }] = await Promise.all([getPage(handle), getStoreConfig()])
  if (!page) notFound()
  const html = renderMarkdown(fillTokens(page.body, content, { site_url: SITE_URL, updated_at: formatDate(page.updated_at) }))
  const legal = pages.filter((p) => p.is_legal)

  return (
    <div className="container-page pt-8 sm:pt-12">
      <div className="grid gap-10 lg:grid-cols-12">
        <article className="lg:col-span-8 lg:col-start-1">
          <p className="eyebrow">{page.is_legal ? "Informații legale" : "Informații"}</p>
          <h1 className="display mt-3 text-5xl sm:text-6xl">{page.title}</h1>
          <div className="prose-legal mt-8 max-w-[70ch]" dangerouslySetInnerHTML={{ __html: html }} />
        </article>
        {page.is_legal && legal.length > 1 && (
          <aside className="lg:col-span-3 lg:col-start-10">
            <nav aria-label="Pagini legale" className="rounded-xl bg-surface p-5 shadow-soft lg:sticky lg:top-24">
              <p className="eyebrow mb-3">Legal</p>
              <ul className="flex flex-col gap-1">
                {legal.map((p) => (
                  <li key={p.handle}>
                    <Link href={`/pages/${p.handle}`} aria-current={p.handle === handle ? "page" : undefined} className={`block rounded-md px-3 py-2 text-sm ${p.handle === handle ? "bg-paper-2 font-medium" : "text-muted hover:text-ink"}`}>
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
      </div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Acasă", path: "/" }, { name: page.title, path: `/pages/${handle}` }])} />
    </div>
  )
}
