-- 1. Add Poll Options to Stories
ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS poll_options jsonb; -- [{text: "Option A", count: 0}, ...]

-- 2. Create Story Votes Table
CREATE TABLE IF NOT EXISTS public.story_votes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(story_id, user_id) -- One vote per user per story
);

-- 3. RLS for Votes
ALTER TABLE public.story_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can vote" ON public.story_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Everyone can view votes" ON public.story_votes
  FOR SELECT USING (true);

-- 4. Note: We will handle 'type' column constraints loosely or via check constraint if strict.
-- Current constraint might be text check. Let's update it if it exists or assume text is flexible.
-- Verify if 'type' has a check constraint. If so, drop and re-add.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stories_type_check') THEN
    ALTER TABLE public.stories DROP CONSTRAINT stories_type_check;
    ALTER TABLE public.stories ADD CONSTRAINT stories_type_check CHECK (type IN ('image', 'text', 'video', 'voice', 'poll'));
  END IF;
END $$;
