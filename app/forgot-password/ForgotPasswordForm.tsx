"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/Button";
import { ButtonLink } from "@/components/ButtonLink";
import { Input } from "@/components/Input";
import { createClient } from "@/lib/supabase/client";
import styles from "@/components/AuthForm.module.css";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm() {
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function sendLink(email: string) {
    setLoading(true);
    setFormError("");

    // The link in the email opens /auth/confirm, which then shows the "new password" page
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/confirm?next=/reset-password`,
    });
    setLoading(false);

    if (error) {
      setFormError(
        error.code === "over_email_send_rate_limit"
          ? "Please wait a minute before asking for another email."
          : "We couldn’t send the email right now. Please try again in a moment.",
      );
      return false;
    }

    // Same message whether or not the email has an account, so nobody can check who is registered
    setSentTo(email);
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();

    if (!email) return setEmailError("Enter your email.");
    if (!emailPattern.test(email)) return setEmailError("Enter a valid email address.");
    setEmailError("");

    await sendLink(email);
  }

  if (sentTo) {
    return (
      <div className={styles.form}>
        <p className={styles.notice} role="status">
          <strong className={styles.noticeTitle}>Check your email</strong>
          If an account exists for {sentTo}, we’ve sent a link to reset your password. The link
          works for 1 hour.
        </p>

        {formError ? (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        ) : null}

        <p className={styles.signUp}>
          <button
            type="button"
            className={styles.linkButton}
            disabled={loading}
            onClick={() => sendLink(sentTo)}
          >
            {loading ? "Sending…" : "Send the link again"}
          </button>
          <Link href="/sign-in" className={styles.textLink}>
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.fields}>
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          error={emailError}
        />
      </div>

      {formError ? (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      ) : null}

      <Button type="submit" fullWidth disabled={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </Button>

      <ButtonLink href="/sign-up" variant="secondary" fullWidth>
        Sign up
      </ButtonLink>
    </form>
  );
}
