/* =====================================================
   MOTO MASTER — DESIGN MODULE
===================================================== */

/* =====================================================
   FORM KEYBOARD + MOUSE HELPERS  (all phases, all steps)

   • Enter in a field moves to the next field of the same
     step. Calculated (read-only) fields are skipped. After
     the last field, the Next / Continue button gets focus,
     so one more Enter goes to the next step.
   • The mouse wheel never changes a number field: the
     page scrolls instead.
===================================================== */

(function () {

    if (window.motoMasterFormKeysReady) {
        return;
    }

    window.motoMasterFormKeysReady = true;

    var FIELD_SELECTOR =
        "input:not([type=hidden]):not([type=button]):not([type=submit])" +
        ":not([type=checkbox]):not([type=radio]):not([type=file]), select";

    function usable(el) {
        return !el.disabled &&
            !el.readOnly &&
            el.tabIndex !== -1 &&
            el.getClientRects().length > 0;          /* visible */
    }

    function stepOf(el) {
        return el.closest(".design-form-step") ||
            el.closest(".design-section") ||
            el.closest(".design-module");
    }

    document.addEventListener("keydown", function (event) {

        if (event.key !== "Enter" || event.isComposing ||
            event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
            return;
        }

        var field = event.target;

        if (!field || !field.matches || !field.matches(FIELD_SELECTOR)) {
            return;
        }

        var step = stepOf(field);

        if (!step || !field.closest(".design-module")) {
            return;
        }

        event.preventDefault();

        var fields = Array.prototype.filter.call(
            step.querySelectorAll(FIELD_SELECTOR),
            usable
        );

        var next = fields[fields.indexOf(field) + 1];

        if (!next) {

            var buttons = step.querySelectorAll(
                ".design-next-button, .design-submit-button"
            );

            next = buttons[buttons.length - 1] || null;

        }

        if (next) {

            next.focus();                            /* blur fires "change" on the field */

            if (next.select && next.tagName === "INPUT") {
                try { next.select(); } catch (e) { /* date inputs */ }
            }

        } else {

            field.blur();

        }

    });

    /* Mouse wheel over a number field: scroll the page, never change the value. */

    document.addEventListener("wheel", function (event) {

        var field = event.target;

        if (field && field.type === "number" &&
            document.activeElement === field) {

            field.blur();

        }

    }, { passive: true });

})();


/* =====================================================
   WINDING CALCULATION CONSTANTS
   The small 2x2 box on the Winding page:
     Slot fill factor, B (flux density), LF (tooth loss), LY (yoke loss).
   Empty field = default value. Values are kept in sessionStorage
   (keys = the input ids) so they survive Back / Next and are saved
   with the design.
===================================================== */

