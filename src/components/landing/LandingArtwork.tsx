// Decorative doodle icons for the left and right margins of the landing hero.
// SVG paths drawn from the "Kalend Doodle Icons" sheet.
// Only rendered at ≥1440px, where there is enough room outside the 1200px
// content column. At narrower viewports the icons would overlap the headline.

const INK = "#1c1a16";
const ORANGE = "#f97316";
const CORAL = "#f2836b";
const MINT = "#8fd8c8";
const MUSTARD = "#f0c05a";
const INDIGO = "#6366f1";

// All icons share a 64×64 viewBox and are rendered at this size.
const SZ = 42;

// Positions are relative to the top-left / top-right of the hero section
// wrapper (below the nav), matching the approved design artboard (1440 wide).

export default function LandingArtwork() {
  return (
    <div
      className="pointer-events-none absolute inset-0 hidden min-[1440px]:block"
      aria-hidden="true"
    >
      {/* ── LEFT SIDE ─────────────────────────────────────────────────── */}

      {/* Sparkle — mustard 4-point star */}
      <div style={{ position: "absolute", left: 48, top: 0, transform: "rotate(-10deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <path d="M32 10 L36 28 L52 32 L36 36 L32 52 L28 36 L12 32 L28 28 Z" fill={MUSTARD} />
        </svg>
      </div>

      {/* Calendar — ink box with orange date dot */}
      <div style={{ position: "absolute", left: 14, top: 34, transform: "rotate(-7deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <rect x="10" y="14" width="44" height="38" rx="6" stroke={INK} strokeWidth="3" />
          <line x1="10" y1="25" x2="54" y2="25" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <line x1="22" y1="8" x2="22" y2="20" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <line x1="42" y1="8" x2="42" y2="20" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="38" r="5" fill={ORANGE} />
        </svg>
      </div>

      {/* Alarm clock — ink face with coral top bell */}
      <div style={{ position: "absolute", left: 130, top: 80, transform: "rotate(9deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="34" r="20" stroke={INK} strokeWidth="3" />
          <path d="M32 22 L32 34 L40 39" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M15 20 L20 15" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M49 20 L44 15" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="10" r="4" fill={CORAL} />
        </svg>
      </div>

      {/* Task-done clipboard — ink body with mint checkmark */}
      <div style={{ position: "absolute", left: 12, top: 164, transform: "rotate(-5deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <rect x="14" y="16" width="36" height="40" rx="5" stroke={INK} strokeWidth="3" />
          <path d="M24 12 Q24 6 32 6 Q40 6 40 12" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
          <line x1="22" y1="28" x2="42" y2="28" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M22 38 L29 45 L42 32" stroke={MINT} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Flag — ink pole with orange pennant */}
      <div style={{ position: "absolute", left: 148, top: 160, transform: "rotate(11deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <line x1="18" y1="56" x2="18" y2="10" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M18 10 L50 10 L44 28 L18 28 Z" fill={ORANGE} />
        </svg>
      </div>

      {/* CS 201 chip — mint pill with indigo dot */}
      <div style={{ position: "absolute", left: 42, top: 242 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: MINT,
            borderRadius: 100,
            padding: "6px 13px",
          }}
        >
          <div
            style={{ width: 8, height: 8, borderRadius: "50%", background: INDIGO, flexShrink: 0 }}
          />
          <span
            style={{ fontSize: 12, fontWeight: 700, color: INK, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}
          >
            CS 201
          </span>
        </div>
      </div>

      {/* Dot cluster — 2×2 grid in tile colors */}
      <div style={{ position: "absolute", left: 26, top: 310 }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <circle cx="20" cy="20" r="9" fill={MUSTARD} />
          <circle cx="44" cy="20" r="9" fill={MINT} />
          <circle cx="20" cy="44" r="9" fill={CORAL} />
          <circle cx="44" cy="44" r="9" fill={ORANGE} />
        </svg>
      </div>

      {/* Notify bubble — ink speech bubble with indigo dots */}
      <div style={{ position: "absolute", left: 18, top: 392, transform: "rotate(-6deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <path
            d="M12 16 Q12 8 20 8 L44 8 Q52 8 52 16 L52 36 Q52 44 44 44 L30 44 L22 56 L22 44 L20 44 Q12 44 12 36 Z"
            stroke={INK}
            strokeWidth="3"
            strokeLinejoin="round"
            fill="white"
            fillOpacity="0.5"
          />
          <circle cx="24" cy="27" r="4" fill={INDIGO} />
          <circle cx="32" cy="27" r="4" fill={INDIGO} />
          <circle cx="40" cy="27" r="4" fill={INDIGO} />
        </svg>
      </div>

      {/* Pin — ink teardrop with coral inner dot */}
      <div style={{ position: "absolute", left: 130, top: 486, transform: "rotate(8deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <path
            d="M32 8 C20 8 14 18 14 28 C14 40 32 58 32 58 C32 58 50 40 50 28 C50 18 44 8 32 8 Z"
            stroke={INK}
            strokeWidth="3"
            fill="none"
          />
          <circle cx="32" cy="28" r="6" fill={CORAL} />
        </svg>
      </div>

      {/* Check stroke — bold mint tick */}
      <div style={{ position: "absolute", left: 14, top: 580, transform: "rotate(-5deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <path
            d="M12 32 L26 48 L54 16"
            stroke={MINT}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Dot trail — four ink dots rising diagonally */}
      <div style={{ position: "absolute", left: 46, top: 668, transform: "rotate(4deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <circle cx="12" cy="50" r="5" fill={INK} />
          <circle cx="26" cy="40" r="5" fill={INK} />
          <circle cx="40" cy="30" r="5" fill={INK} />
          <circle cx="54" cy="20" r="5" fill={INK} />
        </svg>
      </div>

      {/* ── RIGHT SIDE ────────────────────────────────────────────────── */}

      {/* Reminder bell — ink bell with orange dot */}
      <div style={{ position: "absolute", right: 22, top: 16, transform: "rotate(6deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <path
            d="M32 6 C22 6 18 16 18 26 L18 42 L46 42 L46 26 C46 16 42 6 32 6 Z"
            stroke={INK}
            strokeWidth="3"
            fill="none"
            strokeLinejoin="round"
          />
          <line x1="18" y1="42" x2="46" y2="42" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M26 42 Q26 52 32 52 Q38 52 38 42" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="32" cy="6" r="4" fill={ORANGE} />
        </svg>
      </div>

      {/* Hourglass — ink outline with indigo sand dots */}
      <div style={{ position: "absolute", right: 116, top: 74, transform: "rotate(-8deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <path
            d="M14 8 L50 8 L50 14 L36 30 L50 46 L50 56 L14 56 L14 46 L28 30 L14 14 Z"
            stroke={INK}
            strokeWidth="3"
            fill="none"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="42" r="5" fill={INDIGO} />
          <circle cx="25" cy="50" r="3.5" fill={INDIGO} />
          <circle cx="39" cy="50" r="3.5" fill={INDIGO} />
        </svg>
      </div>

      {/* Confirmed circle — ink ring with mint check */}
      <div style={{ position: "absolute", right: 18, top: 146, transform: "rotate(5deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="22" stroke={INK} strokeWidth="3" fill="none" />
          <path
            d="M20 32 L28 42 L46 22"
            stroke={MINT}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Due badge — mustard pill */}
      <div style={{ position: "absolute", right: 38, top: 236 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: MUSTARD,
            borderRadius: 100,
            padding: "6px 13px",
          }}
        >
          <span
            style={{ fontSize: 12, fontWeight: 700, color: INK, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}
          >
            Due Thu
          </span>
        </div>
      </div>

      {/* Dot cluster — 2×2 grid in alternate tile colors */}
      <div style={{ position: "absolute", right: 24, top: 312 }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <circle cx="20" cy="20" r="9" fill={CORAL} />
          <circle cx="44" cy="20" r="9" fill={ORANGE} />
          <circle cx="20" cy="44" r="9" fill={INDIGO} />
          <circle cx="44" cy="44" r="9" fill={MINT} />
        </svg>
      </div>

      {/* Plus circle — ink ring with orange plus */}
      <div style={{ position: "absolute", right: 20, top: 398, transform: "rotate(-7deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="22" stroke={INK} strokeWidth="3" fill="none" />
          <path d="M32 22 L32 42 M22 32 L42 32" stroke={ORANGE} strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      {/* Swoosh wave — mustard curved stroke */}
      <div style={{ position: "absolute", right: 110, top: 494, transform: "rotate(7deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <path
            d="M8 42 C16 24 28 50 38 34 C44 22 52 38 58 30"
            stroke={MUSTARD}
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Curve-to-add — ink curved arrow with orange plus */}
      <div style={{ position: "absolute", right: 18, top: 586, transform: "rotate(-5deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <path d="M18 50 C18 30 34 18 50 24" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path
            d="M50 12 L50 24 L38 24"
            stroke={INK}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M44 42 L54 42 M49 37 L49 47" stroke={ORANGE} strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      {/* Check stroke — bold coral tick */}
      <div style={{ position: "absolute", right: 40, top: 678, transform: "rotate(4deg)" }}>
        <svg width={SZ} height={SZ} viewBox="0 0 64 64" fill="none">
          <path
            d="M12 32 L26 48 L54 16"
            stroke={CORAL}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
