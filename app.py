
from flask import Flask, render_template
from backend.auth import auth_bp
from backend.dashboard import dashboard_bp
from backend.design import design_bp
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


# =========================================================
# REGISTER BLUEPRINTS
# =========================================================

app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(design_bp)


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
    app.run(
        debug=True
    )

