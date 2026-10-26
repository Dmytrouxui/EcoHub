import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SettingsView } from "./SettingsView";
import styles from "./settings.module.css";

export const metadata: Metadata = {
  title: "Settings",
};

async function SettingsContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("notify_likes, notify_comments, notify_replies")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <SettingsView
      userId={user.id}
      initial={{
        likes: profile?.notify_likes ?? true,
        comments: profile?.notify_comments ?? true,
        replies: profile?.notify_replies ?? true,
      }}
    />
  );
}

export default function SettingsPage() {
  return (
    <section className={styles.card}>
      <h1 className={styles.title}>Settings</h1>
      <Suspense fallback={<p className={styles.hint}>Loading your settings…</p>}>
        <SettingsContent />
      </Suspense>
    </section>
  );
}
