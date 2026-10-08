"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

/** Shares one open delay across a group: once a tip is showing, neighbours open instantly. */
function TooltipProvider({ delay = 500, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider delay={delay} {...props} />
}

/** Wraps a single trigger element. `label` is the tip text. */
function Tooltip({
  label,
  side = "right",
  children,
}: {
  label: string
  side?: "top" | "right" | "bottom" | "left"
  children: React.ReactElement<Record<string, unknown>>
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={8} className="z-50">
          <TooltipPrimitive.Popup
            className={cn(
              "origin-(--transform-origin) rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md ring-1 ring-foreground/10",
              "transition-[opacity,transform] duration-125 ease-snappy",
              "data-starting-style:scale-[0.97] data-starting-style:opacity-0 data-ending-style:scale-[0.97] data-ending-style:opacity-0",
              "data-instant:duration-0"
            )}
          >
            {label}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export { Tooltip, TooltipProvider }
