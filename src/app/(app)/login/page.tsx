import type { Metadata } from "next";
import AuthCard from "@/components/AuthCard";

export const metadata: Metadata = {
  title: "Sign in | Kalend",
  description: "Sign in to access your calendar and task manager.",
};

export default function LoginPage() {
  return <AuthCard />;
}
