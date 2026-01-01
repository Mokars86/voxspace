-- Create call_logs table
create table if not exists public.call_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  chat_id uuid references public.chats(id) not null,
  caller_id uuid references public.profiles(id) not null,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ended_at timestamp with time zone,
  status text check (status in ('completed', 'missed', 'rejected', 'busy')) default 'missed',
  duration int default 0
);

-- RLS Policies
alter table public.call_logs enable row level security;

create policy "Users can view call logs for their chats"
  on public.call_logs for select
  using (
    exists (
      select 1 from public.chat_participants
      where chat_participants.chat_id = call_logs.chat_id
      and chat_participants.user_id = auth.uid()
    )
  );

create policy "Users can insert call logs"
  on public.call_logs for insert
  with check (auth.uid() = caller_id);

create policy "Users can update their own call logs"
  on public.call_logs for update
  using (
    exists (
      select 1 from public.chat_participants
      where chat_participants.chat_id = call_logs.chat_id
      and chat_participants.user_id = auth.uid()
    )
  );
