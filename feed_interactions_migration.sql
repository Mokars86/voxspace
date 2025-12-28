-- 1. Create Comments Table
create table if not exists public.comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS for Comments
alter table public.comments enable row level security;

create policy "View comments" 
on public.comments for select 
using (true);

create policy "Add comments" 
on public.comments for insert 
with check (auth.role() = 'authenticated');

create policy "Delete own comments" 
on public.comments for delete 
using (auth.uid() = user_id);

-- 3. Add DELETE policy for Posts (so users can delete their own posts)
create policy "Delete own posts" 
on public.posts for delete 
using (auth.uid() = user_id);

-- 4. Trigger to update comments_count on posts
create or replace function public.handle_new_comment()
returns trigger as $$
begin
  update public.posts
  set comments_count = comments_count + 1
  where id = new.post_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_comment_added
  after insert on public.comments
  for each row execute procedure public.handle_new_comment();

create or replace function public.handle_deleted_comment()
returns trigger as $$
begin
  update public.posts
  set comments_count = comments_count - 1
  where id = old.post_id;
  return old;
end;
$$ language plpgsql security definer;

create trigger on_comment_deleted
  after delete on public.comments
  for each row execute procedure public.handle_deleted_comment();
