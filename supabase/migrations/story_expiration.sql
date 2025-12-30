DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stories' AND column_name = 'expires_at') THEN
        ALTER TABLE stories ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours');
    END IF;
END $$;

-- Update existing stories that might not have it (though default handles new ones)
UPDATE stories SET expires_at = created_at + interval '24 hours' WHERE expires_at IS NULL;