window.MotoMasterConstants = (function () {

    function stored(key) {
        try { return sessionStorage.getItem(key); } catch (e) { return null; }
    }

    function num(raw) {
        var value = parseFloat(raw);
        return Number.isFinite(value) ? value : null;
    }

    /* Loss-factor default = what the stamping material gave (CRC 22, CRNO 8, M-47 2). */
    function stampingLoss(kind) {
        var value = num(stored("stamping_lf_" + kind));
        if (value === null) {
            value = num(stored("lf_" + kind));
        }
        return value === null ? 0 : value;
    }

    var FIELDS = [
        { id: "wc_fill_factor",  name: "fill", label: "Slot fill factor", min: 0.05, max: 1,   def: function () { return 0.47; } },
        { id: "wc_flux_density", name: "b",    label: "B",                min: 0.05, max: 3,   def: function () { return 0.47; } },
        { id: "wc_lf",           name: "lf",   label: "LF",               min: 0,    max: 100, def: function () { return stampingLoss("t"); } },
        { id: "wc_ly",           name: "ly",   label: "LY",               min: 0,    max: 100, def: function () { return stampingLoss("y"); } }
    ];

    function isValid(field, value) {
        return value !== null && value >= field.min && value <= field.max;
    }

    function read(field) {
        var raw = stored(field.id);
        var value = raw === null || raw === "" ? null : num(raw);
        if (isValid(field, value)) {
            return { value: value, custom: true };
        }
        return { value: field.def(), custom: false };
    }

    /* Values the calculations use right now. */
    function values() {
        var out = {};
        FIELDS.forEach(function (field) {
            out[field.name] = read(field).value;
        });
        return out;
    }

    function format(value) {
        return String(Math.round(value * 10000) / 10000);
    }

    function updateStatus() {
        var box = document.getElementById("wcStatus");
        var panel = document.getElementById("windingConstants");
        if (!box) {
            return;
        }
        var custom = FIELDS
            .map(function (field) { var r = read(field); return r.custom ? field.label + " " + format(r.value) : null; })
            .filter(Boolean);

        box.textContent = custom.length
            ? "Custom: " + custom.join(", ")
            : "Empty = default value";

        if (panel) {
            panel.classList.toggle("has-custom", custom.length > 0);
        }
    }

    /* Wire the inputs; onChange re-runs the page's calculations. */
    function bind(onChange) {

        FIELDS.forEach(function (field) {

            var input = document.getElementById(field.id);
            if (!input) {
                return;
            }

            input.placeholder = format(field.def());
            input.title = field.label + " — default " + format(field.def()) +
                " (allowed " + field.min + " to " + field.max + ")";

            var saved = stored(field.id);
            input.value = saved !== null ? saved : "";
            input.classList.remove("is-invalid");

            input.addEventListener("input", function () {

                var raw = input.value.trim();
                var value = raw === "" ? null : num(raw);

                if (raw === "") {
                    try { sessionStorage.removeItem(field.id); } catch (e) {}
                    input.classList.remove("is-invalid");
                }
                else if (isValid(field, value)) {
                    try { sessionStorage.setItem(field.id, String(value)); } catch (e) {}
                    input.classList.remove("is-invalid");
                }
                else {
                    /* out of range: keep calculating with the default */
                    try { sessionStorage.removeItem(field.id); } catch (e) {}
                    input.classList.add("is-invalid");
                }

                updateStatus();

                if (typeof onChange === "function") {
                    onChange();
                }

            });

        });

        var reset = document.getElementById("wcReset");

        if (reset) {
            reset.addEventListener("click", function () {
                FIELDS.forEach(function (field) {
                    try { sessionStorage.removeItem(field.id); } catch (e) {}
                    var input = document.getElementById(field.id);
                    if (input) {
                        input.value = "";
                        input.classList.remove("is-invalid");
                    }
                });
                updateStatus();
                if (typeof onChange === "function") {
                    onChange();
                }
            });
        }

        updateStatus();
    }

    return { values: values, bind: bind, fields: FIELDS };

})();


