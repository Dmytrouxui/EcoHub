import type { SupabaseClient } from "@supabase/supabase-js";

// How many points each action is worth. Shown to members in "How do I earn points?".
export const POINTS = {
  post: 5,
  comment: 2,
  like: 1,
  profile: 10,
} as const;

export const POINTS_PER_TREE = 100;

export type EcoScore = {
  points: number;
  level: number; // 1 = first tree
  progress: number; // points inside the current tree, 0 to 99
  breakdown: { posts: number; comments: number; likes: number; profileComplete: boolean };
};

/** Works out a member's points from what they have already done. Nothing extra is stored. */
export async function getEcoScore(supabase: SupabaseClient, userId: string): Promise<EcoScore> {
  const [posts, comments, myPosts, profile] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("author_id", userId),
    supabase.from("posts").select("likes:post_likes(count)").eq("author_id", userId),
    supabase.from("profiles").select("avatar_url, bio, location").eq("id", userId).maybeSingle(),
  ]);

  const likes = (myPosts.data ?? []).reduce((sum, p) => {
    const l = (p as unknown as { likes: { count: number }[] }).likes;
    return sum + (l?.[0]?.count ?? 0);
  }, 0);

  const p = profile.data;
  const profileComplete = Boolean(p?.avatar_url && p?.bio?.trim() && p?.location?.trim());

  const postCount = posts.count ?? 0;
  const commentCount = comments.count ?? 0;
  const points =
    postCount * POINTS.post + commentCount * POINTS.comment + likes * POINTS.like + (profileComplete ? POINTS.profile : 0);

  return {
    points,
    level: Math.floor(points / POINTS_PER_TREE) + 1,
    progress: points % POINTS_PER_TREE,
    breakdown: { posts: postCount, comments: commentCount, likes, profileComplete },
  };
}
