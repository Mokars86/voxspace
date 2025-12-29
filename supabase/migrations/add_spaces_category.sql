-- Add category column to spaces
alter table public.spaces 
add column if not exists category text default 'General';

-- Update existing spaces with random categories for demo
update public.spaces set category = 'Tech' where name ilike '%tech%' or name ilike '%ai%' or name ilike '%code%';
update public.spaces set category = 'Music' where name ilike '%music%' or description ilike '%song%';
update public.spaces set category = 'Crypto' where name ilike '%crypto%' or name ilike '%btc%';
