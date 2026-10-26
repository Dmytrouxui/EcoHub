"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { createClient } from "@/lib/supabase/client";
import styles from "@/components/AuthForm.module.css";

type Errors = {
  email?: string;
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordUpdated = searchParams.get("reset") === "success";
  const accountDeleted = searchParams.get("deleted") === "1";
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const nextErrors: Errors = {};
    if (!email) nextErrors.email = "Enter your email.";
    else if (!emailPattern.test(email)) nextErrors.email = "Enter a valid email address.";
    if (!password) nextErrors.password = "Enter your password.";

    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setFormError(
        error.code === "invalid_credentials"
          ? "The email or password is incorrect. Please try again."
          : "We couldn’t sign you in right now. Please try again in a moment.",
      );
      return;
    }

    router.push("/feed");
    router.refresh();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {passwordUpdated ? (
        <p className={styles.notice} role="status">
          Your password has been updated. Please sign in with your new password.
        </p>
      ) : null}
      {accountDeleted ? (
        <p className={styles.notice} role="status">
          Your account has been deleted. We’re sorry to see you go.
        </p>
      ) : null}

      <div className={styles.fields}>
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          error={errors.email}
        />
        <div className={styles.passwordGroup}>
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            error={errors.password}
          />
          <Link href="/forgot-password" className={styles.forgot}>
            Forgot Password?
          </Link>
        </div>
      </div>

      {formError ? (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      ) : null}

      <Button type="submit" fullWidth disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>

      <p className={styles.signUp}>
        <span>Don’t have an account?</span>{" "}
        <Link href="/sign-up" className={styles.textLink}>
          Sign up Now!
        </Link>
      </p>
    </form>
  );
}
