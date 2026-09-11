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
    emailInput.scrollIntoView({ behavior: "smooth", block: "center" });
    emailInput.focus({ preventScroll: true });
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
