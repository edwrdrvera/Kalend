import type { Metadata } from "next";
import { Suspense } from "react";
import AuthCard from "@/components/AuthCard";

export const metadata: Metadata = {
  title: "Sign in | Kalend",
  description: "Sign in to access your calendar and task manager.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <AuthCard />
    </Suspense>
  );
}
