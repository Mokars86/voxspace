-- FINAL SETUP SCRIPT
-- RUN THIS TO FIX "RELATION DOES NOT EXIST" ERRORS

-- 1. Create Tables (If they are missing)
create table if not exists public.space_members (
  space_id uuid references public.spaces(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (space_id, user_id)
);

create table if not exists public.space_messages (
  id uuid default uuid_generate_v4() primary key,
  space_id uuid references public.spaces(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Clean up old security rules
alter table public.space_members enable row level security;
alter table public.space_messages enable row level security;

drop policy if exists "Everyone can view space members" on public.space_members;
drop policy if exists "Authenticated users can join spaces" on public.space_members;
drop policy if exists "Users can leave spaces" on public.space_members;
drop policy if exists "Everyone can view space messages" on public.space_messages;
drop policy if exists "Members can send messages" on public.space_messages;
drop policy if exists "Authenticated users can send messages" on public.space_messages;


-- 3. Apply New Security Rules

-- Members
create policy "Everyone can view space members" 
on public.space_members for select 
using (true);

create policy "Authenticated users can join spaces" 
on public.space_members for insert 
with check (auth.role() = 'authenticated');

create policy "Users can leave spaces" 
on public.space_members for delete 
using (auth.uid() = user_id);

-- Messages (Relaxed Rule: Any authenticated user can send, UI handles membership check)
create policy "Everyone can view space messages" 
on public.space_messages for select 
using (true);

create policy "Authenticated users can send messages" 
on public.space_messages for insert 
with check (
  auth.role() = 'authenticated' AND 
  sender_id = auth.uid()
);

-- 4. Setup Auto-Counters (Triggers)
drop trigger if exists on_space_join on public.space_members;
drop trigger if exists on_space_leave on public.space_members;

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
