-- ============================================================
-- ACCOUNT TYPE: DEMO vs FULL ACCESS   (logic: backend/account.py)
--
--   role = 'admin'                          -> full access
--   is_demo = FALSE                         -> full access
--   active, unexpired subscription          -> full access
--   anything else                           -> demo (4 reports in total)
--
-- Every account (demo or full) only sees its OWN designs,
-- calculations and reports (all queries filter by designs.user_id).
--
-- Safe to run more than once. The app also adds the column itself.
-- ============================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT TRUE;

-- New registrations start as demo accounts.
ALTER TABLE users ALTER COLUMN is_demo SET DEFAULT TRUE;
UPDATE users SET is_demo = TRUE WHERE is_demo IS NULL;
ALTER TABLE users ALTER COLUMN is_demo SET NOT NULL;


-- ------------------------------------------------------------
-- Useful commands
-- ------------------------------------------------------------
-- Give an account full access:
--   UPDATE users SET is_demo = FALSE WHERE username = 'Ansh2708';
--
-- Put an account back on demo:
--   UPDATE users SET is_demo = TRUE WHERE username = 'ansh';
--
-- See every account and its type:
--   SELECT id, username, role, is_demo, demo_reports_used,
--          CASE
--            WHEN role = 'admin' THEN 'admin'
--            WHEN NOT is_demo OR EXISTS (
--                 SELECT 1 FROM subscriptions s
--                 WHERE s.user_id = users.id AND s.status = 'active'
--                   AND (s.end_date IS NULL OR s.end_date > CURRENT_TIMESTAMP))
--            THEN 'full'
--            ELSE 'demo'
--          END AS account_type
--   FROM users ORDER BY id;
