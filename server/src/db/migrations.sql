-- ============================================
-- Migrations (safe to re-run)
-- ============================================

-- Auto-promote @noiz.ai users to admin (safe to re-run)
UPDATE users SET role = 'admin' WHERE email LIKE '%@noiz.ai' AND role = 'user';

-- Allow assigned_voice_id to store system voice names (e.g. "Charon") in addition to UUIDs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'episode_characters' 
    AND column_name = 'assigned_voice_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE episode_characters ALTER COLUMN assigned_voice_id TYPE VARCHAR(255);
  END IF;
END $$;

-- Add feedback tables if they don't exist
DO $$
BEGIN
  -- Create ticket_status enum if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
  END IF;

  -- Create ticket_priority enum if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
    CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high');
  END IF;

  -- Create feedback_tickets table if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback_tickets') THEN
    CREATE TABLE feedback_tickets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject VARCHAR(500) NOT NULL,
      status ticket_status NOT NULL DEFAULT 'open',
      priority ticket_priority NOT NULL DEFAULT 'medium',
      category VARCHAR(100),
      assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
      closed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_feedback_tickets_user_id ON feedback_tickets(user_id);
    CREATE INDEX idx_feedback_tickets_status ON feedback_tickets(status);
    CREATE INDEX idx_feedback_tickets_assigned ON feedback_tickets(assigned_admin_id);
    CREATE INDEX idx_feedback_tickets_created_at ON feedback_tickets(created_at DESC);

    CREATE TRIGGER update_feedback_tickets_updated_at
      BEFORE UPDATE ON feedback_tickets
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Create feedback_messages table if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback_messages') THEN
    CREATE TABLE feedback_messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      ticket_id UUID NOT NULL REFERENCES feedback_tickets(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_admin_reply BOOLEAN NOT NULL DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_feedback_messages_ticket_id ON feedback_messages(ticket_id);
    CREATE INDEX idx_feedback_messages_created_at ON feedback_messages(created_at);
  END IF;
END $$;
