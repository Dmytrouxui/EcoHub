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
