import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { AccountMenu } from "@/components/account/AccountMenu";
import { EcoRating } from "@/components/account/EcoRating";
import { MiniCalendar } from "@/components/account/MiniCalendar";
import { getEcoScore } from "@/lib/ecoPoints";
import { createClient } from "@/lib/supabase/server";
import styles from "@/components/account/account.module.css";

// Name and photo at the top of the menu
async function UserCard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    profile?.display_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user.email;

  return (
    <div className={styles.userCard}>
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt="" className={styles.avatar} />
      ) : (
        <span className={`${styles.avatar} ${styles.avatarEmpty}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/avatar-placeholder.svg" alt="" />
        </span>
      )}
      <p className={styles.userName}>{name}</p>
    </div>
  );
}

async function Rating() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return <EcoRating score={await getEcoScore(supabase, user.id)} />;
}

// Shared frame for the signed-in pages: menu + eco rating + calendar around the page content
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`container ${styles.shell}`}>
      <aside className={`${styles.card} ${styles.side}`}>
        <Suspense fallback={<div className={styles.userCard} style={{ minHeight: 56 }} />}>
          <UserCard />
        </Suspense>
        <AccountMenu />
        <Suspense fallback={null}>
          <Rating />
        </Suspense>
      </aside>

      <div className={styles.main}>{children}</div>

      <div className={`${styles.card} ${styles.calendarCard}`}>
        <MiniCalendar />
      </div>
    </div>
  );
}
