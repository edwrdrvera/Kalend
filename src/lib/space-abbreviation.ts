/** Rail label for a Space name: its initial, or the first two words' initials for a multi-word name. */
export function spaceAbbreviation(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}
