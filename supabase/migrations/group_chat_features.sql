-- 1. Conversation Metadata (Table is 'chats')
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id);

-- 2. Conversation Member Roles (Table is 'chat_participants')
ALTER TABLE public.chat_participants
ADD COLUMN IF NOT EXISTS role text DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member'));

-- 3. Group Polls
CREATE TABLE IF NOT EXISTS public.group_polls (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL, -- [{text: "A", count: 0}, {text: "B", count: 0}]
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_active boolean DEFAULT true
);

-- 4. Group Poll Votes
CREATE TABLE IF NOT EXISTS public.group_poll_votes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  poll_id uuid REFERENCES public.group_polls(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(poll_id, user_id)
);

-- 5. RLS
ALTER TABLE public.group_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view polls" ON public.group_polls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_id = group_polls.chat_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can create polls" ON public.group_polls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_id = group_polls.chat_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can vote" ON public.group_poll_votes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_polls
      JOIN public.chat_participants ON chat_participants.chat_id = group_polls.chat_id
      WHERE group_polls.id = group_poll_votes.poll_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can view votes" ON public.group_poll_votes
  FOR SELECT USING (true);
