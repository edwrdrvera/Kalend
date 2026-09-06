import { Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import KalendMark, { type KalendMarkAnimation } from "./KalendMark";

// Brand-only display face for the wordmark. Scoped to this component via a
// CSS variable rather than replacing the app's --font-sans (see
// src/app/globals.css for why that stays the system SF Pro stack).
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-kalend-wordmark",
});

interface KalendWordmarkProps {
  /** "lg" is the marketing lockup (40px mark / 38px ExtraBold type). "sm" is
   *  the in-app header lockup (24px mark / 16px Bold type). */
  size?: "lg" | "sm";
  tone?: "white" | "ink";
  animation?: KalendMarkAnimation;
  className?: string;
}

const SIZE_SPEC = {
  lg: { mark: 40, fontSize: 38, fontWeight: 800, letterSpacing: "-0.02em", gapClassName: "gap-3.5" },
  sm: { mark: 24, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", gapClassName: "gap-2.5" },
} as const;

export default function KalendWordmark({
  size = "sm",
  tone = "white",
  animation = "none",
  className,
}: KalendWordmarkProps) {
  const spec = SIZE_SPEC[size];
  const color = tone === "white" ? "#ffffff" : "#1c1a16";

  return (
    <span
      className={cn(plusJakartaSans.variable, "inline-flex items-center", spec.gapClassName, className)}
    >
      <KalendMark size={spec.mark} tone={tone} animation={animation} />
      <span
        className="font-[family-name:var(--font-kalend-wordmark)]"
        style={{ fontWeight: spec.fontWeight, fontSize: spec.fontSize, letterSpacing: spec.letterSpacing, color }}
      >
        Kalend
      </span>
    </span>
  );
}
