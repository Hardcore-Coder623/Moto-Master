
document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const designOptions =
        document.querySelectorAll(".design-option");

    const phaseOptions =
        document.querySelectorAll(".phase-option");

    const phaseSection =
        document.getElementById("phaseSection");

    const selectionStatus =
        document.getElementById("selectionStatus");

    const statusMessage =
        document.getElementById("statusMessage");


    /* =====================================================
       STATE
    ===================================================== */

    let selectedDesign = null;
    let selectedPhase = null;


    /* =====================================================
       INITIAL STATE
       PHASE BUTTONS DISABLED
    ===================================================== */

    phaseOptions.forEach((option) => {

        option.disabled = true;

    });


    /* =====================================================
       UPDATE STATUS
    ===================================================== */

    function updateStatus() {

        if (!selectedDesign && !selectedPhase) {

            statusMessage.textContent =
                "Select a design first.";

            selectionStatus.classList.remove(
                "ready"
            );

            return;
        }


        if (selectedDesign && !selectedPhase) {

            statusMessage.textContent =
                `Design ${selectedDesign} selected. Now select a phase.`;

            selectionStatus.classList.remove(
                "ready"
            );

            return;
        }


        if (selectedDesign && selectedPhase) {

            const phaseText =
                selectedPhase === "1_phase"
                    ? "1 Phase"
                    : "3 Phase";

            statusMessage.textContent =
                `Design ${selectedDesign} + ${phaseText} selected. Opening Form 1...`;

            selectionStatus.classList.add(
                "ready"
            );

        }

    }


    /* =====================================================
       SELECT DESIGN
    ===================================================== */

    designOptions.forEach((option) => {

        option.addEventListener(
            "click",
            () => {

                selectedDesign =
                    option.dataset.design;

                /* Remove previous selection */

                designOptions.forEach((item) => {

                    item.classList.remove(
                        "selected"
                    );

                });


                /* Select current design */

                option.classList.add(
                    "selected"
                );


                /* Enable phase options */

                phaseOptions.forEach((phase) => {

                    phase.disabled = false;

                });


                /* Reset previously selected phase */

                selectedPhase = null;

                phaseOptions.forEach((phase) => {

                    phase.classList.remove(
                        "selected"
                    );

                });


                updateStatus();


                /* Scroll to phase section */

                setTimeout(() => {

                    phaseSection.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });

                }, 100);

            }
        );

    });


    /* =====================================================
       SELECT PHASE
    ===================================================== */

    phaseOptions.forEach((option) => {

        option.addEventListener(
            "click",
            () => {

                /* Safety check */

                if (!selectedDesign) {

                    return;

                }


                selectedPhase =
                    option.dataset.phase;


                /* Remove previous phase selection */

                phaseOptions.forEach((item) => {

                    item.classList.remove(
                        "selected"
                    );

                });


                /* Select current phase */

                option.classList.add(
                    "selected"
                );


                updateStatus();


                /* =========================================
                   REDIRECT TO FORM 1
                ========================================== */

                setTimeout(() => {

                    const targetUrl =
                        `/dashboard/design/${selectedDesign}/${selectedPhase}/form1`;

                    window.location.href =
                        targetUrl;

                }, 500);

            }
        );

    });


    /* =====================================================
       BACK TO DASHBOARD
    ===================================================== */

    const dashboardBack =
        document.querySelector(".design-back");

    if (dashboardBack) {

        dashboardBack.addEventListener(
            "click",
            () => {

                window.location.href =
                    "/dashboard";

            }
        );

    }


    /* =====================================================
       INITIAL STATUS
    ===================================================== */

    updateStatus();

});

