-- ============================================================
-- PHONE NUMBER FOR USERS
-- Run once on the existing database (Neon SQL editor or psql).
-- Stored cleaned: digits only, optional leading "+",
-- e.g. "+91 98765-43210" is saved as "+919876543210".
-- Existing users keep phone = NULL until they add it in Profile.
-- ============================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Optional: fast search by phone (not unique, so two
-- accounts may share a number).
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);
