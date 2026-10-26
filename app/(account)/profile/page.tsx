import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";
import styles from "./profile.module.css";

export const metadata: Metadata = {
  title: "My Profile",
};

async function ProfileContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, display_name, location, tags, bio, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <ProfileForm
      userId={user.id}
      email={user.email ?? ""}
      initial={{
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        displayName: profile?.display_name ?? "",
        location: profile?.location ?? "",
        tags: profile?.tags ?? [],
        bio: profile?.bio ?? "",
        avatarUrl: profile?.avatar_url ?? null,
      }}
    />
  );
}

export default function ProfilePage() {
  return (
    <section className={styles.card}>
      <h1 className={styles.title}>Let’s create your Profile!</h1>
      <Suspense fallback={<p className={styles.loading}>Loading your profile…</p>}>
        <ProfileContent />
      </Suspense>
    </section>
  );
}
