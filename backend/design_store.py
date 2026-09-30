"""
MOTO MASTER - design storage (PostgreSQL)

Maps the design forms <-> the v2 design tables
(database/schema.sql).

The browser keeps form values in sessionStorage under the form
field ids (e.g. "A1", "shaft_diameter", "winding_final_turns").
To save, the browser sends that whole key/value map; this module
picks the fields it knows. To load, it returns the same kind of
map, so the forms fill themselves in.
"""

import json
import math
import os
from datetime import date, datetime
from decimal import Decimal

import psycopg2
import psycopg2.extras


def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))


# =========================================================
# FIELD MAPS
# (column, type, [browser keys, first one found wins])
# =========================================================

MAIN_FIELDS = [
    ("connection", "text", ["connection"]),
    ("voltage",    "num",  ["voltage"]),
    ("power",      "num",  ["power"]),
    ("hp",         "num",  ["hp"]),
    ("frequency",  "int",  ["frequency"]),
    ("rpm",        "int",  ["rpm"]),
    ("pole",       "int",  ["pole"]),
    ("uph",        "num",  ["uph"]),
    ("capacitor",  "num",  ["capacitor"]),
]

STAMPING_FIELDS = [
    ("material",          "text", ["material"]),
    ("stamping_material", "text", ["stamping_material"]),
    ("n",   "int", ["N"]),
    ("y",   "num", ["Y"]),
    ("w",   "num", ["W"]),
    ("w2",  "num", ["W2"]),
    ("a1",  "num", ["A1"]),
    ("shape", "text", ["shape"]),
    ("a",   "num", ["a"]),
    ("b",   "num", ["b"]),
    ("c",   "num", ["c"]),
    ("d",   "num", ["d"]),
    ("e",   "num", ["e"]),
    ("dw",  "num", ["dw"]),
    ("d0",  "num", ["d0"]),
    ("dia", "num", ["dia"]),
    ("lf_y", "num", ["stamping_lf_y", "lf_y"]),
    ("lf_t", "num", ["stamping_lf_t", "lf_t"]),
]

ROTOR_FIELDS = [
    ("m",      "int", ["M"]),
    ("rng_wt", "num", ["rng_wt"]),
    ("rng_ht", "num", ["rng_ht"]),
    ("x",      "num", ["X"]),
    ("v",      "num", ["V"]),
    ("v2",     "num", ["V2"]),
    ("a2",     "num", ["A2"]),
    ("ra",     "num", ["ra"]),
    ("rb",     "num", ["rb"]),
    ("rc",     "num", ["rc"]),
    ("rd",     "num", ["rd"]),
    ("re",     "num", ["re"]),
    ("rw",     "num", ["rw"]),
    ("shaft_diameter", "num", ["shaft_diameter"]),
]

WINDING_FIELDS = [
    ("current_density",    "num", ["current_density", "winding_current_density"]),
    ("efficiency",         "num", ["efficiency", "winding_efficiency"]),
    ("insulation_dia",     "num", ["insulation_dia", "winding_insulation_dia"]),
    ("actual_use_dia",     "num", ["actual_use_dia", "winding_actual_use_dia"]),
    ("final_turns",        "int", ["final_turns", "winding_final_turns"]),
    ("insulation_dia_aux", "num", ["insulation_dia_aux", "winding_insulation_dia_aux"]),
    ("actual_use_dia_aux", "num", ["actual_use_dia_aux", "winding_actual_use_dia_aux"]),
    ("final_turns_aux",    "int", ["final_turns_aux", "winding_final_turns_aux"]),
    ("final_stack_length", "num", ["final_stack_length", "winding_final_stack_length"]),
]

AUX_COLUMNS = {"insulation_dia_aux", "actual_use_dia_aux", "final_turns_aux"}

