-- ============================================================
-- DEMO LIMIT
-- A user without an active subscription can generate 4 design
-- reports in TOTAL (all phases together). The count only goes up,
-- so deleting designs or reports does not reset it.
-- Every account starts at 0 (reports made before this don't count).
--
-- The app also does this by itself on first use (backend/demo.py);
-- running this file first is optional.
-- ============================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS demo_reports_used INTEGER NOT NULL DEFAULT 0;

UPDATE users SET demo_reports_used = 0;

COMMENT ON COLUMN users.demo_reports_used IS 'demo-v2';


-- To give one account a fresh 4 demo reports again:
--   UPDATE users SET demo_reports_used = 0 WHERE username = 'their_username';
