"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

interface PanelShellProps {
  label: string;
  /**
   * true in overlay/full-screen modes (< ~1200px): the panel behaves as a
   * modal dialog (focus trapped). false when pinned on desktop: it is a
   * complementary landmark and the calendar stays interactive alongside it.
   */
  modal: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** The right panel's frame: landmark or dialog role, focus on open, Escape to close. */
export default function PanelShell({ label, modal, onClose, children }: PanelShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Move focus into the panel on open; restore it to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (!modal || e.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role={modal ? "dialog" : "complementary"}
      aria-modal={modal ? true : undefined}
      aria-label={label}
      onKeyDown={handleKeyDown}
      className="flex h-full w-full flex-col border-l border-border bg-card outline-none"
    >
      {children}
    </div>
  );
}
