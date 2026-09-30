"""
MOTO MASTER - one active login per account

Stops a paid account being shared: every login creates a new
random token, saved in users.session_token AND in the browser's
login cookie. A request whose token no longer matches the database
(because the account logged in somewhere else) is logged out.

So if user 1 gives their password to user 2, each login throws the
other one out - the account cannot be used on two devices at once.

To keep pages fast (the database is remote), the check runs at most
once every CHECK_EVERY seconds per browser, but ALWAYS on the actions
that matter: saving a design and generating a report.
"""

import secrets
import time

import psycopg2
from flask import jsonify, redirect, request, session


CHECK_EVERY = 30  # seconds

# Always checked, no matter how recently the last check ran.
ALWAYS_CHECK = ("/design/api/save", "/design/report", "/dashboard")

# Never checked (public pages, files, logging in / out).
SKIP_PREFIXES = ("/static/", "/api/auth/")

REPLACED_MESSAGE = (
    "You were logged out because this account was logged in on another device. "
    "Each account can be used on one device at a time."
)

_column_ready = False


def ensure_session_column(cursor):
    """Adds users.session_token the first time it is needed (database/add_single_session.sql)."""
    global _column_ready
    if _column_ready:
        return
    cursor.execute(
        """
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'session_token'
        """
    )
    if not cursor.fetchone():
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token VARCHAR(64)")
    _column_ready = True


def start_session(cursor, user_id):
    """
    Call on login / register, inside the same transaction, after
    session["user_id"] is set. Any other device is logged out.
    """
    ensure_session_column(cursor)
    token = secrets.token_hex(32)
    cursor.execute(
        "UPDATE users SET session_token = %s WHERE id = %s",
        (token, user_id),
    )
    session["session_token"] = token
    session["session_checked_at"] = time.time()


def _needs_check():
    path = request.path
    if path == "/" or path.startswith(SKIP_PREFIXES):
        return False
    if path.startswith(ALWAYS_CHECK):
        return True
    return time.time() - session.get("session_checked_at", 0) > CHECK_EVERY


def _replaced_response():
    session.clear()

    wants_page = (
        request.method == "GET"
        and request.path == "/dashboard"
    )
    if wants_page:
        return redirect("/?reason=other_device")

    response = jsonify({
        "success": False,
        "code": "session_replaced",
        "message": REPLACED_MESSAGE,
    })
    response.status_code = 401
    response.headers["X-Session-Replaced"] = "1"
    return response


def check_session(get_db_connection):
    """before_request hook. Returns a response to stop the request, or None."""

    user_id = session.get("user_id")
    if not user_id or not _needs_check():
        return None

    try:
        conn = get_db_connection()
        try:
            with conn:
                with conn.cursor() as cur:
                    ensure_session_column(cur)
                    cur.execute("SELECT session_token FROM users WHERE id = %s", (user_id,))
                    row = cur.fetchone()

                    if not row:
                        session.clear()
                        return _replaced_response()

                    current = row[0]
                    mine = session.get("session_token")

                    if current is None:
                        # First login check after this feature was added:
                        # this browser becomes the account's one device.
                        start_session(cur, user_id)
                        return None

                    if not mine or not secrets.compare_digest(current, mine):
                        return _replaced_response()
        finally:
            conn.close()
    except psycopg2.Error as error:
        # Database hiccup: don't lock people out, try again next request.
        print("SESSION CHECK ERROR:", error)
        return None

    session["session_checked_at"] = time.time()
    return None
