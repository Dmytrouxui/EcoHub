import type { SupabaseClient } from "@supabase/supabase-js";

export type Author = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  location?: string | null;
};

export type Post = {
  id: string;
  author_id: string;
  title: string | null;
  body: string;
  image_urls: string[];
  tags: string[];
  created_at: string;
  author: Author | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
};

export type CommentItem = {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
  author: Author | null;
  likeCount: number;
  likedByMe: boolean;
};

export const PAGE_SIZE = 10;

/** The name shown next to a post or comment */
export function authorName(author: Author | null | undefined) {
  if (!author) return "EcoHub member";
  return (
    author.display_name ||
    [author.first_name, author.last_name].filter(Boolean).join(" ") ||
    "EcoHub member"
  );
}

/** Pulls #hashtags out of a post text. They become the post's tags. */
export function extractTags(text: string): string[] {
  const found = text.match(/#[\p{L}\p{N}_]{2,30}/gu) ?? [];
  const tags = found.map((t) => t.slice(1).toLowerCase());
  return [...new Set(tags)].slice(0, 8);
}

const postSelect =
  "id, author_id, title, body, image_urls, tags, created_at, " +
  "author:profiles!posts_author_id_fkey(first_name, last_name, display_name, avatar_url, location), " +
  "likes:post_likes(count), comments:comments(count)";

type RawPost = Omit<Post, "likeCount" | "commentCount" | "likedByMe" | "savedByMe"> & {
  likes: { count: number }[];
  comments: { count: number }[];
};

async function withMyReactions(supabase: SupabaseClient, userId: string, rows: RawPost[]): Promise<Post[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [likes, saves] = await Promise.all([
    supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", ids),
    supabase.from("post_saves").select("post_id").eq("user_id", userId).in("post_id", ids),
  ]);
  const liked = new Set((likes.data ?? []).map((r: { post_id: string }) => r.post_id));
  const saved = new Set((saves.data ?? []).map((r: { post_id: string }) => r.post_id));

  return rows.map((row) => ({
    id: row.id,
    author_id: row.author_id,
    title: row.title,
    body: row.body,
    image_urls: row.image_urls ?? [],
    tags: row.tags ?? [],
    created_at: row.created_at,
    author: row.author,
    likeCount: row.likes?.[0]?.count ?? 0,
    commentCount: row.comments?.[0]?.count ?? 0,
    likedByMe: liked.has(row.id),
    savedByMe: saved.has(row.id),
  }));
}

/** Newest posts first. Pass `before` (a created_at value) to get the next page. */
export async function fetchPosts(
  supabase: SupabaseClient,
  userId: string,
  options: { before?: string; tag?: string; limit?: number } = {},
): Promise<Post[]> {
  let query = supabase
    .from("posts")
    .select(postSelect)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? PAGE_SIZE);
  if (options.before) query = query.lt("created_at", options.before);
  if (options.tag) query = query.contains("tags", [options.tag]);

  const { data } = await query;
  return withMyReactions(supabase, userId, (data ?? []) as unknown as RawPost[]);
}

export async function fetchPostById(supabase: SupabaseClient, userId: string, id: string): Promise<Post | null> {
  const { data } = await supabase.from("posts").select(postSelect).eq("id", id).maybeSingle();
  if (!data) return null;
  const [post] = await withMyReactions(supabase, userId, [data as unknown as RawPost]);
  return post ?? null;
}

/** The most used tags in recent posts */
export async function fetchPopularTags(supabase: SupabaseClient, limit = 10): Promise<string[]> {
  const { data } = await supabase.from("posts").select("tags").order("created_at", { ascending: false }).limit(200);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { tags: string[] }[]) {
    for (const tag of row.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([tag]) => tag);
}

export async function fetchComments(supabase: SupabaseClient, userId: string, postId: string): Promise<CommentItem[]> {
  const { data } = await supabase
    .from("comments")
    .select(
      "id, post_id, parent_id, author_id, body, created_at, " +
        "author:profiles!comments_author_id_fkey(first_name, last_name, display_name, avatar_url), " +
        "likes:comment_likes(count)",
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as (Omit<CommentItem, "likeCount" | "likedByMe"> & { likes: { count: number }[] })[];
  if (rows.length === 0) return [];

  const mine = await supabase
    .from("comment_likes")
    .select("comment_id")
    .eq("user_id", userId)
    .in("comment_id", rows.map((r) => r.id));
  const liked = new Set((mine.data ?? []).map((r: { comment_id: string }) => r.comment_id));

  return rows.map((row) => ({
    id: row.id,
    post_id: row.post_id,
    parent_id: row.parent_id,
    author_id: row.author_id,
    body: row.body,
    created_at: row.created_at,
    author: row.author,
    likeCount: row.likes?.[0]?.count ?? 0,
    likedByMe: liked.has(row.id),
  }));
}

/** "just now", "5 minutes ago", "12 hours ago", "3 days ago", or a date */
export function timeAgo(iso: string, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
