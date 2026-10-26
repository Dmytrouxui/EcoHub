import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { MessagesApp } from "./MessagesApp";
import styles from "./messages.module.css";

export const metadata: Metadata = {
  title: "Messages",
};

async function MessagesContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Suspense: the app reads the URL (?c=conversation, ?with=member) in the browser
  return (
    <Suspense fallback={<p className={styles.loading}>Loading your messages…</p>}>
      <MessagesApp myId={user.id} />
    </Suspense>
  );
}

export default function MessagesPage() {
  return (
    <div className={`container ${styles.page}`}>
      <Suspense fallback={<p className={styles.loading}>Loading your messages…</p>}>
        <MessagesContent />
      </Suspense>
    </div>
  );
}
