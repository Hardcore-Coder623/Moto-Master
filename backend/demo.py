"""
MOTO MASTER - demo access

A user without an active subscription is a DEMO user.
A demo user can generate DEMO_REPORT_LIMIT design reports in TOTAL
(1-phase + 2-phase + 3-phase together, not per phase).

The count is kept in users.demo_reports_used and only ever goes up,
so deleting a design or a report does not give a demo user more
reports. Admins and users with an active subscription have no limit.
"""

import psycopg2


DEMO_REPORT_LIMIT = 4

DEMO_LIMIT_MESSAGE = (
    f"Demo limit reached: you have used all {DEMO_REPORT_LIMIT} demo design reports. "
    "Choose a plan to keep creating designs."
)

_column_ready = False


DEMO_COLUMN_VERSION = "demo-v2"


def ensure_demo_column(cur):
    """
    Adds users.demo_reports_used the first time it is needed
    (same change as database/add_demo_limit.sql).

    Every account starts with 0 used: reports made before the demo
    limit existed do not count. A database set up by the first
    version (which counted old reports) is reset to 0 once; the column
    comment marks that this has been done.
    """
    global _column_ready
    if _column_ready:
        return

    cur.execute(
        """
        SELECT col_description('users'::regclass, a.attnum)
        FROM pg_attribute a
        WHERE a.attrelid = 'users'::regclass
          AND a.attname = 'demo_reports_used'
          AND NOT a.attisdropped
        """
    )
    row = cur.fetchone()

    if row is None:
        cur.execute(
            """
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS demo_reports_used INTEGER NOT NULL DEFAULT 0
            """
        )

    if row is None or row[0] != DEMO_COLUMN_VERSION:
        cur.execute("UPDATE users SET demo_reports_used = 0")
        cur.execute(
            f"COMMENT ON COLUMN users.demo_reports_used IS '{DEMO_COLUMN_VERSION}'"
        )
        cur.connection.commit()

    _column_ready = True


def get_access(cur, user_id, lock=False):
    """
    {"demo": bool, "limit": 4, "used": n, "left": n}  - one query.
    Admins and users with an active, unexpired subscription are not demo.
    lock=True locks the user row until the transaction ends, so two
    reports generated at the same moment cannot both use the last slot.
    """
    ensure_demo_column(cur)

    cur.execute(
        """
        SELECT
            u.demo_reports_used,
            u.role = 'admin' OR EXISTS (
                SELECT 1 FROM subscriptions s
                WHERE s.user_id = u.id
                  AND s.status = 'active'
                  AND (s.end_date IS NULL OR s.end_date > CURRENT_TIMESTAMP)
            )
        FROM users u
        WHERE u.id = %s
        """
        + (" FOR UPDATE OF u" if lock else ""),
        (user_id,),
    )
    row = cur.fetchone()
    used, full_access = (row[0], row[1]) if row else (0, False)

    if full_access:
        return {"demo": False, "limit": None, "used": used, "left": None}

    return {
        "demo": True,
        "limit": DEMO_REPORT_LIMIT,
        "used": used,
        "left": max(0, DEMO_REPORT_LIMIT - used),
    }


def record_demo_report(cur, user_id):
    cur.execute(
        "UPDATE users SET demo_reports_used = demo_reports_used + 1 WHERE id = %s",
        (user_id,),
    )


def load_access(get_db_connection, user_id):
    """Access info on its own connection (for pages and the API)."""
    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                return get_access(cur, user_id)
    finally:
        conn.close()


def safe_access(get_db_connection, user_id):
    """Like load_access, but never raises (pages still render if the DB hiccups)."""
    try:
        return load_access(get_db_connection, user_id)
    except psycopg2.Error as error:
        print("DEMO ACCESS ERROR:", error)
        return None
