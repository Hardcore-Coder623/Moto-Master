"""
MOTO MASTER - user profile

GET  /profile               profile page (loaded into the dashboard)
POST /api/profile           update name / username / email / phone
POST /api/profile/password  change password
"""

import os
import re

import psycopg2
import psycopg2.extras
from flask import Blueprint, jsonify, render_template, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from backend.auth import clean_phone, ensure_phone_column


profile_bp = Blueprint("profile", __name__)


USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,50}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))


def _error(message, status=400):
    return jsonify({"success": False, "message": message}), status


def _load_user(user_id):
    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                ensure_phone_column(cur)
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    u.id, u.name, u.username, u.email, u.phone, u.role, u.created_at,
                    (SELECT COUNT(*) FROM designs d WHERE d.user_id = u.id) AS design_count,
                    (SELECT COUNT(*) FROM reports r JOIN designs d ON d.id = r.design_id
                      WHERE d.user_id = u.id) AS report_count
                FROM users u
                WHERE u.id = %s
                """,
                (user_id,),
            )
            return cur.fetchone()
    finally:
        conn.close()


@profile_bp.route("/profile", methods=["GET"])
def profile_page():

    if "user_id" not in session:
        return "", 401

    try:
        user = _load_user(session["user_id"])
    except Exception as error:
        print("PROFILE LOAD ERROR:", error)
        user = None

    if not user:
        return render_template("user/profile.html", user=None, error="Could not load your profile.")

    return render_template("user/profile.html", user=user, error=None)


@profile_bp.route("/api/profile", methods=["POST"])
def update_profile():

    if "user_id" not in session:
        return _error("Please log in again.", 401)

    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    username = str(data.get("username", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    phone_raw = str(data.get("phone", "")).strip()

    if not name or not username or not email or not phone_raw:
        return _error("Name, username, email and phone number are required.")

    phone = clean_phone(phone_raw)
    if not phone:
        return _error("Enter a valid phone number (10 to 15 digits, + country code allowed).")

    if len(name) > 100:
        return _error("Name must be 100 characters or fewer.")

    if not USERNAME_RE.match(username):
        return _error("Username must be 3–50 characters: letters, numbers, dot, dash or underscore.")

    if len(email) > 150 or not EMAIL_RE.match(email):
        return _error("Enter a valid email address.")

    user_id = session["user_id"]

    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:

                cur.execute(
                    """
                    SELECT username, email FROM users
                    WHERE (username = %s OR email = %s) AND id <> %s
                    LIMIT 1
                    """,
                    (username, email, user_id),
                )
                taken = cur.fetchone()

                if taken:
                    if taken[0] == username:
                        return _error("That username is already taken.", 409)
                    return _error("That email is already used by another account.", 409)

                ensure_phone_column(cur)

                cur.execute(
                    "UPDATE users SET name = %s, username = %s, email = %s, phone = %s WHERE id = %s",
                    (name, username, email, phone, user_id),
                )

    except psycopg2.Error as error:
        print("PROFILE UPDATE ERROR:", error)
        return _error("Could not save your profile.", 500)
    finally:
        conn.close()

    session["name"] = name
    session["username"] = username
    session["email"] = email

    return jsonify({
        "success": True,
        "message": "Profile saved.",
        "user": {"name": name, "username": username, "email": email, "phone": phone},
    })


@profile_bp.route("/api/profile/password", methods=["POST"])
def change_password():

    if "user_id" not in session:
        return _error("Please log in again.", 401)

    data = request.get_json(silent=True) or {}

    current = data.get("current_password", "")
    new = data.get("new_password", "")
    confirm = data.get("confirm_password", "")

    if not current or not new or not confirm:
        return _error("Fill in all three password fields.")

    if new != confirm:
        return _error("The new passwords do not match.")

    if len(new) < 8:
        return _error("New password must be at least 8 characters.")

    if new == current:
        return _error("The new password must be different from the current one.")

    user_id = session["user_id"]

    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:

                cur.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
                row = cur.fetchone()

                if not row or not check_password_hash(row[0], current):
                    return _error("Current password is incorrect.", 403)

                cur.execute(
                    "UPDATE users SET password_hash = %s WHERE id = %s",
                    (generate_password_hash(new), user_id),
                )

    except psycopg2.Error as error:
        print("PASSWORD CHANGE ERROR:", error)
        return _error("Could not change your password.", 500)
    finally:
        conn.close()

    return jsonify({"success": True, "message": "Password changed."})
