import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationItem = {
  kind: "like" | "comment" | "reply";
  created_at: string;
  actor_id: string;
  actor_name: string;
  actor_avatar: string | null;
  post_id: string;
  snippet: string | null;
};

export const notificationText: Record<NotificationItem["kind"], string> = {
  like: "liked your post",
  comment: "commented on your post",
  reply: "replied to your comment",
};

/** Latest likes, comments and replies for the signed-in member, plus when they last looked */
export async function fetchNotifications(supabase: SupabaseClient, userId: string) {
  const [list, profile] = await Promise.all([
    supabase.rpc("my_notifications", { max_items: 30 }),
    supabase.from("profiles").select("notifications_seen_at").eq("id", userId).maybeSingle(),
  ]);
  if (list.error) return null;
  return {
    items: (list.data ?? []) as NotificationItem[],
    seenAt: profile.data?.notifications_seen_at ? new Date(profile.data.notifications_seen_at).getTime() : 0,
  };
}

export async function markNotificationsSeen(supabase: SupabaseClient, userId: string) {
  await supabase.from("profiles").update({ notifications_seen_at: new Date().toISOString() }).eq("id", userId);
}