RESULT_FIELDS = [
    ("i_ph",  "num", ["winding_I_ph", "I_ph", "winding_I_main", "I_main"]),
    ("i_aux", "num", ["winding_I_aux", "I_aux"]),
    ("recommended_dia",          "num", ["winding_recommended_dia", "recommended_dia"]),
    ("recommended_dia_aux",      "num", ["winding_recommended_dia_aux", "recommended_dia_aux"]),
    ("recommended_turns",        "num", ["winding_recommended_turns", "recommended_turns"]),
    ("recommended_turns_aux",    "num", ["winding_recommended_turns_aux", "recommended_turns_aux"]),
    ("recommended_stack_length", "num", ["winding_recommended_stack_length", "recommended_stack_length"]),
    ("slip",             "num", ["winding_slip", "slip"]),
    ("temp",             "num", ["winding_temp", "temp"]),
    ("statorwt",         "num", ["winding_statorwt", "statorwt"]),
    ("rotorwt",          "num", ["winding_rotorwt", "rotorwt"]),
    ("cu_length",        "num", ["winding_cu_length", "cu_length", "culength"]),
    ("air_gap",          "num", ["winding_air_gap", "air_gap", "airgap"]),
    ("final_efficiency", "num", ["winding_final_efficiency", "final_efficiency", "efficiency1"]),
    ("angle",            "num", ["winding_angle", "angle"]),
    ("torque",           "num", ["winding_torque", "torque"]),
]

FORM_TABLES = [
    ("design_main_data",     MAIN_FIELDS),
    ("design_stamping_data", STAMPING_FIELDS),
    ("design_rotor_data",    ROTOR_FIELDS),
    ("design_winding_data",  WINDING_FIELDS),
]

PHASES = {"1_phase", "2_phase", "3_phase"}

PHASE_LABELS = {
    "1_phase": "Single Phase",
    "2_phase": "Two Phase",
    "3_phase": "Three Phase",
}


class DesignError(Exception):
    """A problem the user can fix (shown as a message)."""


# =========================================================
# VALUE HELPERS
# =========================================================

def _first(values, keys):
    for key in keys:
        raw = values.get(key)
        if raw is None:
            continue
        raw = str(raw).strip()
        if raw != "":
            return raw
    return None


def _convert(raw, kind, label):
    if raw is None:
        return None

    if kind == "text":
        return raw[:150]

    try:
        number = float(raw)
    except ValueError:
        raise DesignError(f"{label} must be a number (got '{raw}').")

    if not math.isfinite(number):
        return None

    if kind == "int":
        return int(round(number))

    return number


def _collect(values, fields):
    row = {}
    for column, kind, keys in fields:
        row[column] = _convert(_first(values, keys), kind, keys[0])
    return row


def _parse_date(raw):
    if not raw:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            pass
    return None


def _to_text(value):
    """DB value -> the string a form input expects ('230', '0.65')."""
    if value is None:
        return None
    if isinstance(value, Decimal):
        text = format(value.normalize(), "f")
        return "0" if text in ("-0", "") else text
    if isinstance(value, float):
        return format(value, "g") if abs(value) < 1e15 else str(value)
    if isinstance(value, (date, datetime)):
        return value.strftime("%Y-%m-%d")
    return str(value)


FRIENDLY_CONSTRAINTS = {
    "uq_designs_user_design_no":   "You already have a design with this Design No. Use a different number.",
    "main_data_frequency_check":   "Frequency must be 50 or 60 Hz.",
    "main_data_pole_check":        "Pole must be 2, 4, 6, 8, 10 or 12.",
    "main_data_positive_check":    "Main Data values must be greater than 0.",
    "stamping_positive_check":     "Stamping N, D0 and Dia must be greater than 0.",
    "stamping_diameter_check":     "Stamping D0 (outer) must be larger than Dia (inner).",
    "stamping_material_check":     "Bar material must be copper or aluminium.",
    "stamping_steel_check":        "Stamping material must be CRC, CRNO or M-47.",
    "stamping_shape_check":        "Shape must be Round or Trp.",
    "rotor_positive_check":        "Rotor M and Shaft Diameter must be greater than 0.",
    "winding_positive_check":      "Winding values must be greater than 0 (efficiency at most 100%).",
    "designs_wire_type_check":     "Unknown wire type.",
    "designs_mechanical_check":    "Unknown mechanical component.",
}


