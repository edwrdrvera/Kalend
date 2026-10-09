"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import KalendMark from "./KalendMark";

interface AuthCardShellProps {
  title: string;
  subtitle: string;
  error?: string | null;
  children: React.ReactNode;
}

export default function AuthCardShell({ title, subtitle, error, children }: AuthCardShellProps) {
  // Keep the last message mounted while the banner collapses, so the text
  // doesn't vanish before the box has finished closing.
  const [lastError, setLastError] = useState(error);
  if (error && error !== lastError) setLastError(error);
  const shownError = error ?? lastError;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--kal-bg)] px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--kal-border)] bg-[var(--kal-surface)] p-8 shadow-[0_20px_48px_-24px_rgba(28,26,22,0.18)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <KalendMark size={40} tone="ink" label="Kalend" className="mb-4" />
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--kal-ink)]">{title}</h1>
          <p className="mt-1 text-sm text-[var(--kal-muted)]">{subtitle}</p>
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
            error ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <div
              role="alert"
              className="mb-4 rounded-[10px] border border-red-200 bg-red-50 p-3 text-xs text-red-700"
            >
              {shownError}
            </div>
          </div>
        </div>

        {children}
      </div>
      <Link
        href="/"
        className="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-md px-1 py-2 text-xs text-[var(--kal-muted)] transition-colors hover:text-[var(--kal-ink)]"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to Kalend
      </Link>
    </div>
  );
}

// Shared input styling for AuthCard's fields.
export const authInputClassName =
  "w-full rounded-[10px] border border-[var(--kal-border)] bg-[var(--kal-surface)] px-3 py-2 text-base min-[640px]:text-sm text-[var(--kal-ink)] transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--kal-muted)] focus:border-[var(--kal-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kal-primary)]/25 disabled:opacity-60";

export const authLabelClassName = "text-sm font-medium text-[var(--kal-ink)]/80";
