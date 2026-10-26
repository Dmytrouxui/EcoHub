-- Section 6: notifications and messages. Run once in the Supabase SQL Editor.

-- ---------- Notifications ----------
-- When the member last opened the bell. Anything newer is "new".
alter table public.profiles
  add column if not exists notifications_seen_at timestamptz not null default now();

-- Likes, comments and replies on the signed-in member's content, newest first.
-- Respects the switches in Settings. Nothing is stored: it is read from what already exists.
create or replace function public.my_notifications(max_items int default 30)
returns table (
  kind        text,
  created_at  timestamptz,
  actor_id    uuid,
  actor_name  text,
  actor_avatar text,
  post_id     uuid,
  snippet     text
)
language sql
stable
set search_path = ''
as $$
  with me as (
    select notify_likes, notify_comments, notify_replies
    from public.profiles where id = auth.uid()
  )
  select * from (
    select 'like'::text as kind, l.created_at, l.user_id as actor_id,
           coalesce(nullif(a.display_name, ''), nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), ''), 'EcoHub member') as actor_name,
           a.avatar_url as actor_avatar, l.post_id,
           left(coalesce(nullif(po.title, ''), po.body), 70) as snippet
    from public.post_likes l
    join public.posts po on po.id = l.post_id
    join public.profiles a on a.id = l.user_id
    where po.author_id = auth.uid() and l.user_id <> auth.uid()
      and coalesce((select notify_likes from me), true)

    union all

    select 'comment', c.created_at, c.author_id,
           coalesce(nullif(a.display_name, ''), nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), ''), 'EcoHub member'),
           a.avatar_url, c.post_id, left(c.body, 70)
    from public.comments c
    join public.posts po on po.id = c.post_id
    join public.profiles a on a.id = c.author_id
    where po.author_id = auth.uid() and c.author_id <> auth.uid() and c.parent_id is null
      and coalesce((select notify_comments from me), true)

    union all

    select 'reply', c.created_at, c.author_id,
           coalesce(nullif(a.display_name, ''), nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), ''), 'EcoHub member'),
           a.avatar_url, c.post_id, left(c.body, 70)
    from public.comments c
    join public.comments pc on pc.id = c.parent_id
    join public.profiles a on a.id = c.author_id
    where pc.author_id = auth.uid() and c.author_id <> auth.uid()
      and coalesce((select notify_replies from me), true)
  ) n
  order by n.created_at desc
  limit max_items;
$$;

grant execute on function public.my_notifications(int) to authenticated;
revoke execute on function public.my_notifications(int) from anon, public;

-- ---------- Messages ----------
-- One conversation per pair of members. user_a is always the smaller id, so a pair can't be stored twice.
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  user_a          uuid not null references public.profiles (id) on delete cascade,
  user_b          uuid not null references public.profiles (id) on delete cascade,
  user_a_read_at  timestamptz not null default now(),
  user_b_read_at  timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  constraint conversations_pair_order check (user_a < user_b),
  constraint conversations_pair_unique unique (user_a, user_b)
);
create index if not exists conversations_user_a_idx on public.conversations (user_a);
create index if not exists conversations_user_b_idx on public.conversations (user_b);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  body            text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at desc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

grant select on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;

-- You can only see conversations you are part of, and only the messages inside them
drop policy if exists "Members can read their conversations" on public.conversations;
create policy "Members can read their conversations" on public.conversations
  for select to authenticated using (auth.uid() in (user_a, user_b));

drop policy if exists "Members can read their messages" on public.messages;
create policy "Members can read their messages" on public.messages
  for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));

drop policy if exists "Members can send messages in their conversations" on public.messages;
create policy "Members can send messages in their conversations" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b))
  );

-- A new message moves the conversation up the list and counts as read for the sender
create or replace function public.on_message_sent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      user_a_read_at = case when user_a = new.sender_id then new.created_at else user_a_read_at end,
      user_b_read_at = case when user_b = new.sender_id then new.created_at else user_b_read_at end
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_sent();

-- Opens (or creates) the conversation with another member and returns its id
create or replace function public.start_conversation(other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  conv uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if other is null or other = me then raise exception 'Choose another member'; end if;
  if not exists (select 1 from public.profiles where id = other) then raise exception 'Member not found'; end if;
  a := least(me, other);
  b := greatest(me, other);
  insert into public.conversations (user_a, user_b) values (a, b)
    on conflict (user_a, user_b) do nothing;
  select id into conv from public.conversations where user_a = a and user_b = b;
  return conv;
end;
$$;

-- Marks a conversation as read for the signed-in member
create or replace function public.mark_conversation_read(conv uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.conversations
  set user_a_read_at = case when user_a = auth.uid() then now() else user_a_read_at end,
      user_b_read_at = case when user_b = auth.uid() then now() else user_b_read_at end
  where id = conv and auth.uid() in (user_a, user_b);
$$;

-- The conversation list: who you talk to, the last message and how many are unread
create or replace function public.my_conversations()
returns table (
  id            uuid,
  other_id      uuid,
  other_name    text,
  other_avatar  text,
  last_body     text,
  last_sender   uuid,
  last_at       timestamptz,
  unread        int
)
language sql
stable
set search_path = ''
as $$
  select c.id,
         o.id,
         coalesce(nullif(o.display_name, ''), nullif(trim(coalesce(o.first_name, '') || ' ' || coalesce(o.last_name, '')), ''), 'EcoHub member'),
         o.avatar_url,
         lm.body,
         lm.sender_id,
         coalesce(lm.created_at, c.created_at),
         (select count(*)::int from public.messages m
           where m.conversation_id = c.id and m.sender_id <> auth.uid()
             and m.created_at > case when c.user_a = auth.uid() then c.user_a_read_at else c.user_b_read_at end)
  from public.conversations c
  join public.profiles o on o.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
  left join lateral (
    select m.body, m.sender_id, m.created_at from public.messages m
    where m.conversation_id = c.id order by m.created_at desc limit 1
  ) lm on true
  where auth.uid() in (c.user_a, c.user_b)
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

-- Total unread messages, for the badge in the header
create or replace function public.unread_messages_count()
returns int
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(u.unread), 0)::int from public.my_conversations() u;
$$;

grant execute on function public.start_conversation(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.my_conversations() to authenticated;
grant execute on function public.unread_messages_count() to authenticated;
revoke execute on function public.start_conversation(uuid) from anon, public;
revoke execute on function public.mark_conversation_read(uuid) from anon, public;
revoke execute on function public.my_conversations() from anon, public;
revoke execute on function public.unread_messages_count() from anon, public;