# Names PostgreSQL gives the inline CHECKs in the compact design SQL
FRIENDLY_CONSTRAINTS.update({
    "design_main_data_frequency_check":      FRIENDLY_CONSTRAINTS["main_data_frequency_check"],
    "design_main_data_pole_check":           FRIENDLY_CONSTRAINTS["main_data_pole_check"],
    "design_stamping_data_material_check":   FRIENDLY_CONSTRAINTS["stamping_material_check"],
    "design_stamping_data_stamping_material_check": FRIENDLY_CONSTRAINTS["stamping_steel_check"],
    "design_stamping_data_shape_check":      FRIENDLY_CONSTRAINTS["stamping_shape_check"],
    "design_winding_data_efficiency_check":  "Efficiency must be between 0 and 100%.",
    "designs_wire_type_check":               FRIENDLY_CONSTRAINTS["designs_wire_type_check"],
    "designs_mechanical_component_check":    FRIENDLY_CONSTRAINTS["designs_mechanical_check"],
})


def friendly_db_error(error):
    name = getattr(getattr(error, "diag", None), "constraint_name", None) or ""
    if name not in FRIENDLY_CONSTRAINTS and name.endswith("_check"):
        table_hint = {
            "design_main_data_": "Main Data",
            "design_stamping_data_": "Stamping",
            "design_rotor_data_": "Rotor",
            "design_winding_data_": "Winding",
        }
        for prefix, form in table_hint.items():
            if name.startswith(prefix):
                field = name[len(prefix):-len("_check")]
                return f"{form}: '{field}' must be greater than 0."
    return _friendly_db_error(error)


def _friendly_db_error(error):
    name = getattr(getattr(error, "diag", None), "constraint_name", None)
    if name in FRIENDLY_CONSTRAINTS:
        return FRIENDLY_CONSTRAINTS[name]
    primary = getattr(getattr(error, "diag", None), "message_primary", None)
    return primary or "The design could not be saved."


# =========================================================
# SAVE
# =========================================================

