"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/feed/Avatar";
import {
  announceMessagesChanged,
  clockTime,
  dayLabel,
  fetchConversations,
  fetchMessages,
  listTime,
  MAX_MESSAGE_LENGTH,
} from "@/lib/messages";
import type { Conversation, Message } from "@/lib/messages";
import { authorName } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import styles from "./messages.module.css";

const LIST_REFRESH_MS = 8_000;
const THREAD_REFRESH_MS = 4_000;

type Member = { id: string; first_name: string | null; last_name: string | null; display_name: string | null; avatar_url: string | null; location: string | null };

export function MessagesApp({ myId }: { myId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const activeId = params.get("c");
  const withId = params.get("with");

  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  const refreshList = useCallback(async () => {
    const list = await fetchConversations(createClient());
    if (list) {
      setConversations(list);
      setLoadFailed(false);
    } else {
      setLoadFailed(true);
    }
    return list;
  }, []);

  // Conversation list: now, then every few seconds while the tab is visible
  useEffect(() => {
    refreshList();
    const timer = setInterval(() => {
      if (!document.hidden) refreshList();
    }, LIST_REFRESH_MS);
    return () => clearInterval(timer);
  }, [refreshList]);

  const openWith = useCallback(
    async (otherId: string) => {
      const { data, error } = await createClient().rpc("start_conversation", { other: otherId });
      if (error || !data) {
        setLoadFailed(true);
        router.replace("/messages");
        return;
      }
      await refreshList();
      setShowNew(false);
      router.replace(`/messages?c=${data}`);
    },
    [refreshList, router],
  );

  // /messages?with=<member> starts (or reopens) a chat, e.g. from the "Message" button on the feed
  const startedWith = useRef<string | null>(null);
  useEffect(() => {
    if (!withId || startedWith.current === withId) return;
    startedWith.current = withId;
    openWith(withId);
  }, [withId, openWith]);

  const active = conversations?.find((c) => c.id === activeId) ?? null;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!conversations) return [];
    return q ? conversations.filter((c) => c.other_name.toLowerCase().includes(q)) : conversations;
  }, [conversations, search]);

  return (
    <div className={`${styles.panes} ${activeId ? styles.chatOpen : ""}`}>
      <aside className={styles.listPane} aria-label="Conversations">
        {showNew ? (
          <NewMessage myId={myId} onBack={() => setShowNew(false)} onPick={openWith} />
        ) : (
          <>
            <div className={styles.paneHead}>
              <h1 className={styles.title}>Messages</h1>
              <button type="button" className={styles.iconButton} onClick={() => setShowNew(true)} aria-label="New message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16v4Zm9.5-13.5 4 4" />
                </svg>
              </button>
            </div>

            <div className={styles.searchWrap}>
              <label htmlFor="conversation-search" className="sr-only">
                Search conversations
              </label>
              <input
                id="conversation-search"
                type="search"
                className={styles.search}
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
            </div>

            {loadFailed ? (
              <p className={styles.note} role="alert">
                We couldn’t load your messages. Please check your connection and try again.
              </p>
            ) : conversations === null ? (
              <p className={styles.note}>Loading…</p>
            ) : conversations.length === 0 ? (
              <div className={styles.note}>
                <p>
                  <strong>No conversations yet.</strong>
                </p>
                <p>Choose “New message” (the pencil above) to write to a member.</p>
              </div>
            ) : visible.length === 0 ? (
              <p className={styles.note}>No conversation matches “{search}”.</p>
            ) : (
              <ul className={styles.convList}>
                {visible.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/messages?c=${c.id}`}
                      className={`${styles.conv} ${c.id === activeId ? styles.convActive : ""}`}
                      aria-current={c.id === activeId ? "page" : undefined}
                    >
                      <Avatar url={c.other_avatar} size={44} />
                      <span className={styles.convBody}>
                        <span className={styles.convTop}>
                          <span className={styles.convName}>{c.other_name}</span>
                          <span className={styles.convTime}>{listTime(c.last_at)}</span>
                        </span>
                        <span className={styles.convBottom}>
                          <span className={`${styles.convPreview} ${c.unread > 0 ? styles.convPreviewNew : ""}`}>
                            {c.last_body ? `${c.last_sender === myId ? "You: " : ""}${c.last_body}` : "No messages yet"}
                          </span>
                          {c.unread > 0 ? (
                            <span className={styles.unread}>
                              {c.unread > 99 ? "99+" : c.unread}
                              <span className="sr-only"> unread</span>
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </aside>

      <section className={styles.chatPane} aria-label="Chat">
        {activeId ? (
          <Chat key={activeId} myId={myId} conversationId={activeId} other={active} listLoaded={conversations !== null} onChanged={refreshList} />
        ) : (
          <div className={styles.placeholder}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z" />
            </svg>
            <p>Select a conversation, or start a new one.</p>
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- Start a new chat: pick a member ---------- */
function NewMessage({ myId, onBack, onPick }: { myId: string; onBack: () => void; onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      // Keep the characters PostgREST uses for its own syntax out of the search
      const q = query.trim().replace(/[,()%*\\]/g, " ").trim();
      let request = createClient()
        .from("profiles")
        .select("id, first_name, last_name, display_name, avatar_url, location")
        .neq("id", myId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (q) request = request.or(`display_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
      const { data, error } = await request;
      if (cancelled) return;
      setFailed(Boolean(error));
      setMembers((data ?? []) as Member[]);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, myId]);

  return (
    <>
      <div className={styles.paneHead}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <span aria-hidden="true">←</span> Back
        </button>
        <h1 className={styles.titleSmall}>New message</h1>
      </div>
      <div className={styles.searchWrap}>
        <label htmlFor="member-search" className="sr-only">
          Search members by name
        </label>
        <input id="member-search" type="search" className={styles.search} placeholder="Search members by name" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" autoFocus />
      </div>
      {failed ? (
        <p className={styles.note} role="alert">
          We couldn’t search members. Please try again.
        </p>
      ) : members === null ? (
        <p className={styles.note}>Loading…</p>
      ) : members.length === 0 ? (
        <p className={styles.note}>No members found.</p>
      ) : (
        <ul className={styles.convList}>
          {members.map((m) => (
            <li key={m.id}>
              <button type="button" className={`${styles.conv} ${styles.convButton}`} onClick={() => onPick(m.id)}>
                <Avatar url={m.avatar_url} size={44} />
                <span className={styles.convBody}>
                  <span className={styles.convName}>{authorName(m)}</span>
                  {m.location ? <span className={styles.convPreview}>{m.location}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ---------- One conversation ---------- */
function Chat({
  myId,
  conversationId,
  other,
  listLoaded,
  onChanged,
}: {
  myId: string;
  conversationId: string;
  other: Conversation | null;
  listLoaded: boolean;
  onChanged: () => Promise<Conversation[] | null>;
}) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const markedUpTo = useRef<string | null>(null);

  const load = useCallback(async () => {
    const rows = await fetchMessages(createClient(), conversationId);
    if (!rows) {
      setFailed(true);
      return;
    }
    setFailed(false);
    // Only update when something changed, so the screen doesn't jump
    setMessages((current) =>
      current && current.length === rows.length && current[current.length - 1]?.id === rows[rows.length - 1]?.id ? current : rows,
    );
  }, [conversationId]);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, THREAD_REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Stay at the newest message, unless the reader has scrolled up
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Opening a chat, or a new message arriving while it's open, counts as reading it
  const lastId = messages?.[messages.length - 1]?.id ?? null;
  const lastFromOther = messages?.[messages.length - 1]?.sender_id !== myId;
  useEffect(() => {
    if (!lastId || !lastFromOther || markedUpTo.current === lastId) return;
    markedUpTo.current = lastId;
    createClient()
      .rpc("mark_conversation_read", { conv: conversationId })
      .then(() => {
        onChanged();
        announceMessagesChanged();
      });
  }, [lastId, lastFromOther, conversationId, onChanged]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError("");
    const { data, error } = await createClient()
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: myId, body })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();
    setSending(false);
    if (error || !data) {
      setSendError("We couldn’t send your message. Please try again.");
      return;
    }
    stickToBottom.current = true;
    setText("");
    setMessages((current) => [...(current ?? []), data as Message]);
    onChanged();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter adds a new line
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  // Messages grouped by day, each day with its heading
  const days = useMemo(() => {
    const groups: { label: string; items: Message[] }[] = [];
    for (const m of messages ?? []) {
      const label = dayLabel(m.created_at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(m);
      else groups.push({ label, items: [m] });
    }
    return groups;
  }, [messages]);

  if (!other && listLoaded) {
    return (
      <div className={styles.placeholder}>
        <p>This conversation isn’t available.</p>
        <Link href="/messages" className={styles.textLink}>
          Back to messages
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.chat}>
      <header className={styles.chatHead}>
        <Link href="/messages" className={styles.backLink} aria-label="Back to all conversations">
          <span aria-hidden="true">←</span>
        </Link>
        <Avatar url={other?.other_avatar} size={40} />
        <p className={styles.chatName}>{other?.other_name ?? "…"}</p>
      </header>

      <div
        ref={scroller}
        className={styles.thread}
        role="log"
        aria-live="polite"
        aria-label={`Messages with ${other?.other_name ?? "this member"}`}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {failed ? (
          <p className={styles.note} role="alert">
            We couldn’t load this conversation. Please try again.
          </p>
        ) : messages === null ? (
          <p className={styles.note}>Loading…</p>
        ) : messages.length === 0 ? (
          <p className={styles.note}>No messages yet. Say hello to {other?.other_name ?? "them"}!</p>
        ) : (
          days.map((day) => (
            <div key={day.label} className={styles.day}>
              <p className={styles.dayLabel}>
                <span>{day.label}</span>
              </p>
              {day.items.map((m) => {
                const mine = m.sender_id === myId;
                return (
                  <div key={m.id} className={`${styles.row} ${mine ? styles.rowMine : ""}`}>
                    <div className={`${styles.bubble} ${mine ? styles.bubbleMine : ""}`}>
                      <p className={styles.bubbleText}>{m.body}</p>
                    </div>
                    <p className={styles.bubbleTime}>
                      <span className="sr-only">{mine ? "You, " : `${other?.other_name ?? "They"}, `}</span>
                      {clockTime(m.created_at)}
                    </p>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <form className={styles.composer} onSubmit={send}>
        <label htmlFor="message-text" className="sr-only">
          Write a message
        </label>
        <textarea
          id="message-text"
          className={styles.input}
          rows={1}
          placeholder="Write a message…"
          value={text}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={onKeyDown}
        />
        <Button type="submit" disabled={!text.trim() || sending} className={styles.send}>
          {sending ? "Sending…" : "Send"}
        </Button>
        {sendError ? (
          <p className={styles.sendError} role="alert">
            {sendError}
          </p>
        ) : (
          <p className={styles.hint}>Press Enter to send, Shift+Enter for a new line.</p>
        )}
      </form>
    </div>
  );
}
