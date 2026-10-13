"use client";

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
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (href !== "#waitlist") return;

    const emailInput = document.getElementById("waitlist-email");
    if (!(emailInput instanceof HTMLInputElement)) return;

    event.preventDefault();
    window.history.replaceState(null, "", href);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    emailInput.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    emailInput.focus({ preventScroll: true });
    if (!reduceMotion) {
      emailInput.animate(
        [{ boxShadow: "0 0 0 0 color-mix(in srgb, var(--kal-primary) 35%, transparent)" }, { boxShadow: "0 0 0 8px color-mix(in srgb, var(--kal-primary) 0%, transparent)" }],
        { duration: 500, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
      );
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(landingButtonVariants({ variant, size }), className)}
    >
      {children}
    </Link>
  );
}
