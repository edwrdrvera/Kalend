import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// The two CTA styles from the landing mockup (docs/landing-page-handoff.md):
// a filled orange "primary" and an outlined "secondary". Kept as their own
// small variant set rather than reusing `@/components/ui/button`, since the
// landing page's palette (--kal-*) is intentionally separate from the app's
// own button/theme tokens.
const landingButtonVariants = cva(
  "inline-flex items-center justify-center rounded-[10px] transition-colors duration-150 whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--kal-accent)] text-white font-semibold hover:bg-[var(--kal-accent-hover)]",
        secondary:
          "border border-[var(--kal-border)] bg-transparent text-[var(--kal-ink)] font-medium hover:bg-[#f2efe6] hover:border-[#d8d2c2]",
      },
      size: {
        default: "px-[22px] py-3 text-sm",
        hero: "px-[26px] py-[13px] text-[15px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

interface LandingButtonProps extends VariantProps<typeof landingButtonVariants> {
  href: string;
  className?: string;
  children: React.ReactNode;
}

export default function LandingButton({
  href,
  variant,
  size,
  className,
  children,
}: LandingButtonProps) {
  return (
    <Link href={href} className={cn(landingButtonVariants({ variant, size }), className)}>
      {children}
    </Link>
  );
}
