-- EcoHub: profiles + profile pictures
-- Paste this whole file into Supabase > SQL Editor and click Run. Safe to run more than once.

-- 1. Profiles: one row per user, created automatically when someone signs up
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  first_name  text,
  last_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Access: signed-in members can see profiles, and everyone can only edit their own
grant select, update on public.profiles to authenticated;

drop policy if exists "Members can view profiles" on public.profiles;
create policy "Members can view profiles"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Create the profile when a new user signs up (takes the name from the sign up form)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles for users that already existed (like your test user)
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- 2. Profile pictures: a public folder ("bucket"), max 2 MB, images only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Everyone can see pictures. Each user can only add, change or delete files inside their own folder.
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Profile page fields: display name, location, interest tags, bio
alter table public.profiles add column if not exists display_name text check (char_length(display_name) <= 50);
alter table public.profiles add column if not exists location text check (char_length(location) <= 100);
alter table public.profiles add column if not exists tags text[] not null default '{}' check (cardinality(tags) <= 10);
alter table public.profiles add column if not exists bio text check (char_length(bio) <= 300);

-- 4. Feed: posts, likes, saves, comments
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null,
  title       text check (char_length(title) <= 120),
  body        text not null check (char_length(body) between 1 and 2000),
  image_urls  text[] not null default '{}' check (cardinality(image_urls) <= 4),
  tags        text[] not null default '{}' check (cardinality(tags) <= 8),
  created_at  timestamptz not null default now(),
  constraint posts_author_id_fkey foreign key (author_id) references public.profiles (id) on delete cascade
);
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_tags_idx on public.posts using gin (tags);

create table if not exists public.post_likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_saves (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  author_id   uuid not null,
  parent_id   uuid references public.comments (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now(),
  constraint comments_author_id_fkey foreign key (author_id) references public.profiles (id) on delete cascade
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.posts          enable row level security;
alter table public.post_likes     enable row level security;
alter table public.post_saves     enable row level security;
alter table public.comments       enable row level security;
alter table public.comment_likes  enable row level security;

grant select, insert, delete on public.posts         to authenticated;
grant select, insert, delete on public.post_likes    to authenticated;
grant select, insert, delete on public.post_saves    to authenticated;
grant select, insert, delete on public.comments      to authenticated;
grant select, insert, delete on public.comment_likes to authenticated;

-- Posts and comments: every signed-in member can read; you can only add or delete your own
drop policy if exists "Members can read posts" on public.posts;
create policy "Members can read posts" on public.posts for select to authenticated using (true);
drop policy if exists "Members can add their own posts" on public.posts;
create policy "Members can add their own posts" on public.posts for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "Members can delete their own posts" on public.posts;
create policy "Members can delete their own posts" on public.posts for delete to authenticated using (author_id = auth.uid());

drop policy if exists "Members can read comments" on public.comments;
create policy "Members can read comments" on public.comments for select to authenticated using (true);
drop policy if exists "Members can add their own comments" on public.comments;
create policy "Members can add their own comments" on public.comments for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "Members can delete their own comments" on public.comments;
create policy "Members can delete their own comments" on public.comments for delete to authenticated using (author_id = auth.uid());

-- Likes: everyone can see the counts, you can only add or remove your own like
drop policy if exists "Members can read post likes" on public.post_likes;
create policy "Members can read post likes" on public.post_likes for select to authenticated using (true);
drop policy if exists "Members can like posts" on public.post_likes;
create policy "Members can like posts" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Members can unlike posts" on public.post_likes;
create policy "Members can unlike posts" on public.post_likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists "Members can read comment likes" on public.comment_likes;
create policy "Members can read comment likes" on public.comment_likes for select to authenticated using (true);
drop policy if exists "Members can like comments" on public.comment_likes;
create policy "Members can like comments" on public.comment_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Members can unlike comments" on public.comment_likes;
create policy "Members can unlike comments" on public.comment_likes for delete to authenticated using (user_id = auth.uid());

-- Saved posts are private: you only see your own
drop policy if exists "Members can read their saved posts" on public.post_saves;
create policy "Members can read their saved posts" on public.post_saves for select to authenticated using (user_id = auth.uid());
drop policy if exists "Members can save posts" on public.post_saves;
create policy "Members can save posts" on public.post_saves for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Members can unsave posts" on public.post_saves;
create policy "Members can unsave posts" on public.post_saves for delete to authenticated using (user_id = auth.uid());

-- Post pictures: public folder, max 5 MB, images only, each member writes only in their own folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members can upload post images" on storage.objects;
create policy "Members can upload post images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Members can delete their post images" on storage.objects;
create policy "Members can delete their post images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Section 5: settings. Run once in the Supabase SQL Editor.

-- Notification choices (saved now, used when notifications are built)
alter table public.profiles
  add column if not exists notify_likes    boolean not null default true,
  add column if not exists notify_comments boolean not null default true,
  add column if not exists notify_replies  boolean not null default true;

-- "Delete my account": removes the signed-in member from auth.users.
-- Their profile, posts, comments, likes and saves are deleted with it (on delete cascade).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
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
-- Landing page: messages from the "Contact Us" form. Run once in the Supabase SQL Editor.
-- Visitors (signed in or not) can only ADD a message. Nobody can read them through the app;
-- you read them in Supabase: Table Editor > contact_messages.

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 1 and 80),
  email      text not null check (char_length(email) between 5 and 160 and email like '%_@_%._%'),
  message    text not null check (char_length(trim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can send a contact message" on public.contact_messages;
create policy "Anyone can send a contact message"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

-- Tables are not exposed automatically, so grant exactly one thing: adding a row.
grant insert on public.contact_messages to anon, authenticated;
