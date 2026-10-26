import type { Metadata } from "next";
import { AuthLayout } from "@/components/AuthLayout";
import { ForgotPasswordForm } from "../ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Link expired",
};

// Shown when the reset link is old or has already been used
export default function ExpiredLinkPage() {
  return (
    <AuthLayout
      title="This link has expired"
      subtitle="Reset links work once and only for 1 hour. Enter your email and we’ll send you a new one."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
