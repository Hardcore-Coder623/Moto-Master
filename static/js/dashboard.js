document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       RUN SCRIPTS HELPER
       innerHTML does not execute <script> tags.
       This function re-inserts them so they execute.
    ===================================================== */

    function runScripts(container) {

        container
            .querySelectorAll("script")
            .forEach((oldScript) => {

                const newScript =
                    document.createElement("script");

                newScript.textContent =
                    oldScript.textContent;

                Array.from(oldScript.attributes)
                    .forEach((attr) => {
                        newScript.setAttribute(
                            attr.name,
                            attr.value
                        );
                    });

                oldScript.parentNode.replaceChild(
                    newScript,
                    oldScript
                );

            });

    }


    /* =====================================================
       DASHBOARD CONTENT
    ===================================================== */

    const dashboardContent =
        document.getElementById("dashboardContent");


    /* =====================================================
       NAVIGATION ELEMENTS
    ===================================================== */

    const dashboardMenu =
        document.querySelector(
            '.dashboard-menu-item[href="/dashboard"]'
        );

    const newDesignMenu =
        document.getElementById("newDesignMenu");

    const designsMenu =
        document.getElementById("designsMenu");

    const reportsMenu =
        document.getElementById("reportsMenu");

    const subscriptionMenu =
        document.getElementById("subscriptionMenu");

    const paymentsMenu =
        document.getElementById("paymentsMenu");

    const profileMenu =
        document.getElementById("profileMenu");


    /* =====================================================
       OVERVIEW BUTTONS
    ===================================================== */

    const overviewNewDesign =
        document.getElementById("overviewNewDesign");

    const emptyNewDesign =
        document.getElementById("emptyNewDesign");

    const viewAllDesigns =
        document.getElementById("viewAllDesigns");

    const viewAllReports =
        document.getElementById("viewAllReports");

    const manageSubscription =
        document.getElementById("manageSubscription");

    const choosePlan =
        document.getElementById("choosePlan");


    /* =====================================================
       LOGOUT
    ===================================================== */

    const logoutForm =
        document.getElementById("logoutForm");

    if (logoutForm) {

        logoutForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                const logoutButton =
                    logoutForm.querySelector("button");

                if (logoutButton) {
                    logoutButton.disabled = true;
                    logoutButton.style.opacity = "0.7";
                }

                try {

                    const response =
                        await fetch(
                            "/api/auth/logout",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json"
                                }
                            }
                        );

                    const data =
                        await response.json();

                    if (
                        response.ok &&
                        data.success
                    ) {

                        window.location.href = "/";

                        return;
                    }

                    alert(
                        data.message ||
                        "Logout failed. Please try again."
                    );

                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                    alert(
                        "Unable to logout. Please try again."
                    );

                } finally {

                    if (logoutButton) {
                        logoutButton.disabled = false;
                        logoutButton.style.opacity = "1";
                    }

                }

            }
        );

    }


    /* =====================================================
       ACTIVE SIDEBAR ITEM
    ===================================================== */

    function setActiveMenu(activeItem) {

        document
            .querySelectorAll(
                ".dashboard-menu-item"
            )
            .forEach((item) => {

                item.classList.remove("active");

            });

        if (activeItem) {
            activeItem.classList.add("active");
        }

    }


    /* =====================================================
       LOAD DESIGN JAVASCRIPT
    ===================================================== */

    function loadDesignScript() {

        const existingScript =
            document.getElementById("designScript");


        /* Design JS already loaded */

        if (existingScript) {

            if (
                typeof window.initializeDesignPage ===
                "function"
            ) {

                window.initializeDesignPage();

            }

            return;
        }


        /* Load Design JS */

        const script =
            document.createElement("script");

        script.id =
            "designScript";

        script.src =
            "/static/js/design.js";


        script.onload = () => {

            if (
                typeof window.initializeDesignPage ===
                "function"
            ) {

                window.initializeDesignPage();

            }

        };


        script.onerror = () => {

            console.error(
                "Failed to load design.js"
            );

            alert(
                "Design JavaScript could not be loaded."
            );

        };


        document.body.appendChild(script);

    }


    /* =====================================================
       LOAD NEW DESIGN
    ===================================================== */

    async function loadNewDesign(event) {

        if (event) {
            event.preventDefault();
        }


        if (!dashboardContent) {

            console.error(
                "dashboardContent not found."
            );

            return;
        }


        try {

            dashboardContent.innerHTML = `
                <div style="
                    padding: 50px;
                    text-align: center;
                ">
                    Loading Design...
                </div>
            `;


            const response =
                await fetch("/design/content");


            if (!response.ok) {

                throw new Error(
                    "Design request failed: " +
                    response.status
                );

            }


            const html =
                await response.text();


            dashboardContent.innerHTML =
                html;


            /* Run any <script> tags in loaded HTML */

            runScripts(dashboardContent);


            /* Activate New Design */

            setActiveMenu(
                newDesignMenu
            );


            /* Initialize Design */

            loadDesignScript();


            /* Scroll content to top */

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        } catch (error) {

            console.error(
                "New Design loading error:",
                error
            );


            dashboardContent.innerHTML = `
                <div style="
                    padding: 50px;
                    text-align: center;
                ">

                    <h2>
                        Unable to Load New Design
                    </h2>

                    <p>
                        Check the browser console
                        for the error.
                    </p>

                </div>
            `;

        }

    }


    /* =====================================================
       SIDEBAR → NEW DESIGN
    ===================================================== */

    if (newDesignMenu) {

        newDesignMenu.addEventListener(
            "click",
            loadNewDesign
        );

    }


    /* =====================================================
       OVERVIEW → NEW DESIGN
    ===================================================== */

    if (overviewNewDesign) {

        overviewNewDesign.addEventListener(
            "click",
            loadNewDesign
        );

    }


    if (emptyNewDesign) {

        emptyNewDesign.addEventListener(
            "click",
            loadNewDesign
        );

    }


    /* =====================================================
       OTHER PLACEHOLDER BUTTONS
    ===================================================== */

    const placeholderItems = [

        designsMenu,
        reportsMenu,
        subscriptionMenu,
        paymentsMenu,
        profileMenu,
        viewAllDesigns,
        viewAllReports,
        manageSubscription,
        choosePlan

    ];


    placeholderItems.forEach((element) => {

        if (!element) {
            return;
        }


        element.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

            }
        );

    });

});