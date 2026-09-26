
document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       LOGOUT
    ===================================================== */

    const logoutForm = document.getElementById("logoutForm");

    if (logoutForm) {

        logoutForm.addEventListener("submit", async (event) => {

            event.preventDefault();

            const logoutButton =
                logoutForm.querySelector("button");

            if (logoutButton) {
                logoutButton.disabled = true;
                logoutButton.style.opacity = "0.7";
            }

            try {

                const response = await fetch(
                    "/api/auth/logout",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );

                const data = await response.json();

                if (response.ok && data.success) {

                    window.location.href = "/";

                    return;
                }

                alert(
                    data.message ||
                    "Logout failed. Please try again."
                );

            } catch (error) {

                console.error("Logout error:", error);

                alert(
                    "Unable to logout. Please try again."
                );

            } finally {

                if (logoutButton) {
                    logoutButton.disabled = false;
                    logoutButton.style.opacity = "1";
                }

            }

        });

    }


    /* =====================================================
       DASHBOARD NAVIGATION PLACEHOLDERS
    ===================================================== */

    const navigationItems = {

        newDesignMenu:
            document.getElementById("newDesignMenu"),

        designsMenu:
            document.getElementById("designsMenu"),

        reportsMenu:
            document.getElementById("reportsMenu"),

        subscriptionMenu:
            document.getElementById("subscriptionMenu"),

        paymentsMenu:
            document.getElementById("paymentsMenu"),

        profileMenu:
            document.getElementById("profileMenu"),

        overviewNewDesign:
            document.getElementById("overviewNewDesign"),

        emptyNewDesign:
            document.getElementById("emptyNewDesign"),

        viewAllDesigns:
            document.getElementById("viewAllDesigns"),

        viewAllReports:
            document.getElementById("viewAllReports"),

        manageSubscription:
            document.getElementById("manageSubscription"),

        choosePlan:
            document.getElementById("choosePlan")

    };


    /* =====================================================
       PREVENT PLACEHOLDER LINKS FROM JUMPING
    ===================================================== */

    Object.values(navigationItems).forEach((element) => {

        if (!element) {
            return;
        }

        element.addEventListener("click", (event) => {

            const href =
                element.getAttribute("href");

            if (!href || href === "#") {

                event.preventDefault();

            }

        });

    });

});
