
import os
import psycopg2

from flask import (
    Blueprint,
    render_template,
    redirect,
    url_for,
    session
)


dashboard_bp = Blueprint(
    "dashboard",
    __name__
)


def get_db_connection():
    return psycopg2.connect(
        os.getenv("DATABASE_URL")
    )


@dashboard_bp.route("/dashboard")
def dashboard():

    # ==========================================
    # CHECK LOGIN
    # ==========================================

    if "user_id" not in session:
        return redirect(url_for("home"))


    user_id = session["user_id"]

    conn = None
    cursor = None


    try:

        conn = get_db_connection()
        cursor = conn.cursor()


        # ==========================================
        # USER
        # ==========================================

        cursor.execute(
            """
            SELECT
                id,
                name,
                username,
                email,
                role,
                created_at
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        user_row = cursor.fetchone()


        if not user_row:

            session.clear()

            return redirect(
                url_for("home")
            )


        (
            user_id,
            name,
            username,
            email,
            role,
            created_at
        ) = user_row


        user_data = {

            "id": user_id,

            "name": name,

            "username": username,

            "email": email,

            "role": role,

            "created_at": created_at

        }


        # ==========================================
        # TOTAL DESIGNS
        # ==========================================

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM designs
            WHERE user_id = %s
            """,
            (user_id,)
        )

        total_designs = cursor.fetchone()[0]


        # ==========================================
        # TOTAL CALCULATIONS
        #
        # Internal database count only.
        # No user-facing Calculations tab.
        # ==========================================

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM calculations c
            INNER JOIN designs d
                ON c.design_id = d.id
            WHERE d.user_id = %s
            """,
            (user_id,)
        )

        total_calculations = cursor.fetchone()[0]


        # ==========================================
        # TOTAL REPORTS
        # ==========================================

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM reports r
            INNER JOIN designs d
                ON r.design_id = d.id
            WHERE d.user_id = %s
            """,
            (user_id,)
        )

        total_reports = cursor.fetchone()[0]


        # ==========================================
        # LATEST SUBSCRIPTION
        # ==========================================

        cursor.execute(
            """
            SELECT
                id,
                plan,
                amount,
                status,
                start_date,
                end_date
            FROM subscriptions
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (user_id,)
        )

        subscription_row = cursor.fetchone()

        subscription = None


        if subscription_row:

            (
                subscription_id,
                plan,
                amount,
                status,
                start_date,
                end_date
            ) = subscription_row


            subscription = {

                "id": subscription_id,

                "plan": plan,

                "amount": amount,

                "status": status,

                "start_date": start_date,

                "end_date": end_date

            }


        # ==========================================
        # RECENT DESIGNS
        # ==========================================

        cursor.execute(
            """
            SELECT
                id,
                phase,
                design_no,
                design_name,
                created_at,
                updated_at
            FROM designs
            WHERE user_id = %s
            ORDER BY updated_at DESC
            LIMIT 5
            """,
            (user_id,)
        )

        design_rows = cursor.fetchall()

        recent_designs = []


        for row in design_rows:

            recent_designs.append({

                "id": row[0],

                "phase": row[1],
                "phase_label": {
                    "1_phase": "Single Phase",
                    "2_phase": "Two Phase",
                    "3_phase": "Three Phase"
                }.get(row[1], row[1]),

                "design_no": row[2],

                "design_name": row[3],

                "created_at": row[4],

                "updated_at": row[5]

            })


        # ==========================================
        # RECENT REPORTS
        # ==========================================

        cursor.execute(
            """
            SELECT
                r.id,
                r.report_name,
                r.file_url,
                r.created_at,
                d.design_name
            FROM reports r
            INNER JOIN designs d
                ON r.design_id = d.id
            WHERE d.user_id = %s
            ORDER BY r.created_at DESC
            LIMIT 5
            """,
            (user_id,)
        )

        report_rows = cursor.fetchall()

        recent_reports = []


        for row in report_rows:

            recent_reports.append({

                "id": row[0],

                "report_name": row[1],

                "file_url": row[2],

                "created_at": row[3],

                "design_name": row[4]

            })


        # ==========================================
        # USER DASHBOARD
        # ==========================================

        return render_template(

            "user/index.html",

            user=user_data,

            total_designs=total_designs,

            total_calculations=total_calculations,

            total_reports=total_reports,

            subscription=subscription,

            recent_designs=recent_designs,

            recent_reports=recent_reports

        )


    except Exception as e:

        print(
            "DASHBOARD ERROR:",
            e
        )

        return (
            "Dashboard error. "
            "Please check the server logs.",
            500
        )


    finally:

        if cursor:
            cursor.close()

        if conn:
            conn.close()
