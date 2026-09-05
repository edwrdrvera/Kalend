interface KalendAppIconProps {
  size?: number;
  className?: string;
}

const DOTS = [
  { cx: 36, cy: 36 },
  { cx: 36, cy: 60 },
  { cx: 36, cy: 84 },
  { cx: 60, cy: 60 },
  { cx: 84, cy: 36 },
  { cx: 84, cy: 84 },
] as const;

/** App-icon variant of the mark: white dots, scaled in, on a Primary Blue
 *  squircle. Store / home-screen use only — the in-app mark ships bare
 *  (see `KalendMark`). */
export default function KalendAppIcon({ size = 128, className }: KalendAppIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      role="img"
      aria-label="Kalend"
      className={className}
    >
      {/* fill via CSS so it tracks the --primary token rather than a hardcoded hex */}
      <rect width="120" height="120" rx="26" style={{ fill: "var(--primary)" }} />
      {DOTS.map((dot) => (
        <circle key={`${dot.cx}-${dot.cy}`} cx={dot.cx} cy={dot.cy} r="9" fill="#ffffff" />
      ))}
    </svg>
  );
}
