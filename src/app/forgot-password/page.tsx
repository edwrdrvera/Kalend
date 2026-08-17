import type { Metadata } from "next";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password | Kalend",
  description: "Reset your Kalend account password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
