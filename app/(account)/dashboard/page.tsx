import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getDashboard } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { DashboardView } from "./DashboardView";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "Dashboard",
};

async function DashboardContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  return <DashboardView {...(await getDashboard(supabase, user.id))} />;
}

export default function DashboardPage() {
  return (
    <section className={styles.card}>
      <h1 className={styles.title}>Dashboard</h1>
      <Suspense fallback={<p className={styles.empty}>Loading your dashboard…</p>}>
        <DashboardContent />
      </Suspense>
    </section>
  );
}
