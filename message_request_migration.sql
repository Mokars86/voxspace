-- MESSAGE REQUESTS SYSTEM MIGRATION

-- 1. Add status column to chat_participants
alter table public.chat_participants 
add column if not exists status text default 'accepted' 
check (status in ('accepted', 'pending', 'rejected', 'blocked'));

-- 2. Update create_direct_chat RPC to set initial status
create or replace function public.create_direct_chat(other_user_id uuid)
returns uuid as $$
declare
  new_chat_id uuid;
  existing_chat_id uuid;
begin
  -- Check if a direct chat already exists between these two users
  select c.id into existing_chat_id
  from public.chats c
  join public.chat_participants cp1 on c.id = cp1.chat_id
  join public.chat_participants cp2 on c.id = cp2.chat_id
  where c.is_group = false
  and cp1.user_id = auth.uid()
  and cp2.user_id = other_user_id;

  if existing_chat_id is not null then
    return existing_chat_id;
  end if;

  -- Create new chat
  insert into public.chats (is_group)
  values (false)
  returning id into new_chat_id;

  -- Add current user (Creator -> Status: 'accepted')
  insert into public.chat_participants (chat_id, user_id, status)
  values (new_chat_id, auth.uid(), 'accepted');

  -- Add other user (Recipient -> Status: 'pending')
  insert into public.chat_participants (chat_id, user_id, status)
  values (new_chat_id, other_user_id, 'pending');

  return new_chat_id;
end;
$$ language plpgsql security definer;