window.initializeDesignPage = function () {

/* =================================================
   RUN SCRIPTS HELPER
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

const startFrom =
    document.getElementById("startFrom");

const startFromHint =
    document.getElementById("startFromHint");

const DS =
    window.MotoMasterSession;


/* A finished design is not continued by a fresh New Design page:
   the next design starts from a copy of it instead. */

if (DS && DS.get("design_completed") === "1") {

    DS.set("design_id", null);
    DS.set("design_completed", null);
    DS.setSource(null);

}


/* =================================================
   SAVE STATUS (small message, bottom right)
================================================= */

function showSaveStatus(message, isError) {

    let box =
        document.getElementById("designSaveStatus");

    if (!box) {

        box = document.createElement("div");
        box.id = "designSaveStatus";
        box.className = "design-save-status";
        box.setAttribute("role", "status");
        document.body.appendChild(box);

    }

    box.textContent = message;
    box.classList.toggle("is-error", !!isError);
    box.classList.add("is-visible");

    clearTimeout(box._hideTimer);

    box._hideTimer = setTimeout(
        () => box.classList.remove("is-visible"),
        isError ? 6000 : 1800
    );

}


/* =================================================
   DEMO BANNER (demo users: 4 reports in total)
================================================= */

function updateDemoBanner(left) {

    const banner =
        document.getElementById("designDemoBanner");

    const text =
        document.getElementById("designDemoText");

    if (!banner || !text) {
        return;
    }

    const limit =
        banner.dataset.limit || "4";

    left = Math.max(0, Number(left) || 0);
    banner.dataset.left = String(left);
    banner.classList.toggle("is-used-up", left <= 0);

    text.textContent =
        left > 0
            ? left + " of " + limit + " design reports left (total for Single, Two and Three Phase)."
            : "You have used all " + limit + " demo design reports. Choose a plan to keep creating designs.";

}


/* =================================================
   SAVE TO DATABASE
   Runs on every Next and on the final Continue.
   Saves are queued so two quick clicks never
   create two designs.
================================================= */

let saveQueue =
    Promise.resolve(null);

function saveDesignToDb(step, finalize) {

    saveQueue =
        saveQueue.then(async () => {

            if (!DS) {
                return null;
            }

            const payload = {
                design_id: DS.get("design_id") || null,
                values: DS.all(),
                step: step,
                finalize: !!finalize
            };

            try {

                const response =
                    await fetch("/design/api/save", {
                        method: "POST",
                        credentials: "same-origin",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });

                const body =
                    await response.json().catch(() => ({}));

                if (body.code === "demo_limit") {

                    updateDemoBanner(0);
                    showSaveStatus(body.message, true);

                    return { demoLimit: true, message: body.message };
                }

                if (!response.ok || !body.success) {

                    showSaveStatus(
                        "Not saved: " + (body.message || ("error " + response.status)),
                        true
                    );

                    return null;
                }

                DS.set("design_id", body.design_id);

                const name =
                    DS.get("design_name") ||
                    DS.get("designName") ||
                    "Untitled design";

                const no =
                    DS.get("design_no") ||
                    DS.get("designNo");

                DS.setSource({
                    mode: "edit",
                    id: body.design_id,
                    label: name + (no ? " #" + no : ""),
                    phase: selectedPhase
                });

                if (finalize) {

                    DS.set("design_completed", "1");

                    if (body.demo) {

                        updateDemoBanner(body.demo.left);

                        showSaveStatus(
                            "Design saved · report added to your reports · " +
                            body.demo.left + " of " + body.demo.limit + " demo reports left"
                        );

                    } else {

                        showSaveStatus("Design saved · report added to your reports");

                    }

                } else {

                    showSaveStatus("Draft saved");

                }

                return body;

            }
            catch (error) {

                showSaveStatus(
                    "Not saved (offline?). Your values are kept in this browser.",
                    true
                );

                return null;
            }

        });

    return saveQueue;

}


/* =================================================
   START FROM (auto-fill from a previous design)
================================================= */

function currentSourceFor(phase) {

    const source =
        DS ? DS.getSource() : null;

    if (source && source.phase === phase) {
        return source;
    }

    return null;

}


async function populateStartFrom(phase) {

    if (!startFrom || !phase) {
        return;
    }

    const source =
        currentSourceFor(phase);

    let designs = [];
    let loadFailed = false;

    try {

        const response =
            await fetch(
                "/design/api/designs?phase=" + encodeURIComponent(phase),
                { credentials: "same-origin" }
            );

        const body =
            await response.json();

        if (response.ok && body.success) {
            designs = body.designs;
        } else {
            loadFailed = true;
        }

    }
    catch (error) {
        loadFailed = true;
    }

    startFrom.innerHTML = "";

    if (source) {

        const option = document.createElement("option");

        option.value = "current";

        option.textContent =
            source.mode === "copy"
                ? "Copy of " + source.label + " (already filled in)"
                : "Continue: " + source.label;

        startFrom.appendChild(option);

    }

    const blank = document.createElement("option");
    blank.value = "blank";
    blank.textContent = "Blank form";
    startFrom.appendChild(blank);

    const others =
        designs.filter((d) => !(source && source.mode === "edit" && d.id === source.id));

    if (others.length) {

        const group = document.createElement("optgroup");

        group.label = "Fill from a previous design";

        others.forEach((d) => {

            const option = document.createElement("option");

            option.value = String(d.id);

            option.textContent =
                d.design_name +
                (d.design_no ? " #" + d.design_no : "") +
                " · " + (d.status === "completed" ? "completed" : "draft") +
                " · " + d.updated_at;

            group.appendChild(option);

        });

        startFrom.appendChild(group);

    }

    /* Default: keep what is loaded, else the latest design, else blank. */

    if (source) {
        startFrom.value = "current";
    }
    else if (others.length) {
        startFrom.value = String(others[0].id);
    }
    else {
        startFrom.value = "blank";
    }

    updateStartFromHint(loadFailed);

}


function updateStartFromHint(loadFailed) {

    if (!startFromHint || !startFrom) {
        return;
    }

    if (loadFailed) {
        startFromHint.textContent =
            "Saved designs could not be loaded right now. You can still start a blank design.";
        return;
    }

    const value = startFrom.value;

    if (value === "current") {
        startFromHint.textContent =
            "Your forms keep the values already filled in.";
    }
    else if (value === "blank") {
        startFromHint.textContent =
            "All forms start empty.";
    }
    else {
        startFromHint.textContent =
            "Every form will be filled with this design's values (Design No. left empty). " +
            "It is saved as a new design; the original is not changed.";
    }

}


if (startFrom) {

    startFrom.addEventListener(
        "change",
        () => updateStartFromHint(false)
    );

}


/* Apply the choice just before Main Data opens. */

async function applyStartFrom() {

    if (!DS || !startFrom) {
        return;
    }

    const choice =
        startFrom.value || "blank";

    if (choice === "current") {
        return;
    }

    if (choice === "blank") {

        DS.clear();
        DS.set("design_id", null);
        DS.setSource(null);
        return;

    }

    try {

        await DS.loadFromServer(choice, "copy");

    }
    catch (error) {

        showSaveStatus(error.message, true);

    }

}


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


/* =================================================
   SAVE FROM IDS
================================================= */

function saveFromIds(ids) {

    for (let i = 0; i < ids.length; i++) {

        const element =
            document.getElementById(ids[i]);

        if (element) {

            ids.forEach((id) => {

                saveValue(
                    id,
                    element.value
                );

            });

            return element.value;
        }

    }

    return "";

}


/* =================================================
   RESTORE FORM FIELDS
================================================= */

function restoreFormFields(container) {

    const aliases = {

        design_no: [
            "design_no",
            "designNo"
        ],

        designNo: [
            "designNo",
            "design_no"
        ],

        design_name: [
            "design_name",
            "designName"
        ],

        designName: [
            "designName",
            "design_name"
        ],

        date: [
            "date",
            "designDate"
        ],

        designDate: [
            "designDate",
            "date"
        ]

    };


    container
        .querySelectorAll(
            "input, select, textarea"
        )
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

                element.value =
                    stored;

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

        restoreFormFields(
            container
        );

        runScripts(
            container
        );

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

            populateStartFrom(selectedPhase);

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

    if (wireType) {
        wireType.value =
            getValue("design_wire_type") ||
            getValue("wire_type");
    }

    if (mechanicalComponent) {
        mechanicalComponent.value =
            getValue("design_mechanical_component") ||
            getValue("mechanical_component");
    }

    populateStartFrom(selectedPhase);

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

            saveValue(
                "wire_type",
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

            saveValue(
                "mechanical_component",
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

            await applyStartFrom();

            /* Step 1 / 2 choices made on this page win over a template. */

            saveValue("design_phase", selectedPhase);
            saveValue("design_wire_type", wireType.value);
            saveValue("wire_type", wireType.value);
            saveValue("design_mechanical_component", mechanicalComponent.value);
            saveValue("mechanical_component", mechanicalComponent.value);

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

    saveFromIds([
        "designNo",
        "design_no"
    ]);

    saveFromIds([
        "designName",
        "design_name"
    ]);

    saveFromIds([
        "designDate",
        "date"
    ]);

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

            saveValue(
                "lf_y",
                y
            );

            saveValue(
                "lf_t",
                t
            );

            saveValue(
                "stamping_lf_y",
                y
            );

            saveValue(
                "stamping_lf_t",
                t
            );

        }

        if (value === "CRC") {

            saveLossFactors(
                "22",
                "22"
            );

        }
        else if (value === "CRNO") {

            saveLossFactors(
                "8",
                "8"
            );

        }
        else if (value === "M-47") {

            saveLossFactors(
                "2",
                "2"
            );

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

            saveDesignToDb(2);

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

                saveDesignToDb(3);

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

                saveDesignToDb(4);

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
   SAVE WINDING
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

            saveValue(
                id,
                element.value
            );

            saveValue(
                "winding_" + id,
                element.value
            );

        }

    });

    saveFromIds([
        "I_ph",
        "I_main"
    ]);

    saveFromIds([
        "cu_length",
        "culength"
    ]);

    saveFromIds([
        "air_gap",
        "airgap"
    ]);

    saveFromIds([
        "final_efficiency",
        "efficiency1"
    ]);

}


