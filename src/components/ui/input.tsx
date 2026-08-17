import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn("input input-sm w-full", className)}
      {...props}
    />
  )
}

export { Input }