def save_design(user_id, payload):
    """
    payload = {
        "design_id": 12 | null,
        "values":    { ...browser sessionStorage... },
        "step":      1-4,
        "finalize":  true when the report is generated
    }
    Returns {"design_id", "calculation_id"?, "report_id"?}.
    """

    values = payload.get("values") or {}
    if not isinstance(values, dict):
        raise DesignError("Invalid design data.")

    design_id = payload.get("design_id")
    step = payload.get("step") or 1
    finalize = bool(payload.get("finalize"))

    try:
        step = max(1, min(4, int(step)))
    except (TypeError, ValueError):
        step = 1

    phase = _first(values, ["design_phase"])
    if phase not in PHASES:
        raise DesignError("Select a phase first.")

    design_no = _first(values, ["design_no", "designNo"])
    design_name = _first(values, ["design_name", "designName"]) or "Untitled design"
    design_date = _parse_date(_first(values, ["date", "designDate"]))
    wire_type = _first(values, ["design_wire_type", "wire_type"])
    mechanical = _first(values, ["design_mechanical_component", "mechanical_component"])

    forms = [(table, _collect(values, fields)) for table, fields in FORM_TABLES]

    if phase == "3_phase":
        for table, row in forms:
            if table == "design_winding_data":
                for column in AUX_COLUMNS:
                    row[column] = None

    result = {}

    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:

                # ---- designs row --------------------------------
                if design_id:
                    cur.execute(
                        "SELECT id, current_step FROM designs WHERE id = %s AND user_id = %s",
                        (design_id, user_id),
                    )
                    found = cur.fetchone()
                    if not found:
                        raise DesignError("Design not found.")

                    cur.execute(
                        """
                        UPDATE designs SET
                            design_no = %s,
                            design_name = %s,
                            design_date = COALESCE(%s, design_date),
                            phase = %s,
                            wire_type = %s,
                            mechanical_component = %s,
                            current_step = GREATEST(current_step, %s)
                        WHERE id = %s
                        """,
                        (design_no, design_name, design_date, phase,
                         wire_type, mechanical, step, design_id),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO designs
                            (user_id, design_no, design_name, design_date,
                             phase, wire_type, mechanical_component, current_step)
                        VALUES (%s, %s, %s, COALESCE(%s, CURRENT_DATE), %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (user_id, design_no, design_name, design_date,
                         phase, wire_type, mechanical, step),
                    )
                    design_id = cur.fetchone()[0]

                result["design_id"] = design_id

                # ---- four form tables (upsert) -------------------
                for table, row in forms:
                    columns = list(row.keys())
                    cur.execute(
                        f"""
                        INSERT INTO {table} (design_id, {", ".join(columns)})
                        VALUES (%s, {", ".join(["%s"] * len(columns))})
                        ON CONFLICT (design_id) DO UPDATE SET
                            {", ".join(f"{c} = EXCLUDED.{c}" for c in columns)}
                        """,
                        [design_id] + [row[c] for c in columns],
                    )

                # ---- final submit: calculation + report ----------
                if finalize:
                    results = _collect(values, RESULT_FIELDS)
                    snapshot = {
                        "phase": phase,
                        "design": {
                            "design_no": design_no,
                            "design_name": design_name,
                            "design_date": design_date.isoformat() if design_date else None,
                            "wire_type": wire_type,
                            "mechanical_component": mechanical,
                        },
                    }
                    for table, row in forms:
                        snapshot[table.replace("design_", "")] = row

                    columns = list(results.keys())
                    cur.execute(
                        f"""
                        INSERT INTO calculations (design_id, {", ".join(columns)}, inputs_snapshot)
                        VALUES (%s, {", ".join(["%s"] * len(columns))}, %s)
                        RETURNING id
                        """,
                        [design_id] + [results[c] for c in columns] + [json.dumps(snapshot)],
                    )
                    calculation_id = cur.fetchone()[0]

                    report_name = "Motor Design Report"
                    if design_no:
                        report_name += f" - {design_no}"
                    report_name += f" - {design_name}"

                    cur.execute(
                        """
                        INSERT INTO reports (design_id, calculation_id, report_name)
                        VALUES (%s, %s, %s)
                        RETURNING id
                        """,
                        (design_id, calculation_id, report_name[:200]),
                    )
                    report_id = cur.fetchone()[0]

                    cur.execute(
                        "UPDATE reports SET file_url = %s WHERE id = %s",
                        (f"/design/reports/{report_id}", report_id),
                    )
                    result["report_id"] = report_id
                    result["calculation_id"] = calculation_id

                    cur.execute(
                        "UPDATE designs SET status = 'completed', current_step = 4 WHERE id = %s",
                        (design_id,),
                    )

    except psycopg2.Error as error:
        raise DesignError(friendly_db_error(error))
    finally:
        conn.close()

    return result


# =========================================================
# LIST / LOAD / DELETE
# =========================================================

def list_designs(user_id, phase=None, limit=100):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    d.id, d.design_no, d.design_name, d.design_date,
                    d.phase, d.status, d.current_step,
                    d.wire_type, d.mechanical_component,
                    d.created_at, d.updated_at,
                    m.hp, m.voltage,
                    (SELECT c.final_efficiency FROM calculations c
                      WHERE c.design_id = d.id
                      ORDER BY c.created_at DESC LIMIT 1) AS final_efficiency
                FROM designs d
                LEFT JOIN design_main_data m ON m.design_id = d.id
                WHERE d.user_id = %s
                  AND (%s::text IS NULL OR d.phase = %s)
                ORDER BY d.updated_at DESC
                LIMIT %s
                """,
                (user_id, phase, phase, limit),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    for row in rows:
        row["phase_label"] = PHASE_LABELS.get(row["phase"], row["phase"])
    return rows


def load_design_values(user_id, design_id):
    """
    Returns (summary, values) where values is the sessionStorage
    map the forms read, or (None, None) if not found.
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM designs WHERE id = %s AND user_id = %s",
                (design_id, user_id),
            )
            design = cur.fetchone()
            if not design:
                return None, None

            rows = {}
            for table, _ in FORM_TABLES:
                cur.execute(f"SELECT * FROM {table} WHERE design_id = %s", (design_id,))
                rows[table] = cur.fetchone() or {}
    finally:
        conn.close()

    values = {}

    def put(keys, value):
        text = _to_text(value)
        if text is None:
            return
        for key in keys:
            values[key] = text

    put(["design_no", "designNo"], design["design_no"])
    put(["design_name", "designName"], design["design_name"])
    put(["date", "designDate"], design["design_date"])
    put(["design_phase"], design["phase"])
    put(["design_wire_type", "wire_type"], design["wire_type"])
    put(["design_mechanical_component", "mechanical_component"], design["mechanical_component"])

    for table, fields in FORM_TABLES:
        row = rows[table]
        for column, _, keys in fields:
            value = row.get(column)
            if table == "design_winding_data":
                # winding forms read both "<id>" and "winding_<id>"
                put([keys[0], "winding_" + keys[0]], value)
            elif column in ("lf_y", "lf_t"):
                put([column, "stamping_" + column], value)
            else:
                put(keys, value)

    summary = {
        "id": design["id"],
        "design_no": design["design_no"],
        "design_name": design["design_name"],
        "phase": design["phase"],
        "phase_label": PHASE_LABELS.get(design["phase"], design["phase"]),
        "status": design["status"],
        "current_step": design["current_step"],
    }
    return summary, values


