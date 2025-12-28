-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Extends Supabase Auth)
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  website text,
  is_verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Profiles
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile." on public.profiles for update using (auth.uid() = id);

-- Handle new user signup trigger
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- POSTS
create table public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  content text,
  media_url text,
  likes_count bigint default 0,
  reposts_count bigint default 0,
  comments_count bigint default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Posts
alter table public.posts enable row level security;
create policy "Posts are viewable by everyone." on public.posts for select using (true);
create policy "Authenticated users can create posts." on public.posts for insert with check (auth.role() = 'authenticated');
create policy "Users can update own posts." on public.posts for update using (auth.uid() = user_id);

-- LIKES
create table public.post_likes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  post_id uuid references public.posts(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, post_id)
);

alter table public.post_likes enable row level security;
create policy "Likes viewable by everyone" on public.post_likes for select using (true);
create policy "Authenticated users can like" on public.post_likes for insert with check (auth.role() = 'authenticated');
create policy "Users can unlike" on public.post_likes for delete using (auth.uid() = user_id);

-- CHATS (Conversations)
create table public.chats (
  id uuid default uuid_generate_v4() primary key,
  name text, -- For group chats
  is_group boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chats enable row level security;
-- Policies needed for participants to view chats

-- CHAT PARTICIPANTS
create table public.chat_participants (
  chat_id uuid references public.chats(id) not null,
  user_id uuid references public.profiles(id) not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (chat_id, user_id)
);

alter table public.chat_participants enable row level security;
create policy "Users can view chats they are in" on public.chat_participants for select using (auth.uid() = user_id);

-- MESSAGES
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chats(id) not null,
  sender_id uuid references public.profiles(id) not null,
  content text,
  media_url text,
  type text default 'text', -- text, image, voice, video
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;
create policy "Users can view messages in their chats" on public.messages for select using (
  exists (
    select 1 from public.chat_participants
    where chat_participants.chat_id = messages.chat_id
    and chat_participants.user_id = auth.uid()
  )
);
create policy "Users can send messages to their chats" on public.messages for insert with check (
  exists (
    select 1 from public.chat_participants
    where chat_participants.chat_id = chat_id
    and chat_participants.user_id = auth.uid()
  )
);

-- SPACES
create table public.spaces (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  banner_url text,
  owner_id uuid references public.profiles(id) not null,
  members_count bigint default 0,
  is_live boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.spaces enable row level security;
create policy "Spaces are viewable by everyone" on public.spaces for select using (true);
create policy "Authenticated users can create spaces" on public.spaces for insert with check (auth.role() = 'authenticated');
create policy "Users can update their own spaces" on public.spaces for update using (auth.uid() = owner_id);

-- STORAGE BUCKETS (Script to insert into storage.buckets)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
insert into storage.buckets (id, name, public) values ('post_media', 'post_media', true);

-- Helper for liking posts (increments count)
create or replace function public.handle_post_like()
returns trigger as $$
begin
  update public.posts
  set likes_count = likes_count + 1
  where id = new.post_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_post_like
  after insert on public.post_likes
  for each row execute procedure public.handle_post_like();

create or replace function public.handle_post_unlike()
returns trigger as $$
begin
  update public.posts
  set likes_count = likes_count - 1
  where id = old.post_id;
  return old;
end;
$$ language plpgsql security definer;

create trigger on_post_unlike
  after delete on public.post_likes
  for each row execute procedure public.handle_post_unlike();
