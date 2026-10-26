"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./HeaderPopover.module.css";

const REFRESH_MS = 20_000;

// The messages icon in the header: goes to the Messages page and shows the unread count
export function MessagesLink() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await createClient().rpc("unread_messages_count");
      if (!cancelled && !error) setUnread(Number(data) || 0);
    }
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_MS);
    window.addEventListener("messages-updated", load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("messages-updated", load);
    };
  }, []);

  return (
    <Link href="/messages" className={styles.button} aria-label={unread > 0 ? `Messages, ${unread} unread` : "Messages"}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z" />
      </svg>
      {unread > 0 ? <span className={styles.badge}>{unread > 9 ? "9+" : unread}</span> : null}
    </Link>
  );
}
