import { forwardRef, type ButtonHTMLAttributes } from "react"
import Link from "next/link"
import { cn } from "@/lib/util/cn"

type Variant = "primary" | "secondary" | "ghost" | "outline" | "link"
type Size = "sm" | "md" | "lg" | "icon"

const base =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background,color,box-shadow,transform,opacity] duration-200 ease-[var(--ease-out-soft)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 select-none"

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-2 shadow-soft",
  secondary: "bg-surface text-ink border border-line hover:border-stone hover:bg-white",
  outline: "border border-ink/80 text-ink hover:bg-ink hover:text-paper",
  ghost: "text-ink hover:bg-ink/[0.06]",
  link: "text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink rounded-none px-0 h-auto",
}

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.8rem] rounded-full",
  md: "h-11 px-6 text-sm rounded-full",
  lg: "h-14 px-8 text-[0.95rem] rounded-full",
  icon: "h-10 w-10 rounded-full",
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const buttonClass = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  cn(base, variants[variant], variant !== "link" && sizes[size], className)

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...props },
  ref
) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        </span>
      )}
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
    </button>
  )
})

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  prefetch,
}: {
  href: string
  variant?: Variant
  size?: Size
  className?: string
  children: React.ReactNode
  prefetch?: boolean
}) {
  return (
    <Link href={href} prefetch={prefetch} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  )
}
