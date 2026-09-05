import { cn } from "@/lib/utils";

/** Hover micro-interactions from the brand handoff. "none" renders a static mark. */
export type KalendMarkAnimation =
  | "none"
  | "scatter"
  | "pulse"
  | "rotate"
  | "colorShift"
  | "morphK"
  | "morphClock";

interface KalendMarkProps {
  /** Rendered width/height in px; the mark is always square. */
  size?: number;
  /** "white" for the app's dark surfaces (the default), "ink" for light backgrounds. */
  tone?: "white" | "ink";
  animation?: KalendMarkAnimation;
  /** Accessible name. Omit for a mark placed next to its own label (e.g. inside KalendWordmark). */
  label?: string;
  className?: string;
}

/** The 6-dot mark: a 3x3 grid arranged to suggest a "K", in fixed DOM order
 *  (top-left, mid-left, bottom-left, center, top-right, bottom-right). The
 *  hover animations in kalend-mark.css key off that order and off the
 *  `data-kalend-anim` attribute set here, so this order must not change. */
const DOTS = [
  { cx: 24, cy: 24 },
  { cx: 24, cy: 60 },
  { cx: 24, cy: 96 },
  { cx: 60, cy: 60 },
  { cx: 96, cy: 24 },
  { cx: 96, cy: 96 },
] as const;

export default function KalendMark({
  size = 24,
  tone = "white",
  animation = "none",
  label,
  className,
}: KalendMarkProps) {
  const fill = tone === "white" ? "#ffffff" : "#1c1a16";

  return (
    <span
      className={cn("kalend-mark inline-block leading-none", className)}
      data-kalend-anim={animation !== "none" ? animation : undefined}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      >
        {DOTS.map((dot) => (
          <circle key={`${dot.cx}-${dot.cy}`} cx={dot.cx} cy={dot.cy} r="11" fill={fill} />
        ))}
        {animation === "morphK" && (
          <>
            {/* Base opacity is set in globals.css (.kalend-mark[data-kalend-anim="morphK"]),
             *  not inline, so the :hover rule there can override it. */}
            <rect x="18" y="16" width="12" height="88" rx="6" fill={fill} />
            <polygon points="30,60 80,16 80,36 42,60 80,84 80,104 30,60" fill={fill} />
          </>
        )}
        {animation === "morphClock" && (
          // Base opacity set in globals.css (.kalend-mark[data-kalend-anim="morphClock"]).
          <line x1="60" y1="60" x2="84" y2="96" stroke={fill} strokeWidth="6" strokeLinecap="round" />
        )}
      </svg>
    </span>
  );
}
