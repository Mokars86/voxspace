-- Add disappearing_duration to chats table
ALTER TABLE chats ADD COLUMN IF NOT EXISTS disappearing_duration INTEGER DEFAULT 0; -- Duration in minutes, 0 = disabled

-- Add fields to messages table for expiration and view once
ALTER TABLE messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS view_once BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_viewed BOOLEAN DEFAULT FALSE;

-- Optional: Function to clean up expired messages (can be run via cron)
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS void AS $$
BEGIN
  UPDATE messages 
  SET is_deleted = TRUE 
  WHERE expires_at IS NOT NULL 
  AND expires_at < NOW() 
  AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;
