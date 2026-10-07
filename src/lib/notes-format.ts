/** A run of notes text. Only bold and http(s) links are recognized. */
export type NotesInline =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "link"; text: string; href: string };

export type NotesBlock =
  | { type: "paragraph"; lines: NotesInline[][] }
  | { type: "list"; items: NotesInline[][] };

const INLINE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*|(https?:\/\/[^\s<]+)/g;
const BULLET = /^\s*[-*]\s+(.*)$/;
const TRAILING_PUNCTUATION = /[.,;:!?)]+$/;

export function parseInline(line: string): NotesInline[] {
  const out: NotesInline[] = [];
  let last = 0;
  for (const m of line.matchAll(INLINE)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ type: "text", text: line.slice(last, start) });
    let end = start + m[0].length;
    if (m[2] !== undefined) {
      out.push({ type: "link", text: m[1], href: m[2] });
    } else if (m[3] !== undefined) {
      out.push({ type: "bold", text: m[3] });
    } else {
      const href = m[4].replace(TRAILING_PUNCTUATION, "");
      end = start + href.length;
      out.push({ type: "link", text: href, href });
    }
    last = end;
  }
  if (last < line.length) out.push({ type: "text", text: line.slice(last) });
  return out;
}

/** Splits notes into paragraphs and bullet lists. Bullet lines start with "- " or "* ". */
export function parseNotes(value: string): NotesBlock[] {
  const blocks: NotesBlock[] = [];
  for (const line of value.split("\n")) {
    const bullet = BULLET.exec(line);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last?.type === "list") last.items.push(parseInline(bullet[1]));
      else blocks.push({ type: "list", items: [parseInline(bullet[1])] });
    } else if (line.trim() === "") {
      blocks.push({ type: "paragraph", lines: [] });
    } else if (last?.type === "paragraph" && last.lines.length > 0) {
      last.lines.push(parseInline(line));
    } else {
      blocks.push({ type: "paragraph", lines: [parseInline(line)] });
    }
  }
  return blocks.filter((b) => b.type === "list" || b.lines.length > 0);
}
