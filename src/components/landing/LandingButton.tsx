import Link from "next/link";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { landingButtonVariants } from "./landing-button-variants";

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
