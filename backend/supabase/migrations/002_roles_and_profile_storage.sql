-- Normalize profiles for server-enforced authorization and profile uploads.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE profiles
SET role = CASE WHEN lower(role) IN ('admin', 'administrator') THEN 'admin' ELSE 'standard' END
WHERE role IS NULL OR role NOT IN ('admin', 'standard');

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'standard'));
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'standard';
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);

-- Private by default. Server-side routes should issue signed URLs when needed.
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', false)
ON CONFLICT (id) DO NOTHING;