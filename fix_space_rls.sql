-- Fix RLS policy for sending messages in spaces
-- This ensures that only members can insert, and they must be the sender.

drop policy if exists "Members can send messages" on public.space_messages;

create policy "Members can send messages" 
on public.space_messages for insert 
with check (
  auth.role() = 'authenticated' AND 
  sender_id = auth.uid() AND
  exists (
    select 1 from public.space_members 
    where space_id = space_messages.space_id 
    and user_id = auth.uid()
  )
);

-- Ensure space_members is readable
drop policy if exists "Everyone can view space members" on public.space_members;
create policy "Everyone can view space members" 
on public.space_members for select 
using (true);
