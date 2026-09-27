"use client"

import * as Accordion from "@radix-ui/react-accordion"
import { Plus } from "lucide-react"

export function ProductAccordion({ items }: { items: { id: string; title: string; content: React.ReactNode }[] }) {
  return (
    <Accordion.Root type="multiple" defaultValue={[items[0]?.id]} className="border-t border-line">
      {items.map((it) => (
        <Accordion.Item key={it.id} value={it.id} className="border-b border-line">
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between py-5 text-left text-sm font-medium">
              {it.title}
              <Plus className="h-4 w-4 transition-transform duration-300 group-data-[state=open]:rotate-45" aria-hidden />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden pb-5 text-sm leading-relaxed text-ink-2 data-[state=closed]:hidden">{it.content}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
