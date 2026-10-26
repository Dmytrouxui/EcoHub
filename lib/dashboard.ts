import type { SupabaseClient } from "@supabase/supabase-js";
import { getEcoScore, POINTS } from "./ecoPoints";

export const WEEKS = 12;

export type RecentPost = {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
  likes: number;
  comments: number;
};

export type WeekPoints = { label: string; points: number };

/** Monday 00:00 (UTC) of the week a date falls in */
function weekStart(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

/** Everything the dashboard shows, worked out from the member's own activity */
export async function getDashboard(supabase: SupabaseClient, userId: string) {
  const [score, saved, myPosts, myComments, profile] = await Promise.all([
    getEcoScore(supabase, userId),
    supabase.from("post_saves").select("post_id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("posts")
      .select("id, title, body, created_at, likes:post_likes(count), comments:comments(count)")
      .eq("author_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("comments").select("created_at").eq("author_id", userId),
    supabase.from("profiles").select("avatar_url, location, bio, tags").eq("id", userId).maybeSingle(),
  ]);

  const posts = (myPosts.data ?? []) as unknown as {
    id: string;
    title: string | null;
    body: string;
    created_at: string;
    likes: { count: number }[];
    comments: { count: number }[];
  }[];

  const recent: RecentPost[] = posts.slice(0, 5).map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    created_at: p.created_at,
    likes: p.likes?.[0]?.count ?? 0,
    comments: p.comments?.[0]?.count ?? 0,
  }));

  // Points per week for the last WEEKS weeks. Likes are counted when they were given.
  const thisWeek = weekStart(new Date());
  const buckets = Array.from({ length: WEEKS }, (_, i) => {
    const start = new Date(thisWeek);
    start.setUTCDate(start.getUTCDate() - 7 * (WEEKS - 1 - i));
    return { start: start.getTime(), points: 0 };
  });
  const add = (iso: string, points: number) => {
    const t = weekStart(new Date(iso)).getTime();
    const bucket = buckets.find((b) => b.start === t);
    if (bucket) bucket.points += points;
  };

  const likeDates = await supabase
    .from("post_likes")
    .select("created_at")
    .in("post_id", posts.map((p) => p.id).concat("00000000-0000-0000-0000-000000000000"));

  posts.forEach((p) => add(p.created_at, POINTS.post));
  (myComments.data ?? []).forEach((c) => add(c.created_at, POINTS.comment));
  (likeDates.data ?? []).forEach((l) => add(l.created_at, POINTS.like));

  const weeks: WeekPoints[] = buckets.map((b) => ({
    label: new Date(b.start).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
    points: b.points,
  }));

  const p = profile.data;
  const checklist = [
    { label: "Add a profile photo", done: Boolean(p?.avatar_url) },
    { label: "Add your location", done: Boolean(p?.location?.trim()) },
    { label: "Write a short bio", done: Boolean(p?.bio?.trim()) },
    { label: "Pick tags for your interests", done: Boolean(p?.tags?.length) },
  ];

  return {
    score,
    stats: {
      posts: score.breakdown.posts,
      comments: score.breakdown.comments,
      likes: score.breakdown.likes,
      saved: saved.count ?? 0,
    },
    weeks,
    recent,
    checklist,
  };
}
