-- Add repost support to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS repost_of uuid REFERENCES public.posts(id) ON DELETE SET NULL;

-- Trigger to increment reposts_count
CREATE OR REPLACE FUNCTION public.handle_new_repost()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.repost_of IS NOT NULL THEN
    UPDATE public.posts
    SET reposts_count = reposts_count + 1
    WHERE id = NEW.repost_of;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_repost_created ON public.posts;
CREATE TRIGGER on_repost_created
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_repost();

-- Trigger to decrement reposts_count
CREATE OR REPLACE FUNCTION public.handle_deleted_repost()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.repost_of IS NOT NULL THEN
    UPDATE public.posts
    SET reposts_count = reposts_count - 1
    WHERE id = OLD.repost_of;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_repost_deleted ON public.posts;
CREATE TRIGGER on_repost_deleted
  AFTER DELETE ON public.posts
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_deleted_repost();
