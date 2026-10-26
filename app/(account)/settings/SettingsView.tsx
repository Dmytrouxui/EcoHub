"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { createClient } from "@/lib/supabase/client";
import styles from "./settings.module.css";

type Prefs = { likes: boolean; comments: boolean; replies: boolean };

const options: { key: keyof Prefs; column: string; label: string; hint: string }[] = [
  { key: "likes", column: "notify_likes", label: "Likes", hint: "Someone likes your post" },
  { key: "comments", column: "notify_comments", label: "Comments", hint: "Someone comments on your post" },
  { key: "replies", column: "notify_replies", label: "Replies", hint: "Someone replies to your comment" },
];

function NotificationSettings({ userId, initial }: { userId: string; initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [error, setError] = useState("");

  async function toggle(key: keyof Prefs, column: string) {
    const next = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    setError("");
    const { error: updateError } = await createClient().from("profiles").update({ [column]: next }).eq("id", userId);
    if (updateError) {
      setPrefs((p) => ({ ...p, [key]: !next }));
      setError("We couldn’t save that change. Please try again.");
    }
  }

  return (
    <section className={styles.tile} aria-labelledby="notify-title">
      <h2 id="notify-title" className={styles.tileTitle}>
        Notifications
      </h2>
      <p className={styles.hint}>Choose what you want to hear about. Your choices are saved straight away.</p>
      <ul className={styles.switches}>
        {options.map((o) => (
          <li key={o.key}>
            <div>
              <p className={styles.switchLabel}>{o.label}</p>
              <p className={styles.hint}>{o.hint}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[o.key]}
              aria-label={o.label}
              className={`${styles.switch} ${prefs[o.key] ? styles.switchOn : ""}`}
              onClick={() => toggle(o.key, o.column)}
            >
              <span className={styles.knob} />
            </button>
          </li>
        ))}
      </ul>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function PasswordForm() {
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    const nextErrors: { password?: string; confirm?: string } = {};
    if (!password) nextErrors.password = "Enter a new password.";
    else if (password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (!confirm) nextErrors.confirm = "Repeat your new password.";
    else if (password && confirm !== password) nextErrors.confirm = "The passwords don’t match.";

    setErrors(nextErrors);
    setFormError("");
    setSaved(false);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setFormError(
        error.code === "same_password"
          ? "Your new password must be different from the old one."
          : error.code === "weak_password"
            ? "That password is too easy to guess. Please choose a stronger one."
            : "We couldn’t change your password. Please try again.",
      );
      return;
    }
    form.reset();
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      <h3 className={styles.subTitle}>Change password</h3>
      <Input label="New password" name="password" type="password" autoComplete="new-password" error={errors.password} />
      <Input label="Confirm new password" name="confirm" type="password" autoComplete="new-password" error={errors.confirm} />
      {formError ? (
        <p className={styles.error} role="alert">
          {formError}
        </p>
      ) : null}
      {saved ? (
        <p className={styles.success} role="status">
          Your password has been changed.
        </p>
      ) : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}

function DeleteAccount({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    const supabase = createClient();

    // Remove the member's pictures first. Files that are already gone are fine.
    for (const bucket of ["avatars", "post-images"]) {
      const { data: files } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
      if (files?.length) {
        await supabase.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
      }
    }

    const { error: rpcError } = await supabase.rpc("delete_my_account");
    if (rpcError) {
      setBusy(false);
      setError("We couldn’t delete your account. Please try again.");
      return;
    }

    await supabase.auth.signOut();
    router.push("/sign-in?deleted=1");
    router.refresh();
  }

  return (
    <div className={styles.danger}>
      <h3 className={styles.subTitle}>Delete account</h3>
      <p className={styles.hint}>
        This permanently deletes your profile, posts, comments, likes, saved posts and pictures. It can’t be undone.
      </p>
      {!open ? (
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      ) : (
        <div className={styles.confirm}>
          <Input label="Type DELETE to confirm" name="confirm-delete" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <div className={styles.row}>
            <Button type="button" className={styles.dangerButton} onClick={remove} disabled={text !== "DELETE" || busy}>
              {busy ? "Deleting…" : "Permanently delete my account"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); setText(""); setError(""); }} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsView({ userId, initial }: { userId: string; initial: Prefs }) {
  return (
    <div className={styles.stack}>
      <section className={styles.tile} aria-labelledby="profile-title">
        <h2 id="profile-title" className={styles.tileTitle}>
          Profile
        </h2>
        <p className={styles.hint}>Change your name, photo, location, tags and bio.</p>
        <Link href="/profile" className={styles.linkButton}>
          Edit my profile
        </Link>
      </section>

      <NotificationSettings userId={userId} initial={initial} />

      <section id="privacy" className={styles.tile} aria-labelledby="privacy-title">
        <h2 id="privacy-title" className={styles.tileTitle}>
          Privacy &amp; Security
        </h2>
        <PasswordForm />
        <DeleteAccount userId={userId} />
      </section>
    </div>
  );
}
