"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { icons } from "./icons";
import styles from "./account.module.css";

// Pages without a href are not built yet: they are shown greyed out with "Soon"
const items = [
  { label: "Feed", icon: icons.feed, href: "/feed" },
  { label: "Members", icon: icons.members, href: "/members" },
  { label: "My Profile", icon: icons.profile, href: "/profile" },
  { label: "Dashboard", icon: icons.dashboard, href: "/dashboard" },
  { label: "Messages", icon: icons.messages, href: "/messages" },
  { label: "Notifications", icon: icons.notifications, event: "open-notifications" },
  { label: "Saved", icon: icons.saved },
  { label: "Settings", icon: icons.settings, href: "/settings" },
  { label: "Privacy & Security", icon: icons.privacy, href: "/settings#privacy" },
];

export function AccountMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <nav aria-label="Account" className={styles.menu}>
      <ul className={styles.menuList}>
        {items.map((item) => {
          const active = item.href === pathname;
          return (
            <li key={item.label}>
              {"event" in item && item.event ? (
                <button type="button" className={styles.menuItem} onClick={() => window.dispatchEvent(new Event(item.event))}>
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className={`${styles.menuItem} ${active ? styles.menuItemActive : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span className={`${styles.menuItem} ${styles.menuItemSoon}`} aria-disabled="true">
                  {item.icon}
                  <span>{item.label}</span>
                  <small className={styles.soon}>Soon</small>
                </span>
              )}
            </li>
          );
        })}
        <li>
          <button type="button" className={styles.menuItem} onClick={signOut} disabled={signingOut}>
            {icons.signOut}
            <span>{signingOut ? "Signing out…" : "Sign out"}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
