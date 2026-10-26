"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/feed/Avatar";
import { fetchNotifications, markNotificationsSeen, notificationText } from "@/lib/notifications";
import type { NotificationItem } from "@/lib/notifications";
import { timeAgo } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import { HeaderPopover } from "./HeaderPopover";
import styles from "./HeaderPopover.module.css";

const REFRESH_MS = 60_000;

// The bell in the header: a panel with likes, comments and replies, and a count of new ones
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [seenAt, setSeenAt] = useState(0);
  const [highlightFrom, setHighlightFrom] = useState(0);
  const userId = useRef<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!userId.current) {
      const { data } = await supabase.auth.getUser();
      userId.current = data.user?.id ?? null;
    }
    if (!userId.current) return null;
    const result = await fetchNotifications(supabase, userId.current);
    if (!result) {
      setFailed(true);
      return null;
    }
    setFailed(false);
    setItems(result.items);
    setSeenAt(result.seenAt);
    return result;
  }, []);

  // Check now, then once a minute while the tab is visible
  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const handleOpenChange = useCallback(
    async (next: boolean) => {
      setOpen(next);
      if (!next) return;
      const result = await load();
      if (!result || !userId.current) return;
      // Keep the new ones highlighted while the panel is open, then count them as seen
      setHighlightFrom(result.seenAt);
      if (result.items.some((i) => new Date(i.created_at).getTime() > result.seenAt)) {
        setSeenAt(Date.now());
        await markNotificationsSeen(createClient(), userId.current);
      }
    },
    [load],
  );

  // The "Notifications" item in the account menu opens this panel
  useEffect(() => {
    const onOpen = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      handleOpenChange(true);
    };
    window.addEventListener("open-notifications", onOpen);
    return () => window.removeEventListener("open-notifications", onOpen);
  }, [handleOpenChange]);

  const unread = items ? items.filter((i) => new Date(i.created_at).getTime() > seenAt).length : 0;

  return (
    <HeaderPopover
      label="Notifications"
      title="Notifications"
      open={open}
      onOpenChange={handleOpenChange}
      badge={unread}
      icon={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
          <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
        </svg>
      }
    >
      {failed ? (
        <p className={styles.message}>We couldn’t load your notifications. Please try again in a moment.</p>
      ) : items === null ? (
        <p className={styles.message}>Loading…</p>
      ) : items.length === 0 ? (
        <p className={styles.message}>No notifications yet. Likes, comments and replies on your posts will show up here.</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => {
            const isNew = new Date(item.created_at).getTime() > highlightFrom;
            return (
              <li key={`${item.kind}-${item.actor_id}-${item.created_at}`}>
                <Link href={`/feed?post=${item.post_id}`} className={`${styles.item} ${isNew ? styles.itemNew : ""}`} onClick={() => setOpen(false)}>
                  <Avatar url={item.actor_avatar} size={36} />
                  <span className={styles.itemText}>
                    <strong>{item.actor_name}</strong> {notificationText[item.kind]}
                    {item.snippet ? <span className={styles.itemSnippet}>“{item.snippet}”</span> : null}
                    <span className={styles.itemTime}>{timeAgo(item.created_at)}</span>
                  </span>
                  {isNew ? <span className={styles.newDot} aria-label="New" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </HeaderPopover>
  );
}
