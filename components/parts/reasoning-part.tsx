"use client"

import { ChevronRightIcon } from "lucide-react"

import { type ReasoningMessagePart } from "@/tools"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export function ReasoningPart({
  part,
  isStreaming = false,
}: {
  part: ReasoningMessagePart
  isStreaming?: boolean
}) {
  if (!part.text.trim()) return null

  return (
    <Collapsible className="px-1.5 text-sm text-muted-foreground">
      <CollapsibleTrigger className="flex cursor-pointer items-center gap-1 hover:text-foreground data-panel-open:[&_svg]:rotate-90">
        <ChevronRightIcon className="size-3.5 transition-transform" />
        <span className={isStreaming ? "shimmer" : undefined}>
          {isStreaming ? "Thinking…" : "Thought process"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 border-l pl-3 whitespace-pre-wrap">
        {part.text}
      </CollapsibleContent>
    </Collapsible>
  )
}
