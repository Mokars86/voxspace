-- Add FCM Token column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS fcm_token text;

-- Allow users to update their own fcm_token (covered by existing policy, but good to double check)
-- Existing policy: "Users can update their own profile." using (auth.uid() = id); -> This is sufficient.
