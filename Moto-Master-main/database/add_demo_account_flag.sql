-- ============================================================
-- DEMO ACCOUNTS ONLY
-- is_demo = TRUE only for accounts created with "Try Free Demo".
-- Those accounts (without an active subscription) can generate
-- 4 design reports in total. Every other account is unlimited.
-- Existing accounts get FALSE = unlimited.
-- The app also adds this column by itself on first use.
-- ============================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;


-- ADMIN: turn a demo account into a full (unlimited) account
-- UPDATE users SET is_demo = FALSE WHERE username = 'their_username';

-- ADMIN: list demo accounts and how many reports they used
-- SELECT id, username, email, phone, demo_reports_used, created_at
-- FROM users WHERE is_demo ORDER BY created_at DESC;
