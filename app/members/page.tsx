import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { MembersApp } from "./MembersApp";
import styles from "./members.module.css";

export const metadata: Metadata = {
  title: "Members",
};

async function MembersContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  return <MembersApp myId={user.id} />;
}

export default function MembersPage() {
  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Members</h1>
      <p className={styles.lead}>Find people to connect with. Search by name, place or interest, and say hello.</p>
      <Suspense fallback={<p className={styles.note}>Loading members…</p>}>
        <MembersContent />
      </Suspense>
    </div>
  );
}
