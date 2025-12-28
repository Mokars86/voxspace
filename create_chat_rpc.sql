-- Function to safely create a direct chat between two users
-- This bypasses the RLS "chicken-and-egg" problem by running on the server
create or replace function public.create_direct_chat(other_user_id uuid)
returns uuid
language plpgsql
security definer -- Runs with elevated permissions (to insert into tables)
as $$
declare
  new_chat_id uuid;
  current_user_id uuid;
begin
  -- Get current user
  current_user_id := auth.uid();

  -- 1. Create the Chat
  insert into public.chats (is_group, name)
  values (false, 'Direct Chat')
  returning id into new_chat_id;

  -- 2. Add Current User
  insert into public.chat_participants (chat_id, user_id)
  values (new_chat_id, current_user_id);

  -- 3. Add Other User
  insert into public.chat_participants (chat_id, user_id)
  values (new_chat_id, other_user_id);

  return new_chat_id;
end;
$$;