def delete_design(user_id, design_id):
    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM designs WHERE id = %s AND user_id = %s",
                    (design_id, user_id),
                )
                return cur.rowcount > 0
    finally:
        conn.close()


def _report_from_calculation(phase, snapshot, calc):
    """
    Build the data dict build_report_html() expects, using the form
    values saved WITH this calculation (so an old report never changes).
    """
    snapshot = snapshot or {}
    design = snapshot.get("design") or {}
    main = snapshot.get("main_data") or {}
    stamping = snapshot.get("stamping_data") or {}
    rotor = snapshot.get("rotor_data") or {}
    winding = snapshot.get("winding_data") or {}

    def t(value):
        text = _to_text(value)
        return text if text is not None else ""

    def c(column):
        text = _to_text(calc.get(column))
        return text if text is not None else "N/A"

    raw_date = design.get("design_date")
    try:
        shown_date = datetime.strptime(raw_date, "%Y-%m-%d").strftime("%d/%m/%Y") if raw_date else ""
    except ValueError:
        shown_date = raw_date

    if not shown_date and calc.get("created_at"):
        shown_date = calc["created_at"].strftime("%d/%m/%Y")

    return {
        "phase": snapshot.get("phase") or phase,
        "main_data": {
            "design_no": t(design.get("design_no")),
            "design_name": t(design.get("design_name")),
            "design_date": shown_date,
            "connection": t(main.get("connection")),
            "voltage": t(main.get("voltage")),
            "power": t(main.get("power")),
            "hp": t(main.get("hp")),
            "frequency": t(main.get("frequency")),
            "rpm": t(main.get("rpm")),
            "pole": t(main.get("pole")),
            "uph": t(main.get("uph")),
            "capacitor": t(main.get("capacitor")),
        },
        "stamping_data": {
            "stamping_material": t(stamping.get("stamping_material")),
            "material": t(stamping.get("material")),
            "d0": t(stamping.get("d0")),
            "dia": t(stamping.get("dia")),
            "N": t(stamping.get("n")),
        },
        "rotor_data": {
            "rng_wt": t(rotor.get("rng_wt")),
            "rng_ht": t(rotor.get("rng_ht")),
        },
        "winding_data": {
            "statorwt": c("statorwt"),
            "rotorwt": c("rotorwt"),
            "final_stack_length": t(winding.get("final_stack_length")),
            "insulation_dia": t(winding.get("insulation_dia")),
            "actual_use_dia": t(winding.get("actual_use_dia")),
            "final_turns": t(winding.get("final_turns")),
            "insulation_dia_aux": t(winding.get("insulation_dia_aux")),
            "actual_use_dia_aux": t(winding.get("actual_use_dia_aux")),
            "final_turns_aux": t(winding.get("final_turns_aux")),
            "I_ph": c("i_ph"),
            "I_main": c("i_ph"),
            "I_aux": c("i_aux"),
            "cu_length": c("cu_length"),
            "slip": c("slip"),
            "temp": c("temp"),
            "air_gap": c("air_gap"),
            "final_efficiency": c("final_efficiency"),
            "angle": c("angle"),
            "torque": c("torque"),
        },
    }


def _load_calculation(user_id, where_sql, params):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT c.*, d.phase
                FROM calculations c
                JOIN designs d ON d.id = c.design_id
                WHERE d.user_id = %s AND {where_sql}
                ORDER BY c.created_at DESC, c.id DESC
                LIMIT 1
                """,
                [user_id] + list(params),
            )
            return cur.fetchone()
    finally:
        conn.close()


def load_report_data(user_id, design_id):
    """Report of a design's latest calculation."""
    calc = _load_calculation(user_id, "c.design_id = %s", [design_id])
    if not calc:
        return None
    return _report_from_calculation(calc["phase"], calc["inputs_snapshot"], calc)


