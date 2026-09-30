from flask import Blueprint, render_template, redirect, url_for, session, request, Response, jsonify
from datetime import datetime

from backend import design_store, demo
from backend.design_store import DesignError, DemoLimitError

design_bp = Blueprint(
    "design",
    __name__,
    url_prefix="/design"
)


@design_bp.route("/")
def design_index():

    if "user_id" not in session:
        return redirect(url_for("home"))

    access = demo.safe_access(design_store.get_db_connection, session["user_id"])
    return render_template("user/design/index.html", access=access)


@design_bp.route("/content")
def design_content():

    if "user_id" not in session:
        return "", 401

    access = demo.safe_access(design_store.get_db_connection, session["user_id"])
    return render_template("user/design/index.html", access=access)


@design_bp.route("/api/access", methods=["GET"])
def api_access():
    """Demo status: {"demo": true, "limit": 4, "used": 1, "left": 3}"""

    if "user_id" not in session:
        return _json_error("Please log in again.", 401)

    try:
        access = demo.load_access(design_store.get_db_connection, session["user_id"])
    except Exception as error:
        print("DEMO ACCESS ERROR:", error)
        return _json_error("Could not check your plan.", 500)

    return jsonify({"success": True, **access})


@design_bp.route("/form/<phase>/<form_name>")
def design_form(phase, form_name):

    if "user_id" not in session:
        return "", 401

    allowed_phases = ["1_phase", "2_phase", "3_phase"]
    allowed_forms  = [
        "main_data",
        "stamping_parameter",
        "rotor_parameter",
        "winding_parameter"
    ]

    if phase not in allowed_phases:
        return "Invalid phase", 400

    if form_name not in allowed_forms:
        return "Invalid form", 400

    return render_template(f"user/design/{phase}/{form_name}.html")


# ─────────────────────────────────────────────────────────────
# REPORT  –  POST /design/report
# Receives JSON from design.js collectDesignData() and renders
# the correct report template:
#   • 3_phase  → report.html   (templates/landing/report.html)
#   • 1_phase / 2_phase → report1.html
# ─────────────────────────────────────────────────────────────
@design_bp.route("/report", methods=["POST"])
def design_report():

    if "user_id" not in session:
        return "Unauthorized", 401

    data = request.get_json(force=True, silent=True) or {}

    # Demo users only get a report right after a successful save used
    # one of their demo reports (the save leaves a one-time ticket).
    ticket = session.pop("report_ticket", None)
    if not ticket:
        try:
            access = demo.load_access(design_store.get_db_connection, session["user_id"])
        except Exception as error:
            print("DEMO ACCESS ERROR:", error)
            return "Could not check your plan. Please try again.", 500
        if access["demo"]:
            return demo.DEMO_LIMIT_MESSAGE, 403

    return Response(build_report_html(data), mimetype="text/html")


