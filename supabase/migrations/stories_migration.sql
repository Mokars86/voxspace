-- Create stories table
create table if not exists public.stories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  media_url text,
  content text,
  type text check (type in ('image', 'text')) default 'image',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default timezone('utc'::text, now() + interval '24 hours') not null
);

-- Enable RLS
alter table public.stories enable row level security;

-- Policy: Everyone can read active stories
create policy "Everyone can read active stories"
  on public.stories for select
  using (expires_at > now());

-- Policy: Users can create their own stories
create policy "Users can insert their own stories"
  on public.stories for insert
  with check (auth.uid() = user_id);

-- Policy: Users can delete their own stories
create policy "Users can delete their own stories"
  on public.stories for delete
  using (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table public.stories;
