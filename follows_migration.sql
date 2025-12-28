-- FOLLOWERS SYSTEM MIGRATION

-- 1. Create Follows Table
create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);

-- 2. Add Count Columns to Profiles (if they don't exist)
alter table public.profiles 
add column if not exists followers_count bigint default 0,
add column if not exists following_count bigint default 0;

-- 3. RLS Policies
alter table public.follows enable row level security;

-- Everyone can view who follows whom
create policy "Follows viewable by everyone" 
on public.follows for select 
using (true);

-- Authenticated users can follow (insert their own id)
create policy "Authenticated users can follow" 
on public.follows for insert 
with check (auth.role() = 'authenticated' AND auth.uid() = follower_id);

-- Users can unfollow (delete their own row)
create policy "Users can unfollow" 
on public.follows for delete 
using (auth.uid() = follower_id);


-- 4. Triggers to maintain counts

-- Function: Handle New Follow
create or replace function public.handle_new_follow()
returns trigger as $$
begin
  -- Increment following count for the follower
  update public.profiles
  set following_count = following_count + 1
  where id = new.follower_id;

  -- Increment followers count for the person being followed
  update public.profiles
  set followers_count = followers_count + 1
  where id = new.following_id;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_follow_created
  after insert on public.follows
  for each row execute procedure public.handle_new_follow();


-- Function: Handle Unfollow
create or replace function public.handle_unfollow()
returns trigger as $$
begin
  -- Decrement following count for the follower
  update public.profiles
  set following_count = following_count - 1
  where id = old.follower_id;

  -- Decrement followers count for the person being followed
  update public.profiles
  set followers_count = followers_count - 1
  where id = old.following_id;

  return old;
end;
$$ language plpgsql security definer;

create trigger on_follow_deleted
  after delete on public.follows
  for each row execute procedure public.handle_unfollow();