def build_report_html(data):
    """Render report.html (3-phase) or report1.html (1/2-phase) from design data."""

    phase   = data.get("phase", "3_phase")
    md      = data.get("main_data",    {})
    sd      = data.get("stamping_data", {})
    rd      = data.get("rotor_data",   {})
    wd      = data.get("winding_data", {})

    def pick(*keys, default="N/A"):
        for key in keys:
            if key in wd and wd[key] not in (None, "", "N/A"):
                return wd[key]
        return default

    current_date = datetime.now().strftime("%d/%m/%Y")

    # ── 3-PHASE report ────────────────────────────────────────
    if phase == "3_phase":

        # Build objects that match report.html template variables
        main_data = {
            "design_no":   md.get("design_no",   "—"),
            "design_name": md.get("design_name", "—"),
            "date":        md.get("design_date", current_date) or current_date,
            "voltage":     md.get("voltage",   ""),
            "power":       md.get("power",     ""),
            "hp":          md.get("hp",        ""),
            "frequency":   md.get("frequency", ""),
            "connection":  md.get("connection",""),
            "rpm":         md.get("rpm",       ""),
            "pole":        md.get("pole",      ""),
        }

        stamping_data = {
            "stamping_material": sd.get("stamping_material", "N/A"),
            "d0":  sd.get("d0",  "N/A"),
            "dia": sd.get("dia", "N/A"),
            "N":   sd.get("N",   "N/A"),
            "material": sd.get("material", "N/A"),
        }

        rotor_data = {
            "rng_wt": rd.get("rng_wt", "N/A"),
            "rng_ht": rd.get("rng_ht", "N/A"),
        }

        winding_data = {
            "statorwt":           pick("statorwt"),
            "rotorwt":            pick("rotorwt"),
            "final_stack_length": pick("final_stack_length"),
            "actual_use_dia":     pick("actual_use_dia"),
            "insulation_dia":     pick("insulation_dia"),
            "final_turns":        pick("final_turns"),
            "cu_length":          pick("cu_length", "culength"),
            "I_ph":               pick("I_ph", "I_main"),
            "slip":               pick("slip"),
            "temp":               pick("temp"),
            "air_gap":            pick("air_gap", "airgap"),
            "final_efficiency":   pick("final_efficiency", "efficiency1"),
            "torque":             pick("torque"),
            "angle":              pick("angle"),
        }

        html = render_template(
            "landing/report.html",
            main_data     = main_data,
            stamping_data = stamping_data,
            rotor_data    = rotor_data,
            winding_data  = winding_data,
            main_data_id  = 0,   # placeholder – PDF generation not used here
            current_date  = current_date,
        )

    # ── 1-PHASE / 2-PHASE report ──────────────────────────────
    else:

        # report1.html uses a single flat `report_data` dict
        report_data = {
            # Main data
            "design_no":   md.get("design_no",   "—"),
            "design_name": md.get("design_name", "—"),
            "voltage":     md.get("voltage",   ""),
            "power":       md.get("power",     ""),
            "hp":          md.get("hp",        ""),
            "frequency":   md.get("frequency", ""),
            "connection":  md.get("connection",""),
            "rpm":         md.get("rpm",       ""),
            "pole":        md.get("pole",      ""),
            "capacitor":   md.get("capacitor", 0),
            # Stamping
            "stamping_material": sd.get("stamping_material", "N/A"),
            "d0":                sd.get("d0",  "N/A"),
            "dia":               sd.get("dia", "N/A"),
            "N":                 sd.get("N",   "N/A"),
            "material":          sd.get("material", "N/A"),
            # Rotor
            "rng_wt":  rd.get("rng_wt", "N/A"),
            "rng_ht":  rd.get("rng_ht", "N/A"),
            "angle":   pick("angle"),
            # Winding – common
            "statorwt":           wd.get("statorwt",           "N/A"),
            "rotorwt":            wd.get("rotorwt",            "N/A"),
            "final_stack_length": wd.get("final_stack_length", "N/A"),
            "insulation_dia":     wd.get("insulation_dia",     "N/A"),
            "actual_use_dia":     wd.get("actual_use_dia",     "N/A"),
            "final_turns":        wd.get("final_turns",        "N/A"),
            # Main winding
            "I_main":             pick("I_main", "I_ph"),
            "insulation_dia_aux": pick("insulation_dia_aux"),
            "actual_use_dia_aux": pick("actual_use_dia_aux"),
            "final_turns_aux":    pick("final_turns_aux"),
            # Auxiliary winding
            "I_aux":              pick("I_aux"),
            # Performance
            "slip":               pick("slip"),
            "temp":               pick("temp"),
            "air_gap":            pick("air_gap", "airgap"),
            "final_efficiency":   pick("final_efficiency", "efficiency1"),
            "torque":             pick("torque"),
        }

        html = render_template(
            "landing/report1.html",
            report_data  = report_data,
            main_data_id = 0,
            current_date = current_date,
        )

    return html


# ─────────────────────────────────────────────────────────────
# SAVED DESIGNS (database)
# ─────────────────────────────────────────────────────────────

def _json_error(message, status=400):
    return jsonify({"success": False, "message": message}), status


@design_bp.route("/api/save", methods=["POST"])
def api_save_design():
    """Save the design so far. Called on every Next and on the final Continue."""

    if "user_id" not in session:
        return _json_error("Please log in again.", 401)

    payload = request.get_json(force=True, silent=True) or {}

    try:
        result = design_store.save_design(session["user_id"], payload)
    except DemoLimitError as error:
        return jsonify({"success": False, "code": "demo_limit", "message": str(error)}), 403
    except DesignError as error:
        return _json_error(str(error))
    except Exception as error:  # database down, etc.
        print("DESIGN SAVE ERROR:", error)
        return _json_error("Could not reach the database. Your values are kept in this browser.", 500)

    if result.get("report_id"):
        session["report_ticket"] = result["report_id"]

    return jsonify({"success": True, **result})


@design_bp.route("/api/designs", methods=["GET"])
def api_list_designs():
    """Saved designs, newest first. Optional ?phase=1_phase"""

    if "user_id" not in session:
        return _json_error("Please log in again.", 401)

    phase = request.args.get("phase")
    if phase not in design_store.PHASES:
        phase = None

    try:
        rows = design_store.list_designs(session["user_id"], phase=phase)
    except Exception as error:
        print("DESIGN LIST ERROR:", error)
        return _json_error("Could not load your designs.", 500)

    designs = [
        {
            "id": row["id"],
            "design_no": row["design_no"],
            "design_name": row["design_name"],
            "phase": row["phase"],
            "phase_label": row["phase_label"],
            "status": row["status"],
            "current_step": row["current_step"],
            "updated_at": row["updated_at"].strftime("%d %b %Y, %H:%M") if row["updated_at"] else "",
        }
        for row in rows
    ]

    return jsonify({"success": True, "designs": designs})


