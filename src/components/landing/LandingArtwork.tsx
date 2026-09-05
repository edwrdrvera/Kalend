// Decorative artwork for the sides of the landing hero.
// Hand-drawn doodle arrows (PNG) are scattered around the margins alongside
// a couple of Kalend-specific product chips and dot clusters.
//
// Two breakpoint layers:
//  • Compact (860–1440 px): items hug the viewport edges so they sit in the
//    narrow gutter without overlapping the 1200 px content column.
//  • Wide (1440 px+): items spread further into the true margin.

import Image from "next/image";

const INK = "#1c1a16";
const ORANGE = "#f97316";
const CORAL = "#f2836b";
const MINT = "#8fd8c8";
const MUSTARD = "#f0c05a";
const INDIGO = "#6366f1";

// Shared img props — arrows are black ink, slight opacity keeps them from
// competing with the main content.
const ARROW_STYLE: React.CSSProperties = { opacity: 0.72 };

export default function LandingArtwork() {
  return (
    <>
      {/* ── COMPACT (860–1440 px) ──────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 hidden min-[580px]:block min-[1440px]:hidden"
        aria-hidden="true"
      >
        {/* LEFT */}
        <div style={{ position: "absolute", left: 6, top: 8, transform: "rotate(-12deg)" }}>
          <Image src="/doodle/arrow-ne.png" alt="" width={38} height={38} style={ARROW_STYLE} />
        </div>
        <div style={{ position: "absolute", left: 2, top: 80, transform: "rotate(6deg)" }}>
          <Image src="/doodle/chevrons-right.png" alt="" width={34} height={34} style={ARROW_STYLE} />
        </div>
        {/* CS 201 chip */}
        <div style={{ position: "absolute", left: 4, top: 168 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: MINT, borderRadius: 100, padding: "5px 11px" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: INDIGO, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: INK, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>CS 201</span>
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, top: 248, transform: "rotate(-8deg)" }}>
          <Image src="/doodle/arrow-circle-right.png" alt="" width={38} height={38} style={ARROW_STYLE} />
        </div>
        {/* Dot cluster */}
        <div style={{ position: "absolute", left: 4, top: 330 }}>
          <svg width={34} height={34} viewBox="0 0 64 64" fill="none">
            <circle cx="20" cy="20" r="9" fill={MUSTARD} />
            <circle cx="44" cy="20" r="9" fill={MINT} />
            <circle cx="20" cy="44" r="9" fill={CORAL} />
            <circle cx="44" cy="44" r="9" fill={ORANGE} />
          </svg>
        </div>
        <div style={{ position: "absolute", left: 2, top: 420, transform: "rotate(10deg)" }}>
          <Image src="/doodle/arrow-up.png" alt="" width={32} height={32} style={ARROW_STYLE} />
        </div>
        <div style={{ position: "absolute", left: 4, top: 510, transform: "rotate(-5deg)" }}>
          <Image src="/doodle/arrow-single-right.png" alt="" width={34} height={34} style={ARROW_STYLE} />
        </div>

        {/* RIGHT */}
        <div style={{ position: "absolute", right: 4, top: 12, transform: "rotate(10deg)" }}>
          <Image src="/doodle/arrow-nw.png" alt="" width={38} height={38} style={ARROW_STYLE} />
        </div>
        <div style={{ position: "absolute", right: 2, top: 88, transform: "rotate(-6deg)" }}>
          <Image src="/doodle/arrow-circle-up.png" alt="" width={38} height={38} style={ARROW_STYLE} />
        </div>
        {/* Due Thu chip */}
        <div style={{ position: "absolute", right: 4, top: 182 }}>
          <div style={{ display: "inline-flex", alignItems: "center", background: MUSTARD, borderRadius: 100, padding: "5px 11px" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: INK, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>Due Thu</span>
          </div>
        </div>
        <div style={{ position: "absolute", right: 0, top: 260, transform: "rotate(7deg)" }}>
          <Image src="/doodle/chevrons-left.png" alt="" width={34} height={34} style={ARROW_STYLE} />
        </div>
        {/* Dot cluster */}
        <div style={{ position: "absolute", right: 4, top: 338 }}>
          <svg width={34} height={34} viewBox="0 0 64 64" fill="none">
            <circle cx="20" cy="20" r="9" fill={CORAL} />
            <circle cx="44" cy="20" r="9" fill={ORANGE} />
            <circle cx="20" cy="44" r="9" fill={INDIGO} />
            <circle cx="44" cy="44" r="9" fill={MINT} />
          </svg>
        </div>
        <div style={{ position: "absolute", right: 2, top: 424, transform: "rotate(-12deg)" }}>
          <Image src="/doodle/arrow-sw.png" alt="" width={36} height={36} style={ARROW_STYLE} />
        </div>
        <div style={{ position: "absolute", right: 4, top: 510, transform: "rotate(6deg)" }}>
          <Image src="/doodle/chevrons-up.png" alt="" width={32} height={32} style={ARROW_STYLE} />
        </div>
      </div>

      {/* ── WIDE (1440 px+) ────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 hidden min-[1440px]:block"
        aria-hidden="true"
      >
        {/* LEFT */}
        <div style={{ position: "absolute", left: 52, top: 4, transform: "rotate(-12deg)" }}>
          <Image src="/doodle/arrow-ne.png" alt="" width={44} height={44} style={ARROW_STYLE} />
        </div>
        <div style={{ position: "absolute", left: 18, top: 82, transform: "rotate(6deg)" }}>
          <Image src="/doodle/chevrons-right.png" alt="" width={40} height={40} style={ARROW_STYLE} />
        </div>
        {/* CS 201 chip */}
        <div style={{ position: "absolute", left: 44, top: 186 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: MINT, borderRadius: 100, padding: "6px 13px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: INDIGO, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: INK, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>CS 201</span>
          </div>
        </div>
        <div style={{ position: "absolute", left: 14, top: 274, transform: "rotate(-8deg)" }}>
          <Image src="/doodle/arrow-circle-right.png" alt="" width={44} height={44} style={ARROW_STYLE} />
        </div>
        {/* Dot cluster */}
        <div style={{ position: "absolute", left: 28, top: 362 }}>
          <svg width={40} height={40} viewBox="0 0 64 64" fill="none">
            <circle cx="20" cy="20" r="9" fill={MUSTARD} />
            <circle cx="44" cy="20" r="9" fill={MINT} />
            <circle cx="20" cy="44" r="9" fill={CORAL} />
            <circle cx="44" cy="44" r="9" fill={ORANGE} />
          </svg>
        </div>
        <div style={{ position: "absolute", left: 88, top: 462, transform: "rotate(10deg)" }}>
          <Image src="/doodle/arrow-up.png" alt="" width={38} height={38} style={ARROW_STYLE} />
        </div>
        <div style={{ position: "absolute", left: 22, top: 560, transform: "rotate(-5deg)" }}>
          <Image src="/doodle/arrow-single-right.png" alt="" width={40} height={40} style={ARROW_STYLE} />
        </div>
        <div style={{ position: "absolute", left: 66, top: 650, transform: "rotate(8deg)" }}>
          <Image src="/doodle/chevrons-right.png" alt="" width={36} height={36} style={ARROW_STYLE} />
        </div>

        {/* RIGHT */}
        <div style={{ position: "absolute", right: 48, top: 8, transform: "rotate(10deg)" }}>
          <Image src="/doodle/arrow-nw.png" alt="" width={44} height={44} style={ARROW_STYLE} />
        </div>
        <div style={{ position: "absolute", right: 110, top: 88, transform: "rotate(-6deg)" }}>
          <Image src="/doodle/arrow-circle-up.png" alt="" width={44} height={44} style={ARROW_STYLE} />
        </div>
        {/* Due Thu chip */}
        <div style={{ position: "absolute", right: 40, top: 190 }}>
          <div style={{ display: "inline-flex", alignItems: "center", background: MUSTARD, borderRadius: 100, padding: "6px 13px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: INK, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>Due Thu</span>
          </div>
        </div>
        <div style={{ position: "absolute", right: 20, top: 278, transform: "rotate(7deg)" }}>
          <Image src="/doodle/chevrons-left.png" alt="" width={40} height={40} style={ARROW_STYLE} />
        </div>
        {/* Dot cluster */}
        <div style={{ position: "absolute", right: 26, top: 364 }}>
          <svg width={40} height={40} viewBox="0 0 64 64" fill="none">
            <circle cx="20" cy="20" r="9" fill={CORAL} />
            <circle cx="44" cy="20" r="9" fill={ORANGE} />
            <circle cx="20" cy="44" r="9" fill={INDIGO} />
            <circle cx="44" cy="44" r="9" fill={MINT} />
          </svg>
        </div>
        <div style={{ position: "absolute", right: 112, top: 458, transform: "rotate(-12deg)" }}>
          <Image src="/doodle/arrow-sw.png" alt="" width={42} height={42} style={ARROW_STYLE} />
        </div>
        <div style={{ position: "absolute", right: 22, top: 556, transform: "rotate(6deg)" }}>
          <Image src="/doodle/chevrons-up.png" alt="" width={38} height={38} style={ARROW_STYLE} />
        </div>
        <div style={{ position: "absolute", right: 60, top: 648, transform: "rotate(-8deg)" }}>
          <Image src="/doodle/chevrons-left.png" alt="" width={36} height={36} style={ARROW_STYLE} />
        </div>
      </div>
    </>
  );
}
