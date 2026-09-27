/* =====================================================
MOTO MASTER — DESIGN MODULE
===================================================== */

window.initializeDesignPage = function () {

/* =================================================
   RUN SCRIPTS HELPER
   innerHTML does not execute <script> tags.
   This clones and re-inserts them so they run.
================================================= */

function runScripts(container) {

    container
        .querySelectorAll("script")
        .forEach(function (oldScript) {

            var newScript =
                document.createElement("script");

            newScript.textContent =
                oldScript.textContent;

            Array.from(oldScript.attributes)
                .forEach(function (attr) {
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


/* =================================================
   ELEMENTS
================================================= */

const sectionPhase =
    document.getElementById("sectionPhase");

const sectionComponents =
    document.getElementById("sectionComponents");

const sectionForms =
    document.getElementById("sectionForms");

const phaseButtons =
    document.querySelectorAll(".phase-button");

const wireType =
    document.getElementById("wireType");

const mechanicalComponent =
    document.getElementById("mechanicalComponent");

const componentsNextButton =
    document.getElementById("componentsNextButton");

const selectedPhaseText =
    document.getElementById("selectedPhaseText");

const formMainData =
    document.getElementById("formMainData");

const formStamping =
    document.getElementById("formStamping");

const formRotor =
    document.getElementById("formRotor");

const formWinding =
    document.getElementById("formWinding");


/* =================================================
   STATE
================================================= */

let selectedPhase =
    sessionStorage.getItem("design_phase") || null;


/* =================================================
   INITIAL STATE
================================================= */

if (sectionComponents) {
    sectionComponents.classList.add("hidden");
}

if (sectionForms) {
    sectionForms.classList.add("hidden");
}

if (componentsNextButton) {
    componentsNextButton.disabled = true;
}


/* =================================================
   SAVE VALUE
================================================= */

function saveValue(key, value) {

    if (
        value === null ||
        value === undefined
    ) {
        return;
    }

    sessionStorage.setItem(
        key,
        value
    );
}


/* =================================================
   GET VALUE
================================================= */

function getValue(key) {

    return (
        sessionStorage.getItem(key) || ""
    );

}


/* =================================================
   GET NUMBER
================================================= */

function getNumber(key) {

    const value =
        parseFloat(
            sessionStorage.getItem(key)
        );

    return Number.isFinite(value)
        ? value
        : 0;

}


function getNumberAny(keys) {

    for (let i = 0; i < keys.length; i++) {

        const raw =
            sessionStorage.getItem(keys[i]);

        if (
            raw === null ||
            raw === ""
        ) {
            continue;
        }

        const value =
            parseFloat(raw);

        if (Number.isFinite(value)) {
            return value;
        }

    }

    return 0;

}


function getValueAny(keys) {

    for (let i = 0; i < keys.length; i++) {

        const value =
            sessionStorage.getItem(keys[i]);

        if (
            value !== null &&
            value !== ""
        ) {
            return value;
        }

    }

    return "";

}


function saveFromIds(ids) {

    for (let i = 0; i < ids.length; i++) {

        const element =
            document.getElementById(ids[i]);

        if (element) {

            ids.forEach((id) => {
                saveValue(id, element.value);
            });

            return element.value;
        }

    }

    return "";

}


function restoreFormFields(container) {

    const aliases = {
        design_no: ["design_no", "designNo"],
        designNo: ["designNo", "design_no"],
        design_name: ["design_name", "designName"],
        designName: ["designName", "design_name"],
        date: ["date", "designDate"],
        designDate: ["designDate", "date"]
    };

    container
        .querySelectorAll("input, select, textarea")
        .forEach((element) => {

            if (!element.id) {
                return;
            }

            const keys =
                aliases[element.id] ||
                [element.id];

            const stored =
                getValueAny(keys);

            if (stored !== "") {
                element.value = stored;
            }

        });

}


/* =================================================
   LOAD FORM HTML
================================================= */

async function loadForm(
    container,
    formName
) {

    if (!container) {
        return false;
    }

    if (!selectedPhase) {
        return false;
    }

    try {

        const response =
            await fetch(
                `/design/form/${selectedPhase}/${formName}`
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const html =
            await response.text();

        container.innerHTML =
            html;

        restoreFormFields(container);

        /* Run <script> tags inside the loaded form */

        runScripts(container);

        return true;

    }
    catch (error) {

        console.error(
            `Failed to load ${formName}:`,
            error
        );

        container.innerHTML = `
            <div class="design-placeholder">
                <h3>Unable to load form</h3>
                <p>
                    ${formName} could not be loaded.
                </p>
            </div>
        `;

        return false;
    }

}


/* =================================================
   LOAD MAIN DATA
================================================= */

async function loadMainData() {

    return await loadForm(
        formMainData,
        "main_data"
    );

}


/* =================================================
   LOAD STAMPING
================================================= */

async function loadStamping() {

    return await loadForm(
        formStamping,
        "stamping_parameter"
    );

}


/* =================================================
   LOAD ROTOR
================================================= */

async function loadRotor() {

    return await loadForm(
        formRotor,
        "rotor_parameter"
    );

}


/* =================================================
   LOAD WINDING
================================================= */

async function loadWinding() {

    const loaded =
        await loadForm(
            formWinding,
            "winding_parameter"
        );

    if (
        loaded &&
        typeof window.initializeWindingForm ===
        "function"
    ) {

        window.initializeWindingForm();

    }

    return loaded;

}


/* =================================================
   PHASE SELECTION
================================================= */

phaseButtons.forEach((button) => {

    button.addEventListener(
        "click",
        async () => {

            selectedPhase =
                button.dataset.phase;

            phaseButtons.forEach((item) => {

                item.classList.remove(
                    "selected"
                );

            });

            button.classList.add(
                "selected"
            );

            saveValue(
                "design_phase",
                selectedPhase
            );

            if (sectionComponents) {

                sectionComponents.classList.remove(
                    "hidden"
                );

            }

            if (wireType) {
                wireType.value =
                    getValue(
                        "design_wire_type"
                    );
            }

            if (mechanicalComponent) {
                mechanicalComponent.value =
                    getValue(
                        "design_mechanical_component"
                    );
            }

            checkComponentSelection();

            if (sectionComponents) {

                sectionComponents.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }

        }
    );

});


/* =================================================
   RESTORE PHASE
================================================= */

if (selectedPhase) {

    phaseButtons.forEach((button) => {

        if (
            button.dataset.phase ===
            selectedPhase
        ) {

            button.classList.add(
                "selected"
            );

        }

    });

    if (sectionComponents) {

        sectionComponents.classList.remove(
            "hidden"
        );

    }

}


/* =================================================
   COMPONENT SELECTION
================================================= */

function checkComponentSelection() {

    const wireSelected =
        wireType &&
        wireType.value !== "";

    const mechanicalSelected =
        mechanicalComponent &&
        mechanicalComponent.value !== "";

    if (componentsNextButton) {

        componentsNextButton.disabled =
            !(
                wireSelected &&
                mechanicalSelected
            );

    }

}


if (wireType) {

    wireType.addEventListener(
        "change",
        () => {

            saveValue(
                "design_wire_type",
                wireType.value
            );

            checkComponentSelection();

        }
    );

}


if (mechanicalComponent) {

    mechanicalComponent.addEventListener(
        "change",
        () => {

            saveValue(
                "design_mechanical_component",
                mechanicalComponent.value
            );

            checkComponentSelection();

        }
    );

}


checkComponentSelection();


/* =================================================
   SHOW FORM STEP
================================================= */

function showFormStep(step) {

    const steps = [

        formMainData,
        formStamping,
        formRotor,
        formWinding

    ];

    steps.forEach((item) => {

        if (item) {

            item.classList.add(
                "hidden"
            );

        }

    });

    if (step) {

        step.classList.remove(
            "hidden"
        );

    }

}


/* =================================================
   COMPONENTS → MAIN DATA
================================================= */

if (componentsNextButton) {

    componentsNextButton.addEventListener(
        "click",
        async () => {

            if (!selectedPhase) {
                return;
            }

            if (
                !wireType ||
                !wireType.value ||
                !mechanicalComponent ||
                !mechanicalComponent.value
            ) {

                return;

            }

            if (sectionForms) {

                sectionForms.classList.remove(
                    "hidden"
                );

            }

            if (selectedPhaseText) {

                if (
                    selectedPhase ===
                    "1_phase"
                ) {

                    selectedPhaseText.textContent =
                        "Single Phase";

                }
                else if (
                    selectedPhase ===
                    "2_phase"
                ) {

                    selectedPhaseText.textContent =
                        "Two Phase";

                }
                else if (
                    selectedPhase ===
                    "3_phase"
                ) {

                    selectedPhaseText.textContent =
                        "Three Phase";

                }

            }

            const loaded =
                await loadMainData();

            if (loaded) {

                showFormStep(
                    formMainData
                );

                attachMainDataEvents();

            }

            scrollToForms();

        }
    );

}


/* =================================================
   MAIN DATA
================================================= */

function saveMainData() {

    saveFromIds(["designNo", "design_no"]);
    saveFromIds(["designName", "design_name"]);
    saveFromIds(["designDate", "date"]);

    const fields = [

        "connection",
        "voltage",
        "power",
        "hp",
        "frequency",
        "rpm",
        "pole",
        "uph",
        "capacitor"

    ];

    fields.forEach((id) => {

        const element =
            document.getElementById(id);

        if (element) {

            saveValue(
                id,
                element.value
            );

        }

    });

}


/* =================================================
   STAMPING DATA
================================================= */

function saveStampingData() {

    const fields = [

        "material",
        "stamping_material",
        "N",
        "Y",
        "W",
        "W2",
        "A1",
        "shape",
        "a",
        "b",
        "c",
        "d",
        "e",
        "dw",
        "d0",
        "dia"

    ];

    fields.forEach((id) => {

        const element =
            document.getElementById(id);

        if (element) {

            saveValue(
                id,
                element.value
            );

        }

    });


    const stampingMaterial =
        document.getElementById(
            "stamping_material"
        );

    if (stampingMaterial) {

        const value =
            stampingMaterial.value;

        function saveLossFactors(y, t) {

            saveValue("lf_y", y);
            saveValue("lf_t", t);
            saveValue("stamping_lf_y", y);
            saveValue("stamping_lf_t", t);

        }

        if (value === "CRC") {

            saveLossFactors("22", "22");

        }
        else if (value === "CRNO") {

            saveLossFactors("8", "8");

        }
        else if (value === "M-47") {

            saveLossFactors("2", "2");

        }

    }

}


/* =================================================
   ROTOR DATA
================================================= */

function saveRotorData() {

    const fields = [

        "M",
        "rng_wt",
        "rng_ht",
        "X",
        "V",
        "V2",
        "A2",
        "ra",
        "rb",
        "rc",
        "rd",
        "re",
        "rw",
        "shaft_diameter"

    ];

    fields.forEach((id) => {

        const element =
            document.getElementById(id);

        if (element) {

            saveValue(
                id,
                element.value
            );

        }

    });

}


/* =================================================
   MAIN DATA → STAMPING
================================================= */

function attachMainDataEvents() {

    const button =
        document.getElementById(
            "mainDataNext"
        );

    if (!button) {
        return;
    }

    button.onclick =
        async () => {

            saveMainData();

            const loaded =
                await loadStamping();

            if (loaded) {

                showFormStep(
                    formStamping
                );

                attachStampingEvents();

            }

            scrollToForms();

        };

}


/* =================================================
   STAMPING EVENTS
================================================= */

function attachStampingEvents() {

    const nextButton =
        document.getElementById(
            "stampingNext"
        );

    const backButton =
        document.getElementById(
            "stampingBack"
        );


    if (nextButton) {

        nextButton.onclick =
            async () => {

                saveStampingData();

                const loaded =
                    await loadRotor();

                if (loaded) {

                    showFormStep(
                        formRotor
                    );

                    attachRotorEvents();

                }

                scrollToForms();

            };

    }


    if (backButton) {

        backButton.onclick =
            async () => {

                const loaded =
                    await loadMainData();

                if (loaded) {

                    showFormStep(
                        formMainData
                    );

                    attachMainDataEvents();

                }

                scrollToForms();

            };

    }

}


/* =================================================
   ROTOR EVENTS
================================================= */

function attachRotorEvents() {

    const nextButton =
        document.getElementById(
            "rotorNext"
        );

    const backButton =
        document.getElementById(
            "rotorBack"
        );


    if (nextButton) {

        nextButton.onclick =
            async () => {

                saveRotorData();

                const loaded =
                    await loadWinding();

                if (loaded) {

                    showFormStep(
                        formWinding
                    );

                    attachWindingEvents();

                }

                scrollToForms();

            };

    }


    if (backButton) {

        backButton.onclick =
            async () => {

                const loaded =
                    await loadStamping();

                if (loaded) {

                    showFormStep(
                        formStamping
                    );

                    attachStampingEvents();

                }

                scrollToForms();

            };

    }

}


/* =================================================
   SAVE WINDING (local session only)
================================================= */

function saveWindingFormData() {

    const fields = [

        "current_density",
        "efficiency",
        "I_ph",
        "I_main",
        "I_aux",
        "insulation_dia",
        "recommended_dia",
        "actual_use_dia",
        "recommended_turns",
        "final_turns",
        "insulation_dia_aux",
        "recommended_dia_aux",
        "actual_use_dia_aux",
        "recommended_turns_aux",
        "final_turns_aux",
        "recommended_stack_length",
        "final_stack_length",
        "slip",
        "temp",
        "statorwt",
        "rotorwt",
        "cu_length",
        "air_gap",
        "final_efficiency",
        "angle",
        "torque"

    ];

    fields.forEach((id) => {

        const element =
            document.getElementById(id);

        if (element) {

            saveValue(id, element.value);
            saveValue("winding_" + id, element.value);

        }

    });

    saveFromIds(["I_ph", "I_main"]);
    saveFromIds(["cu_length", "culength"]);
    saveFromIds(["air_gap", "airgap"]);
    saveFromIds(["final_efficiency", "efficiency1"]);

}


window.saveWindingFormData =
    saveWindingFormData;


/* =================================================
   SHOW REPORT (local data, no DB)
================================================= */

function showDesignReport(html) {

    let overlay =
        document.getElementById(
            "designReportOverlay"
        );

    if (!overlay) {

        overlay =
            document.createElement("div");

        overlay.id =
            "designReportOverlay";

        overlay.style.cssText =
            "position:fixed;inset:0;z-index:9999;" +
            "background:#f8f9fa;overflow:auto;";

        document.body.appendChild(overlay);

    }

    const parsed =
        new DOMParser().parseFromString(
            html,
            "text/html"
        );

    overlay.innerHTML = "";

    parsed
        .querySelectorAll("style")
        .forEach((styleNode) => {

            overlay.appendChild(
                styleNode.cloneNode(true)
            );

        });

    const printFix =
        document.createElement("style");

    printFix.textContent =
        "@media print { body > *:not(#designReportOverlay){display:none !important;} " +
        "#designReportOverlay{position:static;overflow:visible;} }";

    overlay.appendChild(printFix);

    Array.from(parsed.body.childNodes)
        .forEach((node) => {

            overlay.appendChild(
                node.cloneNode(true)
            );

        });

    const backButton =
        overlay.querySelector(".back-button");

    if (backButton) {

        backButton.onclick = function (event) {

            event.preventDefault();
            overlay.remove();

        };

    }

    overlay.scrollTop = 0;

}


/* =================================================
   WINDING EVENTS
================================================= */

function attachWindingEvents() {

    const backButton =
        document.getElementById(
            "windingBack"
        );

    const submitButton =
        document.getElementById(
            "submitDesign"
        );


    if (backButton) {

        backButton.onclick =
            async () => {

                saveWindingFormData();

                const loaded =
                    await loadRotor();

                if (loaded) {

                    showFormStep(
                        formRotor
                    );

                    attachRotorEvents();

                }

                scrollToForms();

            };

    }


    if (submitButton) {

        submitButton.onclick =
            async () => {

                saveWindingFormData();

                const designData =
                    collectDesignData();

                submitButton.disabled = true;
                submitButton.textContent = "Generating Report…";

                try {

                    const response =
                        await fetch(
                            "/design/report",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify(designData)
                            }
                        );

                    if (response.ok) {

                        const html =
                            await response.text();

                        showDesignReport(html);

                    } else {

                        const err = await response.text();
                        alert("Report error: " + err);

                    }

                } catch (error) {

                    alert("Failed to generate report: " + error.message);

                } finally {

                    submitButton.disabled = false;
                    submitButton.textContent = "Continue";

                }

            };

    }

}


/* =================================================
   COMPLETE DESIGN DATA
================================================= */

function collectDesignData() {

    return {

        phase:
            getValue(
                "design_phase"
            ),

        wire_type:
            getValue(
                "design_wire_type"
            ),

        mechanical_component:
            getValue(
                "design_mechanical_component"
            ),

        main_data: {

            design_no:
                getValueAny([
                    "designNo",
                    "design_no"
                ]),

            design_name:
                getValueAny([
                    "designName",
                    "design_name"
                ]),

            design_date:
                getValueAny([
                    "designDate",
                    "date"
                ]),

            connection:
                getValue("connection"),

            voltage:
                getNumber("voltage"),

            power:
                getNumber("power"),

            hp:
                getNumber("hp"),

            frequency:
                getNumber("frequency"),

            rpm:
                getNumber("rpm"),

            pole:
                getNumber("pole"),

            uph:
                getNumber("uph"),

            capacitor:
                getNumber("capacitor")

        },

        stamping_data: {

            material:
                getValue("material"),

            stamping_material:
                getValue(
                    "stamping_material"
                ),

            N:
                getNumber("N"),

            Y:
                getNumber("Y"),

            W:
                getNumber("W"),

            W2:
                getNumber("W2"),

            A1:
                getNumber("A1"),

            shape:
                getValue("shape"),

            a:
                getNumber("a"),

            b:
                getNumber("b"),

            c:
                getNumber("c"),

            d:
                getNumber("d"),

            e:
                getNumber("e"),

            dw:
                getNumber("dw"),

            d0:
                getNumber("d0"),

            dia:
                getNumber("dia"),

            lf_y:
                getNumber("lf_y"),

            lf_t:
                getNumber("lf_t")

        },

        rotor_data: {

            M:
                getNumber("M"),

            rng_wt:
                getNumber("rng_wt"),

            rng_ht:
                getNumber("rng_ht"),

            X:
                getNumber("X"),

            V:
                getNumber("V"),

            V2:
                getNumber("V2"),

            A2:
                getNumber("A2"),

            ra:
                getNumber("ra"),

            rb:
                getNumber("rb"),

            rc:
                getNumber("rc"),

            rd:
                getNumber("rd"),

            re:
                getNumber("re"),

            rw:
                getNumber("rw"),

            shaft_diameter:
                getNumber(
                    "shaft_diameter"
                )

        },

        winding_data: {

            current_density:
                getNumber(
                    "current_density"
                ),

            efficiency:
                getNumber(
                    "efficiency"
                ),

            I_ph:
                getNumberAny([
                    "I_ph",
                    "I_main"
                ]),

            insulation_dia:
                getNumber(
                    "insulation_dia"
                ),

            recommended_dia:
                getNumber(
                    "recommended_dia"
                ),

            actual_use_dia:
                getNumber(
                    "actual_use_dia"
                ),

            recommended_turns:
                getNumber(
                    "recommended_turns"
                ),

            final_turns:
                getNumber(
                    "final_turns"
                ),

            recommended_stack_length:
                getNumber(
                    "recommended_stack_length"
                ),

            final_stack_length:
                getNumber(
                    "final_stack_length"
                ),

            slip:
                getNumber("slip"),

            temp:
                getNumber("temp"),

            statorwt:
                getNumber("statorwt"),

            rotorwt:
                getNumber("rotorwt"),

            cu_length:
                getNumberAny([
                    "cu_length",
                    "culength"
                ]),

            air_gap:
                getNumberAny([
                    "air_gap",
                    "airgap"
                ]),

            final_efficiency:
                getNumberAny([
                    "final_efficiency",
                    "efficiency1"
                ]),

            angle:
                getNumber("angle"),

            torque:
                getNumber("torque"),

            // 1-phase / 2-phase auxiliary winding
            I_aux:
                getNumber("I_aux"),

            insulation_dia_aux:
                getNumber("insulation_dia_aux"),

            actual_use_dia_aux:
                getNumber("actual_use_dia_aux"),

            final_turns_aux:
                getNumber("final_turns_aux")

        }

    };

}


/* =================================================
   SCROLL
================================================= */

function scrollToForms() {

    if (sectionForms) {

        sectionForms.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


/* =================================================
   EXPOSE DATA
================================================= */

window.motoMasterDesign = {

    getData:
        collectDesignData,

    saveMainData:
        saveMainData,

    saveStampingData:
        saveStampingData,

    saveRotorData:
        saveRotorData,

    saveWindingFormData:
        saveWindingFormData,

    getNumber:
        getNumber,

    getValue:
        getValue

};

};