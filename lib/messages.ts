import type { SupabaseClient } from "@supabase/supabase-js";

export type Conversation = {
  id: string;
  other_id: string;
  other_name: string;
  other_avatar: string | null;
  last_body: string | null;
  last_sender: string | null;
  last_at: string;
  unread: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export const MAX_MESSAGE_LENGTH = 2000;

export async function fetchConversations(supabase: SupabaseClient): Promise<Conversation[] | null> {
  const { data, error } = await supabase.rpc("my_conversations");
  if (error) return null;
  return (data ?? []) as Conversation[];
}

/** The latest messages of a conversation, oldest first */
export async function fetchMessages(supabase: SupabaseClient, conversationId: string, limit = 100): Promise<Message[] | null> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return null;
  return ((data ?? []) as Message[]).reverse();
}

/** Tells the header to re-check the unread count right away */
export function announceMessagesChanged() {
  window.dispatchEvent(new Event("messages-updated"));
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Time shown in the conversation list: the clock today, "Yesterday", or the date */
export function listTime(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (sameDay(date, now)) return clockTime(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Heading above a day of messages */
export function dayLabel(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (sameDay(date, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}
