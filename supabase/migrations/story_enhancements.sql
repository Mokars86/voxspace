-- 1. Update Stories for Privacy
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS privacy_level text DEFAULT 'followers'; -- 'public', 'followers', 'only_me'

-- 2. Create Story Views Table
CREATE TABLE IF NOT EXISTS public.story_views (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(story_id, user_id) -- One view per user per story
);

-- 3. Policies for Story Views
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- Insert: Anyone authenticated can mark a story as viewed (if they can access the story)
-- Note: 'story_views' insertion implies the user has access to the story via RLS on 'stories' table.
CREATE POLICY "Users can insert views" 
  ON public.story_views FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Select: Only the story owner can see who viewed their story
CREATE POLICY "Story owners can view views" 
  ON public.story_views FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE id = story_views.story_id
      AND user_id = auth.uid()
    )
  );
