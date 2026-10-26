"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/feed/Avatar";
import { authorName } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import styles from "./members.module.css";

const PAGE = 12;

type Member = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  tags: string[] | null;
  bio: string | null;
};

const columns = "id, first_name, last_name, display_name, avatar_url, location, tags, bio";

export function MembersApp({ myId }: { myId: string }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  function buildRequest(from: number) {
    // Keep the characters PostgREST uses for its own syntax out of the search
    const q = query.trim().replace(/[,()%*\\]/g, " ").trim();
    let request = createClient().from("profiles").select(columns).neq("id", myId).order("created_at", { ascending: false }).range(from, from + PAGE - 1);
    if (q) request = request.or(`display_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,location.ilike.%${q}%`);
    if (tag) request = request.contains("tags", [tag]);
    return request;
  }

  // New search or tag: start again from the newest members
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await buildRequest(0);
      if (cancelled) return;
      setFailed(Boolean(error));
      setMembers((data ?? []) as Member[]);
      setHasMore((data ?? []).length === PAGE);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tag, myId]);

  async function loadMore() {
    if (!members) return;
    setLoadingMore(true);
    const { data, error } = await buildRequest(members.length);
    setLoadingMore(false);
    if (error) return setFailed(true);
    const more = (data ?? []) as Member[];
    setMembers((current) => [...(current ?? []), ...more.filter((m) => !current?.some((c) => c.id === m.id))]);
    setHasMore(more.length === PAGE);
  }

  return (
    <>
      <div className={styles.tools}>
        <label htmlFor="member-filter" className="sr-only">
          Search members by name or place
        </label>
        <input
          id="member-filter"
          type="search"
          className={styles.search}
          placeholder="Search by name or place"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {tag ? (
          <p className={styles.activeTag}>
            Interest: <strong>{tag}</strong>
            <button type="button" onClick={() => setTag(null)} aria-label={`Remove the ${tag} filter`}>
              ×
            </button>
          </p>
        ) : null}
      </div>

      {failed ? (
        <p className={styles.note} role="alert">
          We couldn’t load the members. Please try again.
        </p>
      ) : members === null ? (
        <p className={styles.note}>Loading members…</p>
      ) : members.length === 0 ? (
        <div className={styles.note}>
          <p>
            <strong>{query || tag ? "No members match your search." : "No other members yet."}</strong>
          </p>
          <p>{query || tag ? "Try a different name, place or interest." : "When more people join EcoHub, you’ll find them here."}</p>
        </div>
      ) : (
        <ul className={styles.grid}>
          {members.map((m) => (
            <li key={m.id} className={styles.card}>
              <div className={styles.top}>
                <Avatar url={m.avatar_url} size={56} />
                <div className={styles.who}>
                  <p className={styles.name}>{authorName(m)}</p>
                  {m.location ? <p className={styles.place}>{m.location}</p> : null}
                </div>
              </div>
              {m.bio ? <p className={styles.bio}>{m.bio}</p> : null}
              {m.tags?.length ? (
                <ul className={styles.tags} aria-label="Interests">
                  {m.tags.slice(0, 4).map((t) => (
                    <li key={t}>
                      <button type="button" className={`${styles.tag} ${t === tag ? styles.tagActive : ""}`} onClick={() => setTag(t === tag ? null : t)} aria-pressed={t === tag}>
                        {t}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Link href={`/messages?with=${m.id}`} className={styles.message} aria-label={`Message ${authorName(m)}`}>
                Message
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <div className={styles.more}>
          <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Show more members"}
          </Button>
        </div>
      ) : null}
    </>
  );
}
