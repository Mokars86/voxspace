-- 1. Create a helper function to check membership securely (Bypasses RLS loop)
create or replace function public.is_chat_member(_chat_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from public.chat_participants
    where chat_id = _chat_id
    and user_id = auth.uid()
  );
end;
$$;

-- 2. Drop old policies to avoid conflicts
drop policy if exists "Users can view their chats" on public.chats;
drop policy if exists "Spaces are viewable by everyone" on public.chats; -- cleanup
drop policy if exists "Users can view chats they are in" on public.chat_participants;
drop policy if exists "Users can view all participants in their chats" on public.chat_participants;

-- 3. Apply NEW robust policies using the function

-- Chats: View if I am a member
create policy "Users can view their chats"
on public.chats for select
using ( public.is_chat_member(id) );

-- Participants: View ALL participants if I am a member of the chat
create policy "Users can view participants of their chats"
on public.chat_participants for select
using ( public.is_chat_member(chat_id) );

-- Messages: View if I am a member of the chat
create policy "Users can view messages in their chats"
on public.messages for select
using ( public.is_chat_member(chat_id) );
