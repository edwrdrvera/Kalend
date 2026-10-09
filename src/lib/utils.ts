import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge reads `text-<word>` as a color unless it knows the word is a
// font size, so the type-scale tokens from globals.css are registered here.
// Without this, `text-meta` and a later `text-destructive` merge into one.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["meta", "body", "title"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
