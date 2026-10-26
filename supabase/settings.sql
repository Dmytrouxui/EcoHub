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
