"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { AvatarPicker } from "@/components/AvatarPicker";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { createClient } from "@/lib/supabase/client";
import styles from "@/components/AuthForm.module.css";

type Errors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function SignUpView() {
  const router = useRouter();
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    const nextErrors: Errors = {};
    if (!firstName) nextErrors.firstName = "Enter your first name.";
    if (!lastName) nextErrors.lastName = "Enter your last name.";
    if (!email) nextErrors.email = "Enter your email.";
    else if (!emailPattern.test(email)) nextErrors.email = "Enter a valid email address.";
    if (!password) nextErrors.password = "Enter a password.";
    else if (password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (!confirm) nextErrors.confirm = "Repeat your password.";
    else if (password && confirm !== password) nextErrors.confirm = "The passwords don’t match.";

    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    const supabase = createClient();

    // 1. Create the account. The name goes along so the database can create the profile.
    const { data: result, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });

    if (error || !result.user) {
      setLoading(false);
      setFormError(
        error?.code === "user_already_exists"
          ? "An account with this email already exists. Try signing in instead."
          : error?.code === "weak_password"
            ? "That password is too easy to guess. Please choose a stronger one."
            : error?.code === "over_request_rate_limit" || error?.code === "over_email_send_rate_limit"
              ? "Too many attempts. Please wait a minute and try again."
              : "We couldn’t create your account right now. Please try again in a moment.",
      );
      return;
    }

    // Email confirmation is switched on: the user has to confirm before they are signed in
    if (!result.session) {
      setLoading(false);
      setFormError("Almost done! Check your email and confirm your address to finish signing up.");
      return;
    }

    // 2. Save the profile picture (optional). The account exists either way.
    if (photo) {
      const path = `${result.user.id}/avatar-${Date.now()}.${extensions[photo.type]}`;
      const upload = await supabase.storage.from("avatars").upload(path, photo, {
        contentType: photo.type,
      });
      if (!upload.error) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", result.user.id);
      }
    }

    router.push("/feed");
    router.refresh();
  }

  return (
    <AuthLayout
      title="Welcome to EcoHub!"
      subtitle="To get started, please fill out the form below to create your account"
      aside={<AvatarPicker photo={photo} onChange={setPhoto} />}
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.fields}>
          <Input
            label="First name"
            name="firstName"
            autoComplete="given-name"
            error={errors.firstName}
          />
          <Input
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            error={errors.lastName}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            error={errors.email}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            error={errors.password}
          />
          <Input
            label="Confirm password"
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
          {loading ? "Creating account…" : "Sign up"}
        </Button>

        <p className={styles.signUp}>
          <span>Already have an account?</span>{" "}
          <Link href="/sign-in" className={styles.textLink}>
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
