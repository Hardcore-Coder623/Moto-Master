-- ============================================================
-- ONE ACTIVE LOGIN PER ACCOUNT
-- Every login stores a new random token here. A browser whose
-- token no longer matches is logged out, so an account cannot
-- be used on two devices at the same time (no password sharing).
-- The app also adds this column by itself on first use.
-- ============================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS session_token VARCHAR(64);
