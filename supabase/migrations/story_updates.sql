-- 1. Create Story Views Table
create table if not exists public.story_views (
  id uuid default gen_random_uuid() primary key,
  story_id uuid references public.stories(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  viewed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(story_id, user_id) -- One view count per user per story
);

-- 2. Enable RLS
alter table public.story_views enable row level security;

create policy "Users can insert view" on public.story_views
  for insert with check (auth.uid() = user_id);

create policy "Users can see views for their stories" on public.story_views
  for select using (
    exists (select 1 from public.stories s where s.id = story_id and s.user_id = auth.uid())
  );

-- 3. Add views_count to stories if not exists
alter table public.stories add column if not exists views_count bigint default 0;

-- 4. Create Trigger to increment view count
create or replace function public.handle_story_view()
returns trigger as $$
begin
  update public.stories
  set views_count = views_count + 1
  where id = new.story_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_story_view on public.story_views;
create trigger on_story_view
  after insert on public.story_views
  for each row execute procedure public.handle_story_view();
