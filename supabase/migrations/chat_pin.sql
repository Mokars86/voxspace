-- Add is_pinned column to chat_participants table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'chat_participants'
        AND column_name = 'is_pinned'
    ) THEN
        ALTER TABLE "public"."chat_participants"
        ADD COLUMN "is_pinned" boolean DEFAULT false;
    END IF;
END $$;
