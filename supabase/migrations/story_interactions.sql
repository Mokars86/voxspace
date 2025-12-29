-- Create story_interactions table for Likes
create table if not exists public.story_interactions (
  id uuid default gen_random_uuid() primary key,
  story_id uuid references public.stories(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reaction_type text not null, -- 'like', 'love', etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(story_id, user_id) -- One like per user per story
);

alter table public.story_interactions enable row level security;

create policy "Users can view interactions on visible stories"
  on public.story_interactions for select
  using ( exists (select 1 from public.stories where id = story_id) );

create policy "Users can react to stories"
  on public.story_interactions for insert
  with check ( auth.uid() = user_id );

create policy "Users can remove their own reactions"
  on public.story_interactions for delete
  using ( auth.uid() = user_id );


-- Function to Get or Create a DM Conversation
create or replace function public.get_or_create_dm(target_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  existing_chat_id uuid;
  new_chat_id uuid;
begin
  -- 1. Check for existing DM (intersection of chats for auth.uid() and target_user_id which are NOT groups)
  select c.id into existing_chat_id
  from chats c
  join chat_participants cp1 on c.id = cp1.chat_id
  join chat_participants cp2 on c.id = cp2.chat_id
  where cp1.user_id = auth.uid()
    and cp2.user_id = target_user_id
    and c.is_group = false
  limit 1;

  if existing_chat_id is not null then
    return existing_chat_id;
  end if;

  -- 2. Create new chat
  insert into chats (is_group, name)
  values (false, null)
  returning id into new_chat_id;

  -- 3. Add participants
  insert into chat_participants (chat_id, user_id, status)
  values 
    (new_chat_id, auth.uid(), 'accepted'),
    (new_chat_id, target_user_id, 'pending'); -- Or accepted, but usually pending until reply

  return new_chat_id;
end;
$$;
