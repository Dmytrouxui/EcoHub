"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { authorName, fetchComments, timeAgo } from "@/lib/posts";
import type { CommentItem } from "@/lib/posts";
import { Avatar } from "./Avatar";
import styles from "./feed.module.css";

type CommentsProps = {
  postId: string;
  me: { id: string; avatarUrl: string | null };
  onCountChange: (delta: number) => void;
};

// Comments under a post. Replies go one level deep.
export function Comments({ postId, me, onCountChange }: CommentsProps) {
  const router = useRouter(); // refreshes the points bar after changes
  const [items, setItems] = useState<CommentItem[] | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ commentId: string; topId: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchComments(createClient(), me.id, postId).then((rows) => {
      if (!cancelled) setItems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [postId, me.id]);

  async function add(body: string, parentId: string | null) {
    const clean = body.trim();
    if (!clean || busy) return false;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("comments")
      .insert({ post_id: postId, author_id: me.id, parent_id: parentId, body: clean });
    if (insertError) {
      setBusy(false);
      setError("We couldn’t post your comment. Please try again.");
      return false;
    }
    const rows = await fetchComments(supabase, me.id, postId);
    setItems(rows);
    onCountChange(1);
    router.refresh();
    setBusy(false);
    return true;
  }

  async function submitTop(event: FormEvent) {
    event.preventDefault();
    if (await add(text, null)) setText("");
  }

  async function submitReply(event: FormEvent) {
    event.preventDefault();
    if (!replyTo) return;
    if (await add(replyText, replyTo.topId)) {
      setReplyTo(null);
      setReplyText("");
    }
  }

  async function toggleLike(comment: CommentItem) {
    const supabase = createClient();
    const next = !comment.likedByMe;
    const update = (liked: boolean, delta: number) =>
      setItems((list) => list?.map((c) => (c.id === comment.id ? { ...c, likedByMe: liked, likeCount: c.likeCount + delta } : c)) ?? null);
    update(next, next ? 1 : -1);
    const { error: likeError } = next
      ? await supabase.from("comment_likes").insert({ comment_id: comment.id, user_id: me.id })
      : await supabase.from("comment_likes").delete().eq("comment_id", comment.id).eq("user_id", me.id);
    if (likeError) update(!next, next ? -1 : 1);
  }

  async function remove(comment: CommentItem) {
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("comments").delete().eq("id", comment.id);
    if (deleteError) return setError("We couldn’t delete the comment.");
    const rows = await fetchComments(supabase, me.id, postId);
    // Deleting a comment also removes its replies
    const removed = (items?.length ?? 0) - rows.length;
    setItems(rows);
    onCountChange(-Math.max(removed, 1));
    router.refresh();
  }

  const top = (items ?? []).filter((c) => !c.parent_id);
  const repliesOf = (id: string) => (items ?? []).filter((c) => c.parent_id === id);

  function renderComment(comment: CommentItem, topId: string, isReply: boolean) {
    const name = authorName(comment.author);
    return (
      <li key={comment.id} className={isReply ? styles.reply : styles.comment}>
        <Avatar url={comment.author?.avatar_url} size={isReply ? 28 : 32} />
        <div className={styles.commentMain}>
          <p className={styles.commentHead}>
            <strong>{name}</strong>
            <time dateTime={comment.created_at} suppressHydrationWarning>
              {timeAgo(comment.created_at)}
            </time>
          </p>
          <p className={styles.commentBody}>{comment.body}</p>
          <div className={styles.commentActions}>
            <button type="button" className={`${styles.smallAction} ${comment.likedByMe ? styles.actionOn : ""}`} onClick={() => toggleLike(comment)} aria-pressed={comment.likedByMe}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={comment.likedByMe ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 11v9H4v-9h3Zm0 0 4-7a2 2 0 0 1 2 2v3h5.5a2 2 0 0 1 2 2.3l-1.2 6.5a2 2 0 0 1-2 1.7H7" />
              </svg>
              <span>{comment.likeCount}</span>
            </button>
            <button
              type="button"
              className={styles.smallAction}
              onClick={() => {
                setReplyTo({ commentId: comment.id, topId });
                setReplyText(isReply ? `@${name} ` : "");
              }}
            >
              Reply
            </button>
            {comment.author_id === me.id ? (
              <button type="button" className={styles.smallAction} onClick={() => remove(comment)}>
                Delete
              </button>
            ) : null}
          </div>

          {replyTo?.commentId === comment.id ? (
            <form className={styles.replyForm} onSubmit={submitReply}>
              <label htmlFor={`reply-${comment.id}`} className="sr-only">
                Reply to {name}
              </label>
              <input
                id={`reply-${comment.id}`}
                className={styles.commentInput}
                value={replyText}
                maxLength={1000}
                autoFocus
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply…"
              />
              <button type="submit" className={styles.sendButton} disabled={busy || !replyText.trim()}>
                Reply
              </button>
              <button type="button" className={styles.smallAction} onClick={() => setReplyTo(null)}>
                Cancel
              </button>
            </form>
          ) : null}
        </div>
      </li>
    );
  }

  return (
    <section className={styles.comments} aria-label="Comments">
      <form className={styles.commentForm} onSubmit={submitTop}>
        <Avatar url={me.avatarUrl} size={32} />
        <label htmlFor={`comment-${postId}`} className="sr-only">
          Write a comment
        </label>
        <input
          id={`comment-${postId}`}
          className={styles.commentInput}
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          placeholder="What’s on your mind?"
        />
        <button type="submit" className={styles.sendButton} disabled={busy || !text.trim()}>
          Send
        </button>
      </form>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {items === null ? (
        <p className={styles.muted}>Loading comments…</p>
      ) : top.length === 0 ? (
        <p className={styles.muted}>No comments yet. Be the first to comment.</p>
      ) : (
        <>
          <p className={styles.commentsTitle}>All comments</p>
          <ul className={styles.commentList}>
            {top.map((comment) => (
              <Fragment key={comment.id}>
                {renderComment(comment, comment.id, false)}
                {repliesOf(comment.id).length > 0 ? (
                  <li className={styles.replyWrap}>
                    <ul className={styles.replyList}>{repliesOf(comment.id).map((r) => renderComment(r, comment.id, true))}</ul>
                  </li>
                ) : null}
              </Fragment>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

