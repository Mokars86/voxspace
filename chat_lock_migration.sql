-- Add Chat Lock Columns

-- 1. Add is_locked to chat_participants
ALTER TABLE public.chat_participants 
ADD COLUMN IF NOT EXISTS is_locked boolean default false;

-- 2. Add chat_lock_pin to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS chat_lock_pin text;

-- 3. Policy updates (if needed) - Existing policies should cover update/select
-- Users can already update their own participant rows and profile
