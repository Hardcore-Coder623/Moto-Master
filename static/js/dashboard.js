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
            (event) => startNewDesign(event)
        );

    }


    /* =====================================================
       OVERVIEW → NEW DESIGN
    ===================================================== */

    if (overviewNewDesign) {

        overviewNewDesign.addEventListener(
            "click",
            (event) => startNewDesign(event)
        );

    }


    if (emptyNewDesign) {

        emptyNewDesign.addEventListener(
            "click",
            (event) => startNewDesign(event)
        );

    }


    /* =====================================================
       MY DESIGNS
       Saved designs: continue, use as template,
       open report, delete.
    ===================================================== */

    async function loadDashboardPage(url, menuItem, loadingText, event) {

        if (event) {
            event.preventDefault();
        }

        if (!dashboardContent) {
            return;
        }

        dashboardContent.innerHTML =
            '<div style="padding:50px;text-align:center;">' + loadingText + '</div>';

        try {

            const response =
                await fetch(url, { credentials: "same-origin" });

            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }

            dashboardContent.innerHTML =
                await response.text();

            setActiveMenu(menuItem);

            window.scrollTo({ top: 0, behavior: "smooth" });

        }
        catch (error) {

            console.error("Page loading error:", url, error);

            dashboardContent.innerHTML =
                '<div style="padding:50px;text-align:center;">' +
                '<h2>Unable to load this page</h2>' +
                '<p>Please try again.</p></div>';

        }

    }


    function loadMyDesigns(event) {
        return loadDashboardPage("/design/my-designs", designsMenu, "Loading your designs...", event);
    }


    function loadReports(event) {
        return loadDashboardPage("/design/reports", reportsMenu, "Loading your reports...", event);
    }


    function loadProfile(event) {
        return loadDashboardPage("/profile", profileMenu, "Loading your profile...", event);
    }


    function startNewDesign(event) {

        /* A fresh New Design: forget which saved design was open,
           keep the values so "Start from" can offer them. */

        const DS = window.MotoMasterSession;

        if (DS) {

            const source = DS.getSource();

            if (DS.get("design_completed") === "1" || (source && source.mode === "copy")) {
                DS.set("design_id", null);
                DS.set("design_completed", null);
                DS.setSource(null);
            }

        }

        return loadNewDesign(event);

    }


    async function openSavedDesign(designId, mode) {

        const DS = window.MotoMasterSession;

        if (!DS) {
            return;
        }

        try {

            await DS.loadFromServer(designId, mode);

            await loadNewDesign();

        }
        catch (error) {

            alert(error.message);

        }

    }


    if (dashboardContent) {

        dashboardContent.addEventListener("click", async (event) => {

            const button =
                event.target.closest("[data-mm-action]");

            if (!button) {
                return;
            }

            const action =
                button.dataset.mmAction;

            if (action === "new") {
                event.preventDefault();
                startNewDesign();
                return;
            }

            if (action === "combine") {

                event.preventDefault();

                const ids =
                    Array.from(dashboardContent.querySelectorAll(".combine-check:checked"))
                        .map((box) => box.value);

                if (ids.length >= 2) {
                    window.location.href =
                        "/design/reports/combined?ids=" + encodeURIComponent(ids.join(","));
                }

                return;
            }

            if (action === "delete-report") {

                event.preventDefault();

                const reportRow =
                    button.closest("[data-report-id]");

                if (!reportRow || !confirm("Delete this report? The design itself is kept.")) {
                    return;
                }

                button.disabled = true;

                try {

                    const response =
                        await fetch("/design/api/reports/" + encodeURIComponent(reportRow.dataset.reportId), {
                            method: "DELETE",
                            credentials: "same-origin"
                        });

                    const body =
                        await response.json().catch(() => ({}));

                    if (!response.ok || !body.success) {
                        throw new Error(body.message || "Could not delete the report.");
                    }

                    loadReports();

                }
                catch (error) {

                    alert(error.message);

                    button.disabled = false;

                }

                return;
            }

            const row =
                button.closest("[data-design-id]");

            if (!row) {
                return;
            }

            const designId =
                row.dataset.designId;

            if (action === "edit" || action === "copy") {

                event.preventDefault();

                button.disabled = true;

                await openSavedDesign(designId, action);

                button.disabled = false;

                return;
            }

            if (action === "delete") {

                event.preventDefault();

                const name =
                    (row.querySelector(".my-design-title strong") || {}).textContent || "this design";

                if (!confirm("Delete " + name.trim() + "? Its reports will be deleted too.")) {
                    return;
                }

                button.disabled = true;

                try {

                    const response =
                        await fetch("/design/api/designs/" + encodeURIComponent(designId), {
                            method: "DELETE",
                            credentials: "same-origin"
                        });

                    const body =
                        await response.json().catch(() => ({}));

                    if (!response.ok || !body.success) {
                        throw new Error(body.message || "Could not delete the design.");
                    }

                    const DS = window.MotoMasterSession;

                    if (DS && String(DS.get("design_id")) === String(designId)) {
                        DS.set("design_id", null);
                        DS.setSource(null);
                    }

                    loadMyDesigns();

                }
                catch (error) {

                    alert(error.message);

                    button.disabled = false;

                }

            }

        });

    }


    /* =====================================================
       COMBINE REPORTS: tick boxes on the Reports page
    ===================================================== */

    const MAX_COMBINE = 20;

    function updateCombineState() {

        const checks =
            Array.from(dashboardContent.querySelectorAll(".combine-check"));

        const selected =
            checks.filter((box) => box.checked);

        checks.forEach((box) => {
            const row = box.closest(".my-design-row");
            if (row) {
                row.classList.toggle("is-selected", box.checked);
            }
        });

        const button = document.getElementById("combineButton");
        const hint = document.getElementById("combineHint");
        const all = document.getElementById("combineSelectAll");

        if (all) {
            all.checked = checks.length > 0 && selected.length === checks.length;
            all.indeterminate = selected.length > 0 && selected.length < checks.length;
        }

        if (button) {
            button.disabled = selected.length < 2 || selected.length > MAX_COMBINE;
            button.textContent =
                selected.length >= 2
                    ? "Combine " + selected.length + " reports"
                    : "Combine selected";
        }

        if (hint) {
            if (selected.length > MAX_COMBINE) {
                hint.textContent = "Up to " + MAX_COMBINE + " reports can be combined at once.";
            } else if (selected.length === 1) {
                hint.textContent = "Tick at least one more report.";
            } else if (selected.length >= 2) {
                hint.textContent = selected.length + " reports selected. Their performance will be shown side by side.";
            } else {
                hint.textContent = "Tick 2 or more reports to combine their performance into one report.";
            }
        }

    }


    if (dashboardContent) {

        dashboardContent.addEventListener("change", (event) => {

            if (event.target.id === "combineSelectAll") {

                const on = event.target.checked;

                dashboardContent
                    .querySelectorAll(".combine-check")
                    .forEach((box, index) => { box.checked = on && index < MAX_COMBINE; });

                updateCombineState();
                return;
            }

            if (event.target.classList.contains("combine-check")) {
                updateCombineState();
            }

        });

    }


    /* Keyboard: Enter / Space on clickable rows */

    if (dashboardContent) {

        dashboardContent.addEventListener("keydown", (event) => {

            const row = event.target.closest('[role="button"][data-mm-action]');

            if (row && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                row.click();
            }

        });

    }


    [designsMenu, viewAllDesigns].forEach((element) => {

        if (element) {
            element.addEventListener("click", loadMyDesigns);
        }

    });

    [reportsMenu, viewAllReports, document.getElementById("combineReportsLink")].forEach((element) => {

        if (element) {
            element.addEventListener("click", loadReports);
        }

    });

    if (profileMenu) {
        profileMenu.addEventListener("click", loadProfile);
    }


    /* =====================================================
       PROFILE FORMS
    ===================================================== */

    function showFormMessage(id, message, ok) {

        const box = document.getElementById(id);

        if (!box) {
            return;
        }

        box.textContent = message;
        box.classList.toggle("is-error", !ok);
        box.classList.toggle("is-success", !!ok);

    }


    async function postJson(url, data) {

        const response =
            await fetch(url, {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

        const body =
            await response.json().catch(() => ({}));

        return { ok: response.ok && body.success, body: body };

    }


    if (dashboardContent) {

        dashboardContent.addEventListener("submit", async (event) => {

            const form = event.target;

            if (form.id !== "profileForm" && form.id !== "passwordForm") {
                return;
            }

            event.preventDefault();

            const submit = form.querySelector('button[type="submit"]');
            const data = Object.fromEntries(new FormData(form).entries());

            if (submit) {
                submit.disabled = true;
            }

            try {

                if (form.id === "profileForm") {

                    const result = await postJson("/api/profile", data);

                    showFormMessage(
                        "profileMessage",
                        result.body.message || (result.ok ? "Saved." : "Could not save."),
                        result.ok
                    );

                    if (result.ok) {

                        const user = result.body.user;

                        /* keep the navbar and summary in step */
                        document.querySelectorAll(".dashboard-user-info strong, #profileSummaryName")
                            .forEach((el) => { el.textContent = user.name; });

                        const handle = document.querySelector(".dashboard-user-info span");
                        if (handle) { handle.textContent = "@" + user.username; }

                        const summary = document.getElementById("profileSummaryUser");
                        if (summary) { summary.textContent = "@" + user.username + " · " + user.email; }

                        document.querySelectorAll(".dashboard-user-avatar, #profileAvatar")
                            .forEach((el) => { el.textContent = (user.name[0] || "?").toUpperCase(); });

                    }

                } else {

                    const result = await postJson("/api/profile/password", data);

                    showFormMessage(
                        "passwordMessage",
                        result.body.message || (result.ok ? "Password changed." : "Could not change password."),
                        result.ok
                    );

                    if (result.ok) {
                        form.reset();
                    }

                }

            }
            catch (error) {

                showFormMessage(
                    form.id === "profileForm" ? "profileMessage" : "passwordMessage",
                    "Network error. Please try again.",
                    false
                );

            }
            finally {

                if (submit) {
                    submit.disabled = false;
                }

            }

        });

    }


    /* =====================================================
       OPEN A PAGE FROM THE ADDRESS BAR
       /dashboard?page=reports | designs | profile | new-design
    ===================================================== */

    (function openRequestedPage() {

        const params = new URLSearchParams(window.location.search);
        const page = params.get("page");

        const pages = {
            "reports": loadReports,
            "designs": loadMyDesigns,
            "profile": loadProfile,
            "new-design": () => startNewDesign()
        };

        if (page && pages[page]) {

            pages[page]();

            /* keep the address clean so a refresh shows the dashboard */
            window.history.replaceState({}, "", window.location.pathname);

        }

    })();


    /* =====================================================
       OTHER PLACEHOLDER BUTTONS
    ===================================================== */

    const placeholderItems = [

        subscriptionMenu,
        paymentsMenu,
        manageSubscription,
        choosePlan

    ];


    /* =====================================================
       PHONE MENU (☰)
       On small screens the sidebar collapses to a top bar;
       the button opens / closes the menu.
    ===================================================== */

    const sidebar =
        document.querySelector(".dashboard-sidebar");

    const sidebarToggle =
        document.getElementById("dashboardMenuToggle");

    function setSidebarMenu(open) {

        if (!sidebar || !sidebarToggle) {
            return;
        }

        sidebar.classList.toggle("is-open", open);

        sidebarToggle.setAttribute("aria-expanded", open ? "true" : "false");

        sidebarToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");

        sidebarToggle.textContent = open ? "✕" : "☰";

    }

    if (sidebar && sidebarToggle) {

        sidebarToggle.addEventListener("click", (event) => {

            event.stopPropagation();

            setSidebarMenu(!sidebar.classList.contains("is-open"));

        });

        sidebar
            .querySelectorAll(".dashboard-menu-item")
            .forEach((item) => {

                item.addEventListener("click", () => setSidebarMenu(false));

            });

        document.addEventListener("click", (event) => {

            if (
                sidebar.classList.contains("is-open") &&
                !sidebar.contains(event.target)
            ) {
                setSidebarMenu(false);
            }

        });

        document.addEventListener("keydown", (event) => {

            if (event.key === "Escape") {
                setSidebarMenu(false);
            }

        });

        window.addEventListener("resize", () => {

            if (window.innerWidth > 650) {
                setSidebarMenu(false);
            }

        });

    }


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