import type { Metadata } from "next";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set new password | Kalend",
  description: "Choose a new password for your Kalend account.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
