-- Ultra-robust migration for Advanced Chat Features

-- 1. Alter messages table for Replies, Metadata, and Soft Deletes
alter table public.messages 
add column if not exists reply_to_id uuid references public.messages(id),
add column if not exists metadata jsonb default '{}'::jsonb,
add column if not exists is_deleted boolean default false;

-- 2. Create Message Reactions Table
create table if not exists public.message_reactions (
  id uuid default uuid_generate_v4() primary key,
  message_id uuid references public.messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reaction text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(message_id, user_id, reaction) -- User can mistakenly double-click, but usually we want one of specific type or unique per user per msg? 
  -- Let's allow unique (message_id, user_id) if we want 1 reaction per user per msg, 
  -- OR unique(message_id, user_id, reaction) if they can react with multiple emojis. 
  -- Standard is usually 1 reaction per user, or array. Let's stick to simple: One reaction per user per message for now to simplify UI, or allow toggling.
  -- Actually, let's just make it unique(message_id, user_id) so a user can only have ONE reaction per message.
);

-- Drop unique constraint if it exists differently and recreate strictly
alter table public.message_reactions drop constraint if exists message_reactions_message_id_user_id_key;
alter table public.message_reactions add constraint message_reactions_message_id_user_id_key unique (message_id, user_id);


-- 3. RLS for Message Reactions
alter table public.message_reactions enable row level security;

-- View: Everyone in the chat can view reactions
create policy "Chat participants can view reactions"
  on public.message_reactions for select
  using (
    exists (
      select 1 from public.messages
      join public.chat_participants on messages.chat_id = chat_participants.chat_id
      where messages.id = message_reactions.message_id
      and chat_participants.user_id = auth.uid()
    )
  );

-- Insert: Only chat participants can react
create policy "Chat participants can react"
  on public.message_reactions for insert
  with check (
    exists (
      select 1 from public.messages
      join public.chat_participants on messages.chat_id = chat_participants.chat_id
      where messages.id = message_reactions.message_id
      and chat_participants.user_id = auth.uid()
    )
  );

-- Delete: Users can remove their own reactions
create policy "Users can remove their own reactions"
  on public.message_reactions for delete
  using (auth.uid() = user_id);

-- 4. Storage for Chat Attachments
-- Attempt to create bucket if not exists (Supabase specific)
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

-- Storage Policy: Authenticated users can upload
create policy "Authenticated Users can upload chat attachments"
on storage.objects for insert
with check (
  bucket_id = 'chat-attachments' 
  and auth.role() = 'authenticated'
);

-- Storage Policy: Anyone can view (public bucket) or restrict to authenticated
create policy "Anyone can view chat attachments"
on storage.objects for select
using ( bucket_id = 'chat-attachments' );

-- 5. RPC function to toggle reaction safely
create or replace function public.toggle_reaction(
  p_message_id uuid,
  p_reaction text
) returns void as $$
declare
  v_user_id uuid := auth.uid();
begin
  -- Check if reaction exists
  if exists (
    select 1 from public.message_reactions
    where message_id = p_message_id and user_id = v_user_id
  ) then
    -- If same reaction, remove it (toggle off)
    if exists (
        select 1 from public.message_reactions
        where message_id = p_message_id and user_id = v_user_id and reaction = p_reaction
    ) then
        delete from public.message_reactions
        where message_id = p_message_id and user_id = v_user_id;
    else
        -- If different reaction, update it
        update public.message_reactions
        set reaction = p_reaction, created_at = now()
        where message_id = p_message_id and user_id = v_user_id;
    end if;
  else
    -- Insert new
    insert into public.message_reactions (message_id, user_id, reaction)
    values (p_message_id, v_user_id, p_reaction);
  end if;
end;
$$ language plpgsql security definer;
