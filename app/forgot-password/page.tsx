import type { Metadata } from "next";
import { AuthLayout } from "@/components/AuthLayout";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgotten Password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgotten Password"
      subtitle="Enter your email and we’ll send you a link to reset your password"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
