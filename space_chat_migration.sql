-- 1. Space Members Table
create table if not exists public.space_members (
  space_id uuid references public.spaces(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (space_id, user_id)
);

-- RLS for Members
alter table public.space_members enable row level security;

create policy "Everyone can view space members" 
on public.space_members for select 
using (true);

create policy "Authenticated users can join spaces" 
on public.space_members for insert 
with check (auth.role() = 'authenticated');

create policy "Users can leave spaces" 
on public.space_members for delete 
using (auth.uid() = user_id);

-- 2. Space Messages Table
create table if not exists public.space_messages (
  id uuid default uuid_generate_v4() primary key,
  space_id uuid references public.spaces(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Messages
alter table public.space_messages enable row level security;

create policy "Everyone can view space messages" 
on public.space_messages for select 
using (true);

create policy "Members can send messages" 
on public.space_messages for insert 
with check (
  auth.role() = 'authenticated' AND 
  exists (
    select 1 from public.space_members 
    where space_id = space_messages.space_id 
    and user_id = auth.uid()
  )
);

-- 3. Triggers for Member Count
create or replace function public.handle_space_join()
returns trigger as $$
begin
  update public.spaces
  set members_count = members_count + 1
  where id = new.space_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_space_join
  after insert on public.space_members
  for each row execute procedure public.handle_space_join();

create or replace function public.handle_space_leave()
returns trigger as $$
begin
  update public.spaces
  set members_count = members_count - 1
  where id = old.space_id;
  return old;
end;
$$ language plpgsql security definer;

create trigger on_space_leave
  after delete on public.space_members
  for each row execute procedure public.handle_space_leave();
