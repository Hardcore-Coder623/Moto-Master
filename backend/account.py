"""
MOTO MASTER - account type (the ONE place that decides DEMO vs FULL ACCESS)

Every account is exactly one of:

    "admin"  role = 'admin'                      -> full access, no limits
    "full"   users.is_demo = FALSE               -> full access, no limits
             OR an active, unexpired subscription
    "demo"   everything else                     -> DEMO_REPORT_LIMIT reports in total

users.is_demo
    TRUE  = demo account (every new registration starts here)
    FALSE = full-access account (set by admin, or when a payment succeeds
            via grant_full_access()).

DATA OWNERSHIP (same rule for demo AND full-access accounts)
    An account only ever sees / edits / deletes rows it owns:
        designs            WHERE designs.user_id = <account id>
        design_* forms     via designs.user_id
        calculations       via designs.user_id
        reports            via designs.user_id
        subscriptions      WHERE subscriptions.user_id = <account id>
    The account id always comes from the login session, never from the
    request body / URL, so one user can never read another user's data.
    Use owns_design() / owns_report() before touching a row by id.
"""

from functools import wraps

import psycopg2
from flask import jsonify, redirect, request, session, url_for


# ---------------------------------------------------------
# PLAN RULES (change limits here only)
# ---------------------------------------------------------

DEMO_REPORT_LIMIT = 4

ACCOUNT_TYPES = ("admin", "full", "demo")

DEMO_LIMIT_MESSAGE = (
    f"Demo limit reached: you have used all {DEMO_REPORT_LIMIT} demo design reports. "
    "Choose a plan to keep creating designs."
)

ACCOUNT_LABELS = {
    "admin": "Admin",
    "full": "Full Access",
    "demo": "Demo",
}


# ---------------------------------------------------------
# COLUMNS (added automatically the first time they are needed,
# same as database/add_account_type.sql)
# ---------------------------------------------------------

_is_demo_ready = False


def ensure_is_demo_column(cur):
    global _is_demo_ready
    if _is_demo_ready:
        return
    cur.execute(
        """
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_demo'
        """
    )
    if not cur.fetchone():
        # Existing accounts keep their current behaviour (demo unless
        # they have a plan); new registrations are inserted as demo.
        cur.execute(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT TRUE"
        )
    _is_demo_ready = True


def _ensure_columns(cur):
    # demo_reports_used lives in demo.py (it has its own one-time reset).
    from backend import demo
    demo.ensure_demo_column(cur)
    ensure_is_demo_column(cur)


# ---------------------------------------------------------
# MAIN LOGIC
# ---------------------------------------------------------

def get_account(cur, user_id, lock=False):
    """
    One query -> everything the app needs to know about an account:

    {
      "user_id": 1,
      "type": "demo" | "full" | "admin",
      "label": "Demo",
      "full_access": False,
      "demo": True,
      "limit": 4,  "used": 1,  "left": 3      (None/None for full access)
      "subscription_active": False,
    }

    Returns None if the user does not exist.
    lock=True locks the user row until the transaction ends, so two
    reports generated at the same moment cannot both use the last slot.
    """
    _ensure_columns(cur)

    cur.execute(
        """
        SELECT
            u.role,
            COALESCE(u.is_demo, TRUE),
            u.demo_reports_used,
            EXISTS (
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
    if not row:
        return None

    role, is_demo, used, subscription_active = row
    used = used or 0

    if role == "admin":
        account_type = "admin"
    elif not is_demo or subscription_active:
        account_type = "full"
    else:
        account_type = "demo"

    full_access = account_type != "demo"

    return {
        "user_id": user_id,
        "type": account_type,
        "label": ACCOUNT_LABELS[account_type],
        "full_access": full_access,
        "demo": not full_access,
        "limit": None if full_access else DEMO_REPORT_LIMIT,
        "used": used,
        "left": None if full_access else max(0, DEMO_REPORT_LIMIT - used),
        "subscription_active": bool(subscription_active),
    }


def can_generate_report(account):
    """True if this account may create one more design report."""
    if not account:
        return False
    return account["full_access"] or account["left"] > 0


def record_report(cur, account):
    """
    Call after a report is created. Only demo accounts use up a slot.
    Returns the updated demo counters (or None for full access).
    """
    if account["full_access"]:
        return None
    cur.execute(
        "UPDATE users SET demo_reports_used = demo_reports_used + 1 WHERE id = %s",
        (account["user_id"],),
    )
    return {
        "limit": account["limit"],
        "used": account["used"] + 1,
        "left": max(0, account["left"] - 1),
    }


# ---------------------------------------------------------
# CHANGE ACCOUNT TYPE (payment success / admin)
# ---------------------------------------------------------

def grant_full_access(cur, user_id):
    """Demo -> full access (call when a payment is confirmed)."""
    ensure_is_demo_column(cur)
    cur.execute(
        "UPDATE users SET is_demo = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
        (user_id,),
    )
    return cur.rowcount > 0


def make_demo(cur, user_id):
    """Full access -> demo (plan cancelled / refunded)."""
    ensure_is_demo_column(cur)
    cur.execute(
        "UPDATE users SET is_demo = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
        (user_id,),
    )
    return cur.rowcount > 0


# ---------------------------------------------------------
# DATA OWNERSHIP - a row belongs to exactly one account
# ---------------------------------------------------------

def owns_design(cur, user_id, design_id):
    cur.execute(
        "SELECT 1 FROM designs WHERE id = %s AND user_id = %s",
        (design_id, user_id),
    )
    return cur.fetchone() is not None


def owns_report(cur, user_id, report_id):
    cur.execute(
        """
        SELECT 1
        FROM reports r
        JOIN designs d ON d.id = r.design_id
        WHERE r.id = %s AND d.user_id = %s
        """,
        (report_id, user_id),
    )
    return cur.fetchone() is not None


def current_user_id():
    """The logged-in account id. The ONLY source of user_id for data queries."""
    return session.get("user_id")


# ---------------------------------------------------------
# CONNECTION HELPERS (for pages / API)
# ---------------------------------------------------------

def load_account(get_db_connection, user_id):
    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                return get_account(cur, user_id)
    finally:
        conn.close()


def safe_account(get_db_connection, user_id):
    """Like load_account, but never raises (pages still render if the DB hiccups)."""
    try:
        return load_account(get_db_connection, user_id)
    except psycopg2.Error as error:
        print("ACCOUNT LOAD ERROR:", error)
        return None


# ---------------------------------------------------------
# ROUTE DECORATORS
# ---------------------------------------------------------

def _wants_json():
    return request.path.startswith(("/api/", "/design/api/")) or request.is_json


def login_required(view):
    """Any logged-in account (demo or full)."""
    @wraps(view)
    def wrapper(*args, **kwargs):
        if not current_user_id():
            if _wants_json():
                return jsonify({"success": False, "message": "Please log in again."}), 401
            return redirect(url_for("home"))
        return view(*args, **kwargs)
    return wrapper


def full_access_required(get_db_connection):
    """
    Only full-access / admin accounts. Use for paid-only features:

        @design_bp.route("/something")
        @account.full_access_required(get_db_connection)
        def something(): ...
    """
    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            user_id = current_user_id()
            if not user_id:
                return jsonify({"success": False, "message": "Please log in again."}), 401
            acc = safe_account(get_db_connection, user_id)
            if not acc or not acc["full_access"]:
                return jsonify({
                    "success": False,
                    "code": "full_access_required",
                    "message": "This feature needs a full-access plan.",
                }), 403
            return view(*args, **kwargs)
        return wrapper
    return decorator
