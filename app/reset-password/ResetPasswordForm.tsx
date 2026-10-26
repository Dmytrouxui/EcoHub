"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { createClient } from "@/lib/supabase/client";
import styles from "@/components/AuthForm.module.css";

type Errors = {
  password?: string;
  confirm?: string;
};

export function ResetPasswordForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    const nextErrors: Errors = {};
    if (!password) nextErrors.password = "Enter a new password.";
    else if (password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (!confirm) nextErrors.confirm = "Repeat your new password.";
    else if (password && confirm !== password) nextErrors.confirm = "The passwords don’t match.";

    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      setFormError(
        error.code === "same_password"
          ? "Your new password must be different from the old one."
          : error.code === "weak_password"
            ? "That password is too easy to guess. Please choose a stronger one."
            : "We couldn’t save your new password. Please try again, or ask for a new link.",
      );
      return;
    }

    // Sign out so the user logs in with the new password
    await supabase.auth.signOut();
    router.push("/sign-in?reset=success");
    router.refresh();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.fields}>
        <Input
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          error={errors.password}
        />
        <Input
          label="Confirm new password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          error={errors.confirm}
        />
      </div>

      {formError ? (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      ) : null}

      <Button type="submit" fullWidth disabled={loading}>
        {loading ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
