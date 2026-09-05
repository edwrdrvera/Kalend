import type { Metadata } from "next";
import AuthCard from "@/components/AuthCard";

export const metadata: Metadata = {
  title: "Create an account | Kalend",
  description: "Sign up to start planning your academic schedule.",
};

export default function SignupPage() {
  return <AuthCard mode="signup" />;
}
