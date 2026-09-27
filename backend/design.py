from flask import Blueprint, render_template, redirect, url_for, session, request, Response
from datetime import datetime

design_bp = Blueprint(
    "design",
    __name__,
    url_prefix="/design"
)


@design_bp.route("/")
def design_index():

    if "user_id" not in session:
        return redirect(url_for("home"))

    return render_template("user/design/index.html")


@design_bp.route("/content")
def design_content():

    if "user_id" not in session:
        return "", 401

    return render_template("user/design/index.html")


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

    data    = request.get_json(force=True, silent=True) or {}
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

    return Response(html, mimetype="text/html")
