import type { Metadata } from "next";
import { AuthLayout } from "@/components/AuthLayout";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Create a new password",
};

// Opened from the link in the reset email. proxy.ts sends visitors without
// a valid link back to /forgot-password.
export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Create a new password"
      subtitle="Choose a new password for your EcoHub account. Use at least 8 characters."
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}
