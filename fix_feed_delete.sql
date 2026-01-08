-- FIX FEED INTERACTION ISSUES
-- Run this entire script in your Supabase SQL Editor

-- 1. Ensure 'is_pinned' exists on posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS is_pinned boolean default false;

-- 2. Ensure 'parent_id' exists on comments
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS parent_id uuid references public.comments(id);

-- 3. Update post_likes foreign key to CASCADE delete
-- (Allows deleting a post even if it has likes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'post_likes_post_id_fkey') THEN
    ALTER TABLE public.post_likes DROP CONSTRAINT post_likes_post_id_fkey;
  END IF;
END $$;

ALTER TABLE public.post_likes
ADD CONSTRAINT post_likes_post_id_fkey
FOREIGN KEY (post_id)
REFERENCES public.posts(id)
ON DELETE CASCADE;

-- 4. Update comments foreign key to CASCADE delete (for post_id)
-- (Allows deleting a post even if it has comments)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'comments_post_id_fkey') THEN
    ALTER TABLE public.comments DROP CONSTRAINT comments_post_id_fkey;
  END IF;
END $$;

ALTER TABLE public.comments
ADD CONSTRAINT comments_post_id_fkey
FOREIGN KEY (post_id)
REFERENCES public.posts(id)
ON DELETE CASCADE;

-- 5. Update comments foreign key to CASCADE delete (for parent_id)
-- (Allows deleting a comment even if it has replies)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'comments_parent_id_fkey') THEN
    ALTER TABLE public.comments DROP CONSTRAINT comments_parent_id_fkey;
  END IF;
END $$;

ALTER TABLE public.comments
ADD CONSTRAINT comments_parent_id_fkey
FOREIGN KEY (parent_id)
REFERENCES public.comments(id)
ON DELETE CASCADE;

-- 6. Add 'repost_of' cascade if needed (Optional but recommended)
-- Remove the old constraint if it exists (name might vary, standard is posts_repost_of_fkey)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'posts_repost_of_fkey') THEN
    ALTER TABLE public.posts DROP CONSTRAINT posts_repost_of_fkey;
  END IF;
END $$;

-- If column exists, add constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'repost_of') THEN
      ALTER TABLE public.posts
      ADD CONSTRAINT posts_repost_of_fkey
      FOREIGN KEY (repost_of)
      REFERENCES public.posts(id)
      ON DELETE SET NULL; -- Or CASCADE if you want reposts to disappear
  END IF;
END $$;

-- 7. Add Update Policy for Pinned Posts if not exists (already covered by "update own posts" usually, but good to verify)
-- Existing policy "Users can update own posts." should cover it.
