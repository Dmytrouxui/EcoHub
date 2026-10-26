import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <AuthLayout
      title="Welcome back to EcoHub"
      subtitle="Please log in to your EcoHub account to see what your community is sharing."
    >
      {/* Suspense: the form reads the URL (?reset=success) in the browser */}
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthLayout>
  );
}
