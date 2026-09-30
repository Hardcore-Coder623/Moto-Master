/* =====================================================
   MOTO MASTER — DESIGN SESSION HELPERS

   The design forms keep their values in sessionStorage
   (one key per form field). These helpers clear, fill and
   read those values so a saved design can be re-opened or
   used as a template, and the current design can be saved.
===================================================== */

(function () {

    "use strict";

    /* Keys that are not design form values. */
    var KEEP_ALWAYS = ["selectedPlan"];

    /* Step 1 / 2 choices survive a "clear". */
    var KEEP_CHOICES = [
        "design_phase",
        "design_wire_type",
        "design_mechanical_component",
        "wire_type",
        "mechanical_component"
    ];

    function safe(fn, fallback) {
        try { return fn(); } catch (e) { return fallback; }
    }

    function keys() {
        return safe(function () {
            var list = [];
            for (var i = 0; i < sessionStorage.length; i++) {
                list.push(sessionStorage.key(i));
            }
            return list;
        }, []);
    }

    /* Remove every design value (keeps phase / wire / bearing unless told not to). */
    function clear(options) {
        var keepChoices = !(options && options.all);
        var keep = KEEP_ALWAYS.concat(keepChoices ? KEEP_CHOICES : []);

        keys().forEach(function (key) {
            if (keep.indexOf(key) === -1) {
                safe(function () { sessionStorage.removeItem(key); });
            }
        });
    }

    /* Write a { key: value } map from the server into sessionStorage. */
    function write(values, options) {
        var skip = (options && options.skip) || [];
        Object.keys(values || {}).forEach(function (key) {
            if (skip.indexOf(key) !== -1) {
                return;
            }
            var value = values[key];
            if (value === null || value === undefined) {
                return;
            }
            safe(function () { sessionStorage.setItem(key, String(value)); });
        });
    }

    /* Everything the forms have stored, for saving. */
    function all() {
        var out = {};
        keys().forEach(function (key) {
            if (KEEP_ALWAYS.indexOf(key) === -1) {
                out[key] = safe(function () { return sessionStorage.getItem(key); }, null);
            }
        });
        return out;
    }

    function get(key) {
        return safe(function () { return sessionStorage.getItem(key); }, null);
    }

    function set(key, value) {
        safe(function () {
            if (value === null || value === undefined) {
                sessionStorage.removeItem(key);
            } else {
                sessionStorage.setItem(key, String(value));
            }
        });
    }

    /* Where the current form values came from:
       { mode: "edit" | "copy" | "draft", label, phase } */
    function getSource() {
        return safe(function () { return JSON.parse(get("design_source") || "null"); }, null);
    }

    function setSource(source) {
        set("design_source", source ? JSON.stringify(source) : null);
    }

    /* Load a saved design from the server into the forms.
       mode "edit": keep its id so saving updates it.
       mode "copy": new design pre-filled with its values (Design No left empty). */
    function loadFromServer(designId, mode) {
        return fetch("/design/api/designs/" + encodeURIComponent(designId), {
            credentials: "same-origin"
        })
        .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
        .then(function (result) {
            if (!result.ok || !result.body.success) {
                throw new Error((result.body && result.body.message) || "Could not load the design.");
            }

            var design = result.body.design;

            clear({ all: true });

            write(result.body.values, {
                skip: mode === "copy" ? ["design_no", "designNo"] : []
            });

            set("design_id", mode === "edit" ? design.id : null);
            set("design_completed", null);

            setSource({
                mode: mode,
                id: design.id,
                label: design.design_name + (design.design_no ? " #" + design.design_no : ""),
                phase: design.phase
            });

            return design;
        });
    }

    window.MotoMasterSession = {
        clear: clear,
        write: write,
        all: all,
        get: get,
        set: set,
        getSource: getSource,
        setSource: setSource,
        loadFromServer: loadFromServer
    };

})();
