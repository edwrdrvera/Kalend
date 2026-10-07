/** Turns what a person typed into a safe web link, or null when it is not one.
 *  Adds https:// when no scheme is given, and only accepts http and https. */
export function parseWebLink(raw: string): { href: string; host: string } | null {
  const text = raw.trim();
  if (!text) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname.includes(".")) return null;
  return { href: parsed.href, host: parsed.hostname.replace(/^www\./i, "") };
}
