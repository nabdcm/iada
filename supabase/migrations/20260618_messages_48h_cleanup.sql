-- Migration: clinic_messages expires_at + auto-cleanup trigger
-- Date: 2026-06-18

-- 1. Add expires_at if not exists
ALTER TABLE clinic_messages 
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours');

-- 2. Backfill existing rows that have default value
UPDATE clinic_messages 
SET expires_at = created_at + interval '48 hours'
WHERE expires_at > now() + interval '47 hours 55 minutes';

-- 3. Cleanup function triggered on every INSERT
CREATE OR REPLACE FUNCTION cleanup_expired_messages_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM clinic_messages WHERE expires_at < now();
  RETURN NEW;
END;
$$;

-- 4. Attach trigger
DROP TRIGGER IF EXISTS trg_cleanup_expired_messages ON clinic_messages;
CREATE TRIGGER trg_cleanup_expired_messages
  AFTER INSERT ON clinic_messages
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_expired_messages_trigger();
