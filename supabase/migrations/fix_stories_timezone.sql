-- Ensure stories are created with correct timestamps
alter table public.stories 
alter column created_at set default (now() at time zone 'utc'),
alter column expires_at set default ((now() at time zone 'utc') + interval '24 hours');