window.saveWindingFormData =
    saveWindingFormData;


/* =================================================
   SHOW REPORT
================================================= */

function showDesignReport(html) {

    let overlay =
        document.getElementById(
            "designReportOverlay"
        );

    if (!overlay) {

        overlay =
            document.createElement(
                "div"
            );

        overlay.id =
            "designReportOverlay";

        overlay.style.cssText =
            "position:fixed;inset:0;z-index:9999;" +
            "background:#f8f9fa;overflow:auto;";

        document.body.appendChild(
            overlay
        );

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
        document.createElement(
            "style"
        );

    printFix.textContent =
        "@media print { body > *:not(#designReportOverlay){display:none !important;} " +
        "#designReportOverlay{position:static;overflow:visible;} }";

    overlay.appendChild(
        printFix
    );

    Array.from(
        parsed.body.childNodes
    )
    .forEach((node) => {

        overlay.appendChild(
            node.cloneNode(true)
        );

    });

    const backButton =
        overlay.querySelector(
            ".back-button"
        );

    if (backButton) {

        backButton.onclick =
            function (event) {

                event.preventDefault();

                overlay.remove();

            };

    }

    /*
     * Print / Save PDF prints the report on its own
     * (in a hidden frame) so the dashboard layout can
     * never interfere with the A4 page.
     */

    const printButton =
        overlay.querySelector(
            "#btnPrint"
        );

    if (printButton) {

        printButton.onclick =
            function (event) {

                event.preventDefault();

                printReportHtml(
                    html
                );

            };

    }

    overlay.scrollTop = 0;

}


function printReportHtml(html) {

    const frame =
        document.createElement(
            "iframe"
        );

    frame.setAttribute(
        "aria-hidden",
        "true"
    );

    frame.style.cssText =
        "position:fixed;right:0;bottom:0;" +
        "width:210mm;height:297mm;border:0;" +
        "visibility:hidden;pointer-events:none;";

    frame.onload =
        function () {

            const win =
                frame.contentWindow;

            const cleanup =
                function () {
                    setTimeout(
                        function () {
                            frame.remove();
                        },
                        500
                    );
                };

            win.addEventListener(
                "afterprint",
                cleanup
            );

            setTimeout(
                function () {

                    win.focus();
                    win.print();

                },
                300
            );

        };

    frame.srcdoc =
        html;

    document.body.appendChild(
        frame
    );

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

                saveDesignToDb(4);

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

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Saving & generating report…";

                const saved =
                    await saveDesignToDb(4, true);

                if (saved && saved.demoLimit) {

                    alert(saved.message);

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Continue";

                    return;
                }

                try {

                    const response =
                        await fetch(
                            "/design/report",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(
                                        designData
                                    )

                            }
                        );

                    if (response.ok) {

                        const html =
                            await response.text();

                        showDesignReport(
                            html
                        );

                    }
                    else {

                        const err =
                            await response.text();

                        alert(
                            "Report error: " +
                            err
                        );

                    }

                }
                catch (error) {

                    alert(
                        "Failed to generate report: " +
                        error.message
                    );

                }
                finally {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Continue";

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
                getValue(
                    "connection"
                ),

            voltage:
                getNumber(
                    "voltage"
                ),

            power:
                getNumber(
                    "power"
                ),

            hp:
                getNumber(
                    "hp"
                ),

            frequency:
                getNumber(
                    "frequency"
                ),

            rpm:
                getNumber(
                    "rpm"
                ),

            pole:
                getNumber(
                    "pole"
                ),

            uph:
                getNumber(
                    "uph"
                ),

            capacitor:
                getNumber(
                    "capacitor"
                )

        },

        stamping_data: {

            material:
                getValue(
                    "material"
                ),

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
                getNumber(
                    "slip"
                ),

            temp:
                getNumber(
                    "temp"
                ),

            statorwt:
                getNumber(
                    "statorwt"
                ),

            rotorwt:
                getNumber(
                    "rotorwt"
                ),

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
                getNumber(
                    "angle"
                ),

            torque:
                getNumber(
                    "torque"
                ),

            I_aux:
                getNumber(
                    "I_aux"
                ),

            insulation_dia_aux:
                getNumber(
                    "insulation_dia_aux"
                ),

            actual_use_dia_aux:
                getNumber(
                    "actual_use_dia_aux"
                ),

            final_turns_aux:
                getNumber(
                    "final_turns_aux"
                )

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