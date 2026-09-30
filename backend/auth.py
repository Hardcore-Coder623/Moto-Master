
import os
import re
import psycopg2

from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

from backend import single_session

load_dotenv()

auth_bp = Blueprint("auth", __name__)


# Phone: optional "+" country code, then 10-15 digits.
# Spaces, dashes, dots and brackets are removed before checking.
PHONE_RE = re.compile(r"^\+?[0-9]{10,15}$")


def clean_phone(raw):
    """'+91 98765-43210' -> '+919876543210', or None if not valid."""
    phone = re.sub(r"[\s\-().]", "", str(raw or ""))
    return phone if PHONE_RE.match(phone) else None


_phone_column_ready = False


def ensure_phone_column(cursor):
    """
    Adds users.phone the first time it is needed
    (same as database/add_user_phone.sql), so registration
    keeps working even if that SQL was not run yet.
    """
    global _phone_column_ready
    if _phone_column_ready:
        return
    cursor.execute(
        """
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'phone'
        """
    )
    if not cursor.fetchone():
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)")
    _phone_column_ready = True


def get_db_connection():
    return psycopg2.connect(
        os.getenv("DATABASE_URL")
    )


# =========================================================
# REGISTER
# =========================================================

@auth_bp.route("/api/auth/register", methods=["POST"])
def register():

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Invalid request."
        }), 400

    name = data.get("name", "").strip()
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    phone_raw = str(data.get("phone", "")).strip()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")

    # -----------------------------------------------------
    # VALIDATION
    # -----------------------------------------------------

    if not name or not username or not email or not password:
        return jsonify({
            "success": False,
            "message": "All fields are required."
        }), 400

    if not phone_raw:
        return jsonify({
            "success": False,
            "message": "Phone number is required."
        }), 400

    phone = clean_phone(phone_raw)

    if not phone:
        return jsonify({
            "success": False,
            "message": "Enter a valid phone number (10 to 15 digits, + country code allowed)."
        }), 400

    if password != confirm_password:
        return jsonify({
            "success": False,
            "message": "Passwords do not match."
        }), 400

    if len(password) < 8:
        return jsonify({
            "success": False,
            "message": "Password must be at least 8 characters."
        }), 400

    # -----------------------------------------------------
    # DATABASE
    # -----------------------------------------------------

    conn = None
    cursor = None

    try:

        conn = get_db_connection()
        cursor = conn.cursor()

        ensure_phone_column(cursor)

        # Check username/email
        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE username = %s
               OR email = %s
            LIMIT 1
            """,
            (username, email)
        )

        existing_user = cursor.fetchone()

        if existing_user:
            return jsonify({
                "success": False,
                "message": "Username or email already exists."
            }), 409

        # -------------------------------------------------
        # HASH PASSWORD
        # -------------------------------------------------

        password_hash = generate_password_hash(password)

        # -------------------------------------------------
        # INSERT USER
        # -------------------------------------------------

        cursor.execute(
            """
            INSERT INTO users
            (
                name,
                username,
                email,
                phone,
                password_hash,
                role
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                name,
                username,
                email,
                phone,
                password_hash,
                "user"
            )
        )

        user_id = cursor.fetchone()[0]

        # Log the new user in straight away (no second login step).
        # One active login per account (backend/single_session.py).
        session.clear()
        single_session.start_session(cursor, user_id)

        conn.commit()

        session["user_id"] = user_id
        session["name"] = name
        session["username"] = username
        session["email"] = email
        session["role"] = "user"

        return jsonify({
            "success": True,
            "message": "Account created successfully.",
            "user_id": user_id,
            "logged_in": True
        }), 201

    except Exception as e:

        if conn:
            conn.rollback()

        print("REGISTER ERROR:", e)

        return jsonify({
            "success": False,
            "message": "Registration failed."
        }), 500

    finally:

        if cursor:
            cursor.close()

        if conn:
            conn.close()


# =========================================================
# LOGIN
# =========================================================

@auth_bp.route("/api/auth/login", methods=["POST"])
def login():

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Invalid request."
        }), 400

    login_value = data.get("login", "").strip()
    password = data.get("password", "")

    if not login_value or not password:
        return jsonify({
            "success": False,
            "message": "Username/email and password are required."
        }), 400

    conn = None
    cursor = None

    try:

        conn = get_db_connection()
        cursor = conn.cursor()

        # -------------------------------------------------
        # FIND USER
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                name,
                username,
                email,
                password_hash,
                role
            FROM users
            WHERE username = %s
               OR email = %s
            LIMIT 1
            """,
            (login_value, login_value.lower())
        )

        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "Invalid username/email or password."
            }), 401

        (
            user_id,
            name,
            username,
            email,
            password_hash,
            role
        ) = user

        # -------------------------------------------------
        # VERIFY PASSWORD
        # -------------------------------------------------

        if not check_password_hash(password_hash, password):

            return jsonify({
                "success": False,
                "message": "Invalid username/email or password."
            }), 401

        # -------------------------------------------------
        # FLASK SESSION
        # -------------------------------------------------

        session.clear()

        # New login token: any other device using this
        # account is logged out on its next request.
        single_session.start_session(cursor, user_id)
        conn.commit()

        session["user_id"] = user_id
        session["name"] = name
        session["username"] = username
        session["email"] = email
        session["role"] = role

        return jsonify({
            "success": True,
            "message": "Login successful.",
            "user": {
                "id": user_id,
                "name": name,
                "username": username,
                "email": email,
                "role": role
            }
        }), 200

    except Exception as e:

        print("LOGIN ERROR:", e)

        return jsonify({
            "success": False,
            "message": "Login failed."
        }), 500

    finally:

        if cursor:
            cursor.close()

        if conn:
            conn.close()


# =========================================================
# LOGOUT
# =========================================================

@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    }), 200

