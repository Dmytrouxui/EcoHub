"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authorName, timeAgo } from "@/lib/posts";
import type { Post } from "@/lib/posts";
import { Avatar } from "./Avatar";
import { Comments } from "./Comments";
import styles from "./feed.module.css";

type PostCardProps = {
  post: Post;
  me: { id: string; avatarUrl: string | null };
  onDeleted: (id: string) => void;
};

// The post text, with #hashtags turned into links that filter the feed
function PostText({ text }: { text: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_]{2,30})/gu);
  return (
    <p className={styles.postBody}>
      {parts.map((part, i) =>
        part.startsWith("#") && part.length > 2 ? (
          <Link key={i} href={`/feed?tag=${encodeURIComponent(part.slice(1).toLowerCase())}`} className={styles.hashtag}>
            {part}
          </Link>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </p>
  );
}

export function PostCard({ post, me, onDeleted }: PostCardProps) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.savedByMe);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const isMine = post.author_id === me.id;

  function flash(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(""), 2500);
  }

  async function toggleLike() {
    const supabase = createClient();
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const { error } = next
      ? await supabase.from("post_likes").insert({ post_id: post.id, user_id: me.id })
      : await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", me.id);
    if (error) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  async function toggleSave() {
    const supabase = createClient();
    const next = !saved;
    setSaved(next);
    const { error } = next
      ? await supabase.from("post_saves").insert({ post_id: post.id, user_id: me.id })
      : await supabase.from("post_saves").delete().eq("post_id", post.id).eq("user_id", me.id);
    if (error) setSaved(!next);
    else flash(next ? "Saved" : "Removed from saved");
  }

  async function share() {
    const url = `${location.origin}/feed?post=${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied");
    } catch {
      flash("Couldn’t copy the link");
    }
  }

  async function deletePost() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      setBusy(false);
      setConfirming(false);
      flash("Couldn’t delete the post");
      return;
    }
    // Tidy up the pictures too
    const paths = post.image_urls.map((u) => u.split("/post-images/")[1]).filter(Boolean);
    if (paths.length) await supabase.storage.from("post-images").remove(paths);
    onDeleted(post.id);
  }

  const name = authorName(post.author);

  return (
    <article className={styles.card} id={`post-${post.id}`}>
      <header className={styles.postHead}>
        <Avatar url={post.author?.avatar_url} size={40} />
        <div className={styles.postMeta}>
          <p className={styles.postAuthor}>{name}</p>
          <p className={styles.postSub}>
            {post.author?.location ? (
              <span className={styles.location}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                {post.author.location}
              </span>
            ) : null}
            <time dateTime={post.created_at} suppressHydrationWarning>
              {timeAgo(post.created_at)}
            </time>
          </p>
        </div>

        <div className={styles.postTools}>
          <button
            type="button"
            className={`${styles.iconButton} ${saved ? styles.iconButtonOn : ""}`}
            onClick={toggleSave}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save post"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
              <path d="M6.5 3.500h11v17L12 16.5l-5.5 4v-17Z" />
            </svg>
          </button>

          {isMine ? (
            <div className={styles.menuWrap}>
              <button type="button" className={styles.iconButton} onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-label="Post options">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="5" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="12" cy="19" r="1.6" />
                </svg>
              </button>
              {menuOpen ? (
                <div className={styles.menu}>
                  <button
                    type="button"
                    className={styles.menuItem}
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirming(true);
                    }}
                  >
                    Delete post
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {confirming ? (
        <div className={styles.confirm} role="alert">
          <p>Delete this post? This can’t be undone.</p>
          <div className={styles.confirmButtons}>
            <button type="button" className={styles.danger} onClick={deletePost} disabled={busy}>
              {busy ? "Deleting…" : "Delete"}
            </button>
            <button type="button" className={styles.linkButton} onClick={() => setConfirming(false)} disabled={busy}>
              <span>Cancel</span>
            </button>
          </div>
        </div>
      ) : null}

      {post.title ? <h3 className={styles.postTitle}>{post.title}</h3> : null}
      <PostText text={post.body} />

      {post.image_urls.length > 0 ? (
        <div className={`${styles.images} ${styles[`images${Math.min(post.image_urls.length, 4)}`]}`}>
          {post.image_urls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt={`Picture ${i + 1} in the post${post.title ? ` “${post.title}”` : ""}`} loading="lazy" className={styles.image} />
          ))}
        </div>
      ) : null}

      <div className={styles.actions}>
        <button type="button" className={`${styles.action} ${liked ? styles.actionOn : ""}`} onClick={toggleLike} aria-pressed={liked}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 11v9H4v-9h3Zm0 0 4-7a2 2 0 0 1 2 2v3h5.5a2 2 0 0 1 2 2.3l-1.2 6.5a2 2 0 0 1-2 1.700H7" />
          </svg>
          <span>{likeCount} {likeCount === 1 ? "like" : "likes"}</span>
        </button>
        <button type="button" className={styles.action} onClick={() => setShowComments((v) => !v)} aria-expanded={showComments}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
          </svg>
          <span>{commentCount} {commentCount === 1 ? "comment" : "comments"}</span>
        </button>
        <button type="button" className={styles.action} onClick={share}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 15V4m0 0L8 8m4-4 4 4M5 13v6h14v-6" />
          </svg>
          <span>Share</span>
        </button>
        <span className={styles.notice} role="status">
          {notice}
        </span>
      </div>

      {showComments ? <Comments postId={post.id} me={me} onCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))} /> : null}
    </article>
  );
}
