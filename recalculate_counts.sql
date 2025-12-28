-- RECALCULATE COUNTS
-- This script counts the actual rows in the 'follows' table and updates the profiles.
-- Run this to fix any "out of sync" numbers.

-- 1. Update Followers Count
update public.profiles p
set followers_count = (
  select count(*) 
  from public.follows f 
  where f.following_id = p.id
);

-- 2. Update Following Count
update public.profiles p
set following_count = (
  select count(*) 
  from public.follows f 
  where f.follower_id = p.id
);
