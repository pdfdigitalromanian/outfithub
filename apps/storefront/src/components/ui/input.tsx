import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes } from "react"
import { cn } from "@/lib/util/cn"

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
  wrapperClassName?: string
}

/** Floating-label input with accessible label, hint and error wiring. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, className, wrapperClassName, id, required, ...props },
  ref
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = [error ? `${inputId}-err` : null, hint ? `${inputId}-hint` : null].filter(Boolean).join(" ") || undefined
  return (
    <div className={cn("flex flex-col gap-1", wrapperClassName)}>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          placeholder=" "
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={cn(
            "peer h-14 w-full rounded-md border bg-surface px-4 pt-5 pb-1.5 text-[0.95rem] text-ink outline-none transition-colors",
            "border-line hover:border-stone focus:border-ink focus-visible:outline-none",
            error && "border-danger focus:border-danger",
            className
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[0.95rem] text-muted transition-all duration-200",
            "peer-focus:top-4 peer-focus:text-[0.7rem] peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:text-[0.7rem]"
          )}
        >
          {label}
          {required && <span aria-hidden> *</span>}
        </label>
      </div>
      {hint && !error && (
        <p id={`${inputId}-hint`} className="px-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-err`} role="alert" className="px-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
})

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: { value: string; label: string }[] }

export function SelectField({ label, options, className, id, ...props }: SelectFieldProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <div className="relative">
      <select
        id={selectId}
        className={cn(
          "h-14 w-full appearance-none rounded-md border border-line bg-surface px-4 pt-5 pb-1.5 text-[0.95rem] text-ink outline-none hover:border-stone focus:border-ink",
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <label htmlFor={selectId} className="pointer-events-none absolute left-4 top-4 -translate-y-1/2 text-[0.7rem] text-muted">
        {label}
      </label>
      <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
        <path fill="currentColor" d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
      </svg>
    </div>
  )
}

export function Checkbox({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-sm text-ink-2", className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-[6px] border border-stone bg-surface transition-colors checked:border-ink checked:bg-ink checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22><path fill=%22white%22 d=%22M8.2 13.6 4.9 10.3l1.2-1.2 2.1 2.1 5.7-5.7 1.2 1.2z%22/></svg>')] bg-center bg-no-repeat"
        {...props}
      />
      <span>{label}</span>
    </label>
  )
}
