"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { PostCard } from "@/components/feed/PostCard";
import { PostComposer } from "@/components/feed/PostComposer";
import styles from "@/components/feed/feed.module.css";
import { fetchPosts, PAGE_SIZE } from "@/lib/posts";
import type { Post } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import pageStyles from "./feed.module.css";

type FeedViewProps = {
  me: { id: string; avatarUrl: string | null };
  initialPosts: Post[];
  initialHasMore: boolean;
  tag?: string;
};

// The middle column: post box, then everyone's posts, newest first
export function FeedView({ me, initialPosts, initialHasMore, tag }: FeedViewProps) {
  const router = useRouter(); // refreshes the points bar after changes
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    const last = posts[posts.length - 1];
    if (!last) return;
    setLoading(true);
    const more = await fetchPosts(createClient(), me.id, { before: last.created_at, tag });
    setPosts((current) => [...current, ...more.filter((p) => !current.some((c) => c.id === p.id))]);
    setHasMore(more.length === PAGE_SIZE);
    setLoading(false);
  }

  return (
    <div className={pageStyles.feed}>
      <PostComposer me={me} onCreated={(post) => {
          setPosts((current) => [post, ...current]);
          router.refresh();
        }} />

      {tag ? (
        <div className={styles.filterBar}>
          <p>
            Showing posts tagged <strong>#{tag}</strong>
          </p>
          <Link href="/feed">Show all posts</Link>
        </div>
      ) : null}

      {posts.length === 0 ? (
        <div className={`${styles.card} ${styles.empty}`}>
          <p>
            <strong>{tag ? `No posts tagged #${tag} yet.` : "No posts yet."}</strong>
          </p>
          <p className={styles.muted}>{tag ? "Be the first to post about it." : "Be the first to share something with the community."}</p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} me={me} onDeleted={(id) => {
              setPosts((current) => current.filter((p) => p.id !== id));
              router.refresh();
            }} />)
      )}

      {hasMore ? (
        <div className={styles.loadMore}>
          <Button type="button" variant="secondary" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more posts"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