@design_bp.route("/api/designs/<int:design_id>", methods=["GET"])
def api_get_design(design_id):
    """All form values of one design, keyed the way the forms read them."""

    if "user_id" not in session:
        return _json_error("Please log in again.", 401)

    try:
        summary, values = design_store.load_design_values(session["user_id"], design_id)
    except Exception as error:
        print("DESIGN LOAD ERROR:", error)
        return _json_error("Could not load the design.", 500)

    if not summary:
        return _json_error("Design not found.", 404)

    return jsonify({"success": True, "design": summary, "values": values})


@design_bp.route("/api/designs/<int:design_id>", methods=["DELETE"])
def api_delete_design(design_id):

    if "user_id" not in session:
        return _json_error("Please log in again.", 401)

    try:
        deleted = design_store.delete_design(session["user_id"], design_id)
    except Exception as error:
        print("DESIGN DELETE ERROR:", error)
        return _json_error("Could not delete the design.", 500)

    if not deleted:
        return _json_error("Design not found.", 404)

    return jsonify({"success": True})


@design_bp.route("/report/<int:design_id>", methods=["GET"])
def saved_design_report(design_id):
    """Report of a saved design, from its latest calculation."""

    if "user_id" not in session:
        return redirect(url_for("home"))

    try:
        data = design_store.load_report_data(session["user_id"], design_id)
    except Exception as error:
        print("REPORT LOAD ERROR:", error)
        return "Could not load the report.", 500

    if not data:
        return "No report yet — finish the Winding step for this design first.", 404

    return Response(build_report_html(data), mimetype="text/html")


@design_bp.route("/my-designs", methods=["GET"])
def my_designs():
    """My Designs page (loaded into the dashboard)."""

    if "user_id" not in session:
        return "", 401

    try:
        designs = design_store.list_designs(session["user_id"])
        error = None
    except Exception as err:
        print("MY DESIGNS ERROR:", err)
        designs, error = [], "Could not load your designs."

    return render_template("user/design/my_designs.html", designs=designs, error=error)


# ─────────────────────────────────────────────────────────────
# REPORTS
# ─────────────────────────────────────────────────────────────

@design_bp.route("/reports", methods=["GET"])
def reports_page():
    """Reports page (loaded into the dashboard)."""

    if "user_id" not in session:
        return "", 401

    try:
        reports = design_store.list_reports(session["user_id"])
        error = None
    except Exception as err:
        print("REPORTS LIST ERROR:", err)
        reports, error = [], "Could not load your reports."

    return render_template("user/reports.html", reports=reports, error=error)


@design_bp.route("/reports/<int:report_id>", methods=["GET"])
def view_report(report_id):
    """One saved report, exactly as it was generated."""

    if "user_id" not in session:
        return redirect(url_for("home"))

    try:
        data = design_store.load_report_data_for_report(session["user_id"], report_id)
    except Exception as error:
        print("REPORT VIEW ERROR:", error)
        return "Could not load the report.", 500

    if not data:
        return "Report not found.", 404

    return Response(build_report_html(data), mimetype="text/html")


@design_bp.route("/api/reports/<int:report_id>", methods=["DELETE"])
def api_delete_report(report_id):

    if "user_id" not in session:
        return _json_error("Please log in again.", 401)

    try:
        deleted = design_store.delete_report(session["user_id"], report_id)
    except Exception as error:
        print("REPORT DELETE ERROR:", error)
        return _json_error("Could not delete the report.", 500)

    if not deleted:
        return _json_error("Report not found.", 404)

    return jsonify({"success": True})


@design_bp.route("/reports/combined", methods=["GET"])
def combined_report():
    """
    One report built from several saved reports: ?ids=3,5,8
    Designs are columns; a table holds 7 designs and a new table
    starts when it is full; two tables per A4 page.
    """

    if "user_id" not in session:
        return redirect(url_for("home"))

    raw_ids = request.args.get("ids", "")
    ids = [part.strip() for part in raw_ids.split(",") if part.strip()]

    try:
        designs = design_store.load_combined_reports(session["user_id"], ids)
    except Exception as error:
        print("COMBINED REPORT ERROR:", error)
        return "Could not build the combined report.", 500

    current_date = datetime.now().strftime("%d/%m/%Y")

    if len(designs) < 2:
        return render_template(
            "landing/report_combined.html",
            designs=designs, pages=[], table_count=0,
            groups=design_store.COMBINED_GROUPS,
            current_date=current_date,
            error="Select at least two of your reports to combine.",
        ), 400

    pages, table_count = design_store.build_combined_pages(designs)

    return render_template(
        "landing/report_combined.html",
        designs=designs,
        pages=pages,
        table_count=table_count,
        groups=design_store.COMBINED_GROUPS,
        per_table=design_store.DESIGNS_PER_TABLE,
        current_date=current_date,
        error=None,
    )
