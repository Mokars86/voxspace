-- Add is_archived column to chat_participants
alter table public.chat_participants 
add column if not exists is_archived boolean default false;

-- Add updated_at to chats to track edits
alter table public.chats 
add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- Allow users to update chats they are part of (for editing name)
create policy "Users can update chats they are in"
on public.chats for update
using (
  exists (
    select 1 from public.chat_participants
    where chat_participants.chat_id = chats.id
    and chat_participants.user_id = auth.uid()
  )
);
