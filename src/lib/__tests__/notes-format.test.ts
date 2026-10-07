import { describe, expect, it } from "bun:test";
import { parseInline, parseNotes } from "../notes-format";

describe("parseInline", () => {
  it("marks bold text", () => {
    expect(parseInline("bring **a pen** please")).toEqual([
      { type: "text", text: "bring " },
      { type: "bold", text: "a pen" },
      { type: "text", text: " please" },
    ]);
  });

  it("turns a bare link into a link and leaves trailing punctuation outside it", () => {
    expect(parseInline("see https://example.com/a.")).toEqual([
      { type: "text", text: "see " },
      { type: "link", text: "https://example.com/a", href: "https://example.com/a" },
      { type: "text", text: "." },
    ]);
  });

  it("uses the label of a named link", () => {
    expect(parseInline("[Zoom](https://zoom.us/j/1)")).toEqual([
      { type: "link", text: "Zoom", href: "https://zoom.us/j/1" },
    ]);
  });

  it("does not link javascript: URLs", () => {
    expect(parseInline("[x](javascript:alert(1))")).toEqual([{ type: "text", text: "[x](javascript:alert(1))" }]);
  });
});

describe("parseNotes", () => {
  it("groups bullet lines into one list between paragraphs", () => {
    const blocks = parseNotes("Bring:\n- pen\n* paper\nThanks");
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "list", "paragraph"]);
    expect(blocks[1]).toMatchObject({ items: [[{ text: "pen" }], [{ text: "paper" }]] });
  });

  it("keeps consecutive lines in one paragraph and splits on a blank line", () => {
    const blocks = parseNotes("a\nb\n\nc");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ lines: [[{ text: "a" }], [{ text: "b" }]] });
  });
});
