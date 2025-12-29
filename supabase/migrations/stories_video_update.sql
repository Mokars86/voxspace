-- Drop the existing check constraint
alter table public.stories drop constraint if exists stories_type_check;

-- Add the new check constraint including 'video'
alter table public.stories add constraint stories_type_check 
  check (type in ('image', 'text', 'video'));
