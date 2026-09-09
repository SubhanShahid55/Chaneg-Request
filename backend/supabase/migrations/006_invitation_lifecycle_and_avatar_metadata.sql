ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS invitation_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS avatar_path text,
  ADD COLUMN IF NOT EXISTS avatar_mime_type text,
  ADD COLUMN IF NOT EXISTS avatar_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS avatar_updated_at timestamptz;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('invited', 'active', 'deactivated'));

UPDATE profiles
SET status = CASE WHEN is_active THEN 'active' ELSE 'deactivated' END,
    onboarding_completed = true
WHERE status IS NULL OR status NOT IN ('invited', 'active', 'deactivated');

CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);