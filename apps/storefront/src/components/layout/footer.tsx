import Link from "next/link"
import { Logo } from "../ui/logo"
import { CookieSettingsLink } from "../consent/consent-banner"
import type { StoreConfig } from "@/lib/data/content"

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  pinterest: "Pinterest",
  youtube: "YouTube",
}

export function Footer({ config, categories }: { config: StoreConfig; categories: { handle: string; name: string }[] }) {
  const { company, social, seo } = config.content
  const legal = config.pages.filter((p) => p.is_legal)
  const info = config.pages.filter((p) => !p.is_legal)
  const socials = Object.entries(social).filter(([, v]) => !!v)
  const year = new Date().getFullYear()

  return (
    <footer className="mt-24 rounded-t-[2rem] bg-ink text-paper sm:mx-2 sm:rounded-t-[2.5rem]">
      <div className="container-page grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="[&_a]:text-paper [&_span.bg-ink]:bg-paper [&_span.bg-ink]:text-ink">
            <Logo name={seo.site_name || company.trade_name} />
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-paper/70">{seo.default_description}</p>
          {socials.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {socials.map(([k, url]) => (
                <li key={k}>
                  <a href={url} target="_blank" rel="noopener noreferrer me" className="rounded-full border border-paper/20 px-4 py-2 text-xs hover:border-paper/60">
                    {SOCIAL_LABELS[k] ?? k}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <FooterCol title="Magazin" links={[{ href: "/shop", label: "Toate produsele" }, ...categories.slice(0, 5).map((c) => ({ href: `/categories/${c.handle}`, label: c.name })), { href: "/wishlist", label: "Favorite" }]} />
        <FooterCol
          title="Ajutor"
          links={[...info.map((p) => ({ href: `/pages/${p.handle}`, label: p.title })), { href: "/account/orders", label: "Comenzile mele" }]}
        />
        <div className="md:col-span-3">
          <FooterCol title="Legal" links={legal.map((p) => ({ href: `/pages/${p.handle}`, label: p.title }))} bare />
          <CookieSettingsLink className="mt-2.5 text-left text-sm text-paper/70 hover:text-paper" />
          <div className="mt-6 flex flex-wrap gap-3">
            {/* ANPC pictograms required by Ordinul ANPC nr. 449/2022 */}
            <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="nofollow noopener" className="rounded-md bg-paper px-3 py-2 text-[0.68rem] font-semibold leading-tight text-ink" aria-label="ANPC – Soluționarea alternativă a litigiilor">
              ANPC
              <span className="block font-normal">Soluționarea alternativă a litigiilor</span>
            </a>
            <a href="https://anpc.ro" target="_blank" rel="nofollow noopener" className="rounded-md border border-paper/25 px-3 py-2 text-[0.68rem] leading-tight text-paper/80">
              Autoritatea Națională pentru
              <span className="block">Protecția Consumatorilor</span>
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-paper/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-paper/70 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {company.legal_name || company.trade_name}
            {company.cui ? ` · CUI ${company.cui}` : ""}
            {company.reg_com ? ` · ${company.reg_com}` : ""}
          </p>
          <p>Prețurile includ TVA · Livrare prin Sameday</p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links, bare }: { title: string; links: { href: string; label: string }[]; bare?: boolean }) {
  return (
    <div className={bare ? "" : "md:col-span-2 md:col-start-auto"}>
      <p className="mb-4 text-xs uppercase tracking-[0.16em] text-paper/65">{title}</p>
      <ul className="flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-paper/75 transition-colors hover:text-paper">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
