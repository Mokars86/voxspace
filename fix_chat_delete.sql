-- Allow users to delete their own participant row (Leave Chat)
create policy "Users can leave chats"
on public.chat_participants for delete
using ( auth.uid() = user_id );
