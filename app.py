
from flask import Flask, render_template, request, jsonify
from urllib.parse import urlparse
from backend.auth import auth_bp
from backend.dashboard import dashboard_bp
from backend.design import design_bp
from backend.profile import profile_bp
from backend import single_session
from backend.auth import get_db_connection
import os


app = Flask(__name__)


# =========================================================
# FLASK SESSION CONFIGURATION
# =========================================================

app.secret_key = os.getenv("FLASK_SECRET_KEY")

if not app.secret_key:
    raise RuntimeError(
        "FLASK_SECRET_KEY is missing from .env"
    )


# Login cookie: not readable by JavaScript, not sent on
# requests started by other websites (SameSite=Lax).
# Set SESSION_COOKIE_SECURE=1 in .env when the site runs on https.

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.getenv("SESSION_COOKIE_SECURE", "0") == "1",
)


# =========================================================
# CSRF PROTECTION
#
# Every request that changes data (POST / PUT / PATCH / DELETE)
# must come from this site's own pages. Browsers always send an
# Origin (or Referer) header on these requests, so a form or
# script on another website is rejected.
# =========================================================

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _same_site(url):
    if not url:
        return False
    parsed = urlparse(url)
    return parsed.netloc == request.host


@app.before_request
def csrf_protect():

    if request.method not in UNSAFE_METHODS:
        return None

    origin = request.headers.get("Origin")
    referer = request.headers.get("Referer")

    if origin and origin != "null":
        allowed = _same_site(origin)
    else:
        allowed = _same_site(referer)

    if allowed:
        return None

    return jsonify({
        "success": False,
        "message": "Request blocked for security. Reload the page and try again."
    }), 403


# =========================================================
# ONE ACTIVE LOGIN PER ACCOUNT
# Logging in on another device logs this one out, so a
# paid account cannot be shared (backend/single_session.py).
# =========================================================

@app.before_request
def one_login_per_account():
    return single_session.check_session(get_db_connection)


# =========================================================
# REGISTER BLUEPRINTS
# =========================================================

app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(design_bp)
app.register_blueprint(profile_bp)


# =========================================================
# HOME PAGE
# =========================================================

@app.route("/")
def home():
    return render_template(
        "index.html"
    )


# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":
    # Debug mode only when FLASK_DEBUG=1 is set (never on a live server).
    app.run(
        debug=os.getenv("FLASK_DEBUG", "0") == "1"
    )

