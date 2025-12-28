-- FIX FOLLOWER COUNTS
-- Issue: If counts are NULL, adding 1 results in NULL (so count stays 0).
-- This script fixes existing data and makes triggers safer.

-- 1. Fix existing NULLs
update public.profiles 
set followers_count = 0 
where followers_count is null;

update public.profiles 
set following_count = 0 
where following_count is null;

-- 2. Update Triggers to be safer (Use COALESCE)

create or replace function public.handle_new_follow()
returns trigger as $$
begin
  -- Increment following count for the follower
  update public.profiles
  set following_count = coalesce(following_count, 0) + 1
  where id = new.follower_id;

  -- Increment followers count for the person being followed
  update public.profiles
  set followers_count = coalesce(followers_count, 0) + 1
  where id = new.following_id;

  return new;
end;
$$ language plpgsql security definer;

create or replace function public.handle_unfollow()
returns trigger as $$
begin
  -- Decrement following count for the follower
  update public.profiles
  set following_count = coalesce(following_count, 0) - 1
  where id = old.follower_id;

  -- Decrement followers count for the person being followed
  update public.profiles
  set followers_count = coalesce(followers_count, 0) - 1
  where id = old.following_id;

  return old;
end;
$$ language plpgsql security definer;
