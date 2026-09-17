/** Two-letter abbreviation for a Space name: first letter uppercase, second lowercase. */
export function spaceAbbreviation(name: string): string {
  const cleaned = name.trim();
  if (cleaned.length === 0) return "??";
  if (cleaned.length === 1) return cleaned.toUpperCase();
  return cleaned[0].toUpperCase() + cleaned[1].toLowerCase();
}
