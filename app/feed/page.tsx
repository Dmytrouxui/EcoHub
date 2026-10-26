import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EcoRating } from "@/components/account/EcoRating";
import { MiniCalendar } from "@/components/account/MiniCalendar";
import { Avatar } from "@/components/feed/Avatar";
import { CreatePostButton } from "@/components/feed/CreatePostButton";
import cards from "@/components/feed/feed.module.css";
import { getEcoScore } from "@/lib/ecoPoints";
import { authorName, fetchPopularTags, fetchPostById, fetchPosts, PAGE_SIZE } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";
import { FeedView } from "./FeedView";
import styles from "./feed.module.css";

export const metadata: Metadata = {
  title: "Feed",
};

type SearchParams = Promise<{ tag?: string; post?: string }>;

async function FeedContent({ searchParams }: { searchParams: SearchParams }) {
  const { tag: rawTag, post: postId } = await searchParams;
  const tag = rawTag?.toLowerCase().slice(0, 30);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [profileResult, posts, popularTags, membersResult, sharedPost, ecoScore] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    fetchPosts(supabase, user.id, { tag }),
    fetchPopularTags(supabase),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, display_name, avatar_url, location")
      .neq("id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    postId && !tag ? fetchPostById(supabase, user.id, postId) : Promise.resolve(null),
    getEcoScore(supabase, user.id),
  ]);

  const profile = profileResult.data;
  const myName = profile ? authorName(profile) : (user.email ?? "You");
  const members = membersResult.data ?? [];
  const initialPosts = sharedPost ? [sharedPost, ...posts.filter((p) => p.id !== sharedPost.id)] : posts;

  return (
    <div className={`container ${styles.shell}`}>
      <div className={styles.leftStack}>
        <section className={`${cards.card} ${cards.profileCard} ${styles.profile}`} aria-label="Your profile">
          <Link href="/profile" className={cards.editLink} aria-label="Edit your profile">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16v4Zm9.5-13.5 4 4" />
            </svg>
          </Link>
          <Link href="/profile" aria-label="Go to your profile">
            <span className={cards.avatar} style={{ width: 120, height: 120 }}>
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className={cards.avatarImage} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/icons/avatar-placeholder.svg" alt="" className={cards.avatarEmpty} />
              )}
            </span>
          </Link>
          <p className={cards.profileName}>{myName}</p>
          <CreatePostButton />
          <EcoRating score={ecoScore} />
        </section>

        <section className={`${cards.card} ${styles.calendar}`} aria-label="Calendar">
          <MiniCalendar />
        </section>
      </div>

      <FeedView
        key={tag ?? "all"}
        me={{ id: user.id, avatarUrl: profile?.avatar_url ?? null }}
        initialPosts={initialPosts}
        initialHasMore={posts.length === PAGE_SIZE}
        tag={tag}
      />

      <div className={styles.rightStack}>
        <section className={`${cards.card} ${styles.members}`} aria-label="New members">
          <h2 className={cards.sideTitle}>New members</h2>
          {members.length === 0 ? (
            <p className={cards.muted}>You’re the first one here. Invite a friend to join EcoHub!</p>
          ) : (
            <ul className={cards.memberList}>
              {members.map((m) => (
                <li key={m.id} className={cards.member}>
                  <Avatar url={m.avatar_url} size={40} />
                  <div className={cards.memberText}>
                    <p className={cards.memberName}>{authorName(m)}</p>
                    {m.location ? <p className={cards.memberSub}>{m.location}</p> : null}
                  </div>
                  <Link href={`/messages?with=${m.id}`} className={cards.memberMessage} aria-label={`Message ${authorName(m)}`}>
                    Message
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/members" className={cards.seeAll}>
            Find more members
          </Link>
        </section>

        <section className={`${cards.card} ${styles.tags}`} aria-label="Popular tags">
          <h2 className={cards.sideTitle}>Tags</h2>
          {popularTags.length === 0 ? (
            <p className={cards.muted}>Add #tags to your posts and they will show up here.</p>
          ) : (
            <ul className={cards.tagList}>
              {popularTags.map((t) => (
                <li key={t}>
                  <Link href={t === tag ? "/feed" : `/feed?tag=${encodeURIComponent(t)}`} className={`${cards.tag} ${t === tag ? cards.tagActive : ""}`} aria-current={t === tag ? "true" : undefined}>
                    #{t}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default function FeedPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "48px 0" }}><p>Loading your feed…</p></div>}>
      <FeedContent searchParams={searchParams} />
    </Suspense>
  );
}
