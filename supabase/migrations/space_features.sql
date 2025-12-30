-- 1. Update Posts for Space Feed
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS space_id uuid REFERENCES public.spaces(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- 2. Create Space Events Table
CREATE TABLE IF NOT EXISTS public.space_events (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  space_id uuid REFERENCES public.spaces(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  start_time timestamp with time zone NOT NULL,
  location text,
  created_by uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Policies for Space Events
ALTER TABLE public.space_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events viewable by everyone" 
  ON public.space_events FOR SELECT 
  USING (true);

CREATE POLICY "Members can create events" 
  ON public.space_events FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.space_members
      WHERE space_id = space_events.space_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can delete their events" 
  ON public.space_events FOR DELETE 
  USING (auth.uid() = created_by);
