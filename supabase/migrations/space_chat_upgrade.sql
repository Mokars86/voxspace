-- Upgrade Space Messages for Rich Media

-- 1. Add new columns
alter table public.space_messages
add column if not exists type text default 'text',
add column if not exists media_url text,
add column if not exists metadata jsonb default '{}'::jsonb,
add column if not exists reply_to_id uuid references public.space_messages(id),
add column if not exists is_deleted boolean default false;

-- 2. Constraints (Optional but good)
alter table public.space_messages 
drop constraint if exists space_messages_type_check;

alter table public.space_messages
add constraint space_messages_type_check 
check (type in ('text', 'image', 'video', 'voice', 'audio', 'file', 'location', 'buzz'));