def load_report_data_for_report(user_id, report_id):
    """Report exactly as it was when this report was generated."""
    calc = _load_calculation(
        user_id,
        "c.id = (SELECT r.calculation_id FROM reports r WHERE r.id = %s)",
        [report_id],
    )
    if not calc:
        return None
    return _report_from_calculation(calc["phase"], calc["inputs_snapshot"], calc)


# =========================================================
# REPORTS LIST / DELETE
# =========================================================

def list_reports(user_id, limit=200):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    r.id, r.report_name, r.file_url, r.created_at,
                    d.id AS design_id, d.design_no, d.design_name, d.phase,
                    c.final_efficiency, c.torque, c.slip
                FROM reports r
                JOIN designs d      ON d.id = r.design_id
                JOIN calculations c ON c.id = r.calculation_id
                WHERE d.user_id = %s
                ORDER BY r.created_at DESC, r.id DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    for row in rows:
        row["phase_label"] = PHASE_LABELS.get(row["phase"], row["phase"])
        row["file_url"] = row["file_url"] or f"/design/reports/{row['id']}"
    return rows


def delete_report(user_id, report_id):
    """Removes the report entry (the calculation history is kept)."""
    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    DELETE FROM reports r
                    USING designs d
                    WHERE r.id = %s
                      AND d.id = r.design_id
                      AND d.user_id = %s
                    """,
                    (report_id, user_id),
                )
                return cur.rowcount > 0
    finally:
        conn.close()


# =========================================================
# COMBINED PERFORMANCE REPORT
# =========================================================

COMBINED_METRICS = [
    # key, label, unit, better ("high" / "low" / None)
    ("final_efficiency", "Efficiency",   "%",  "high"),
    ("i_ph",             "Current",      "A",  None),
    ("slip",             "Slip",         "%",  "low"),
    ("temp",             "Temp. rise",   "°C", "low"),
    ("torque",           "Torque",       "Nm", "high"),
    ("air_gap",          "Air gap",      "mm", None),
    ("statorwt",         "Stator wt",    "kg", None),
    ("rotorwt",          "Rotor wt",     "kg", None),
]

MAX_COMBINED = 20


def load_combined_reports(user_id, report_ids):
    """
    Performance section of several reports, in the order given.
    Only the user's own reports are returned.
    """
    ids = []
    for value in report_ids:
        try:
            number = int(value)
        except (TypeError, ValueError):
            continue
        if number > 0 and number not in ids:
            ids.append(number)

    ids = ids[:MAX_COMBINED]
    if not ids:
        return []

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    r.id AS report_id, r.created_at AS report_date,
                    d.id AS design_id, d.phase,
                    c.*
                FROM reports r
                JOIN designs d      ON d.id = r.design_id
                JOIN calculations c ON c.id = r.calculation_id
                WHERE d.user_id = %s
                  AND r.id = ANY(%s)
                """,
                (user_id, ids),
            )
            found = {row["report_id"]: row for row in cur.fetchall()}
    finally:
        conn.close()

    rows = []
    for report_id in ids:
        row = found.get(report_id)
        if not row:
            continue

        snapshot = row.get("inputs_snapshot") or {}
        design = snapshot.get("design") or {}
        main = snapshot.get("main_data") or {}
        phase = snapshot.get("phase") or row["phase"]

        metrics = {}
        for key, _, _, _ in COMBINED_METRICS:
            value = row.get(key)
            metrics[key] = float(value) if value is not None else None

        rows.append({
            "report_id": report_id,
            "design_id": row["design_id"],
            "design_no": design.get("design_no") or "",
            "design_name": design.get("design_name") or "Untitled design",
            "phase": phase,
            "phase_label": PHASE_LABELS.get(phase, phase),
            "hp": main.get("hp"),
            "voltage": main.get("voltage"),
            "capacitor": main.get("capacitor"),
            "date": row["report_date"],
            "metrics": metrics,
        })

    return rows


def summarise_combined(rows):
    """Best / average / min / max per metric, and which rows are best."""
    summary = {}
    for key, _, _, better in COMBINED_METRICS:
        values = [r["metrics"][key] for r in rows if r["metrics"][key] is not None]
        if not values:
            summary[key] = None
            continue
        info = {
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / len(values),
            "best": None,
        }
        if better == "high":
            info["best"] = info["max"]
        elif better == "low":
            info["best"] = info["min"]
        summary[key] = info
    return summary
