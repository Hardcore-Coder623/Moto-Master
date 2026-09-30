
/* =========================================================
   MOTO MASTER - LANDING PAGE JAVASCRIPT
========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
========================================================= */

const CONFIG = Object.freeze({

    LOGIN_API: "/api/auth/login",

    REGISTER_API: "/api/auth/register",

    DASHBOARD_URL: "/dashboard"

});


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initMobileMenu();

    initScrollReveal();

    initNavbarScroll();

    initFooterYear();

    initPricing();

    initDemoStart();

    initAuthModals();

    showLoggedOutReason();

});


/* =========================================================
   LOGGED OUT BECAUSE OF A LOGIN ON ANOTHER DEVICE
   (one active login per account)
========================================================= */

function showLoggedOutReason() {

    const params =
        new URLSearchParams(window.location.search);

    if (params.get("reason") !== "other_device") {
        return;
    }

    window.history.replaceState({}, "", window.location.pathname);

    openLoginModal();

    showAuthMessage(
        "You were logged out because this account was logged in on another device. " +
        "Each account can be used on one device at a time.",
        "error"
    );

}


/* =========================================================
   MOBILE MENU
========================================================= */

function initMobileMenu() {

    const navbar = document.getElementById("navbar");

    const menuToggle = document.getElementById("menuToggle");

    const navLinks = document.querySelector(".nav-links");

    const navActions = document.querySelector(".nav-actions");

    if (!navbar || !menuToggle || !navLinks) {
        return;
    }


    /*
     * The CSS shows the phone menu when the navbar has
     * the class "nav-mobile-open" (see landing.css).
     */

    function setMenu(open) {

        navbar.classList.toggle("nav-mobile-open", open);

        document.body.classList.toggle("nav-menu-lock", open);

        menuToggle.setAttribute("aria-expanded", open ? "true" : "false");

        menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");

        menuToggle.textContent = open ? "✕" : "☰";

    }

    function isOpen() {
        return navbar.classList.contains("nav-mobile-open");
    }


    menuToggle.setAttribute("aria-controls", "navMenu");

    navLinks.id = navLinks.id || "navMenu";

    setMenu(false);


    menuToggle.addEventListener("click", (event) => {

        event.stopPropagation();

        setMenu(!isOpen());

    });


    /* Close after choosing a link or Login / Register. */

    [navLinks, navActions].forEach((group) => {

        if (!group) {
            return;
        }

        group.querySelectorAll("a, button").forEach((item) => {

            item.addEventListener("click", () => setMenu(false));

        });

    });


    /* Close when tapping outside the navbar. */

    document.addEventListener("click", (event) => {

        if (isOpen() && !navbar.contains(event.target)) {
            setMenu(false);
        }

    });


    /* Close with Escape. */

    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape" && isOpen()) {
            setMenu(false);
            menuToggle.focus();
        }

    });


    /* Reset when the screen becomes wide again. */

    window.addEventListener("resize", () => {

        if (window.innerWidth > 850 && isOpen()) {
            setMenu(false);
        }

    });

}


/* =========================================================
   SCROLL REVEAL
========================================================= */

function initScrollReveal() {

    const revealElements = document.querySelectorAll(
        ".reveal, .feature-card, .workflow-step, .pricing-card"
    );

    if (!revealElements.length) {
        return;
    }


    const observer = new IntersectionObserver(

        entries => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("visible");

                    observer.unobserve(entry.target);

                }

            });

        },

        {
            threshold: 0.12
        }

    );


    revealElements.forEach(element => {

        observer.observe(element);

    });

}


/* =========================================================
   NAVBAR SCROLL EFFECT
========================================================= */

function initNavbarScroll() {

    const navbar = document.getElementById("navbar");

    if (!navbar) {
        return;
    }


    function updateNavbar() {

        if (window.scrollY > 30) {

            navbar.classList.add("scrolled");

        } else {

            navbar.classList.remove("scrolled");

        }

    }


    window.addEventListener(
        "scroll",
        updateNavbar,
        { passive: true }
    );


    updateNavbar();

}


/* =========================================================
   FOOTER YEAR
========================================================= */

function initFooterYear() {

    const yearElement = document.getElementById("currentYear");

    if (!yearElement) {
        return;
    }


    yearElement.textContent = new Date().getFullYear();

}


/* =========================================================
   PRICING
========================================================= */

function initPricing() {

    const pricingButtons = document.querySelectorAll(
        ".pricing-card button, " +
        ".pricing-card .btn, " +
        "[data-plan]"
    );


    if (!pricingButtons.length) {
        return;
    }


    pricingButtons.forEach(button => {

        button.addEventListener("click", event => {

            const planElement =
                event.currentTarget.closest("[data-plan]");


            let plan = null;


            if (planElement) {

                plan =
                    planElement.dataset.plan ||
                    planElement.getAttribute("data-plan");

            }


            if (!plan) {

                plan =
                    event.currentTarget.dataset.plan ||
                    null;

            }


            if (plan) {

                sessionStorage.setItem(
                    "selectedPlan",
                    plan
                );

                sessionStorage.removeItem("startDemo");

            }


            openRegisterModal();

        });

    });

}


/* =========================================================
   FREE DEMO
   "Try Free Demo" -> create account (or log in) -> the
   dashboard opens straight on New Design. Any account
   without an active plan is a demo account: 4 design
   reports in total, all phases together.
========================================================= */

function initDemoStart() {

    document.querySelectorAll("[data-demo-start]").forEach(link => {

        link.addEventListener("click", event => {

            event.preventDefault();

            try {
                sessionStorage.setItem("startDemo", "1");
                sessionStorage.removeItem("selectedPlan");
            } catch (e) { /* storage blocked: still open the form */ }

            openRegisterModal();

        });

    });

}


function afterLoginUrl() {

    let demo = false;

    try {
        demo = sessionStorage.getItem("startDemo") === "1";
        sessionStorage.removeItem("startDemo");
    } catch (e) { /* ignore */ }

    return demo
        ? CONFIG.DASHBOARD_URL + "?page=new-design"
        : CONFIG.DASHBOARD_URL;

}


/* =========================================================
   AUTH MODALS
========================================================= */

function initAuthModals() {

    const loginModal =
        document.getElementById("loginModal");

    const registerModal =
        document.getElementById("registerModal");


    const navLogin =
        document.getElementById("navLogin");

    const navRegister =
        document.getElementById("navRegister");


    const closeLogin =
        document.getElementById("closeLogin");

    const closeRegister =
        document.getElementById("closeRegister");


    const showRegister =
        document.getElementById("showRegister");

    const showLogin =
        document.getElementById("showLogin");


    const loginForm =
        document.getElementById("loginForm");

    const registerForm =
        document.getElementById("registerForm");


    if (!loginModal || !registerModal) {
        return;
    }


    /* -----------------------------------------------------
       INITIAL STATE
    ----------------------------------------------------- */

    loginModal.classList.remove("active");
    registerModal.classList.remove("active");

    loginModal.setAttribute(
        "aria-hidden",
        "true"
    );

    registerModal.setAttribute(
        "aria-hidden",
        "true"
    );


    /* -----------------------------------------------------
       NAVBAR LOGIN
    ----------------------------------------------------- */

    if (navLogin) {

        navLogin.addEventListener("click", event => {

            event.preventDefault();

            openLoginModal();

        });

    }


    /* -----------------------------------------------------
       NAVBAR REGISTER
    ----------------------------------------------------- */

    if (navRegister) {

        navRegister.addEventListener("click", event => {

            event.preventDefault();

            /* normal sign-up = full account, not a demo */
            try { sessionStorage.removeItem("startDemo"); } catch (e) { /* ignore */ }

            openRegisterModal();

        });

    }


    /* -----------------------------------------------------
       CLOSE LOGIN
    ----------------------------------------------------- */

    if (closeLogin) {

        closeLogin.addEventListener("click", event => {

            event.preventDefault();

            closeLoginModal();

        });

    }


    /* -----------------------------------------------------
       CLOSE REGISTER
    ----------------------------------------------------- */

    if (closeRegister) {

        closeRegister.addEventListener("click", event => {

            event.preventDefault();

            closeRegisterModal();

        });

    }


    /* -----------------------------------------------------
       LOGIN → REGISTER
    ----------------------------------------------------- */

    if (showRegister) {

        showRegister.addEventListener("click", event => {

            event.preventDefault();

            closeLoginModal();

            openRegisterModal();

        });

    }


    /* -----------------------------------------------------
       REGISTER → LOGIN
    ----------------------------------------------------- */

    if (showLogin) {

        showLogin.addEventListener("click", event => {

            event.preventDefault();

            closeRegisterModal();

            openLoginModal();

        });

    }


    /* -----------------------------------------------------
       LOGIN FORM
    ----------------------------------------------------- */

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

    }


    /* -----------------------------------------------------
       REGISTER FORM
    ----------------------------------------------------- */

    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            handleRegister
        );

    }


    /* -----------------------------------------------------
       CLICK OUTSIDE CARD
    ----------------------------------------------------- */

    loginModal.addEventListener("click", event => {

        if (event.target === loginModal) {

            closeLoginModal();

        }

    });


    registerModal.addEventListener("click", event => {

        if (event.target === registerModal) {

            closeRegisterModal();

        }

    });


    /* -----------------------------------------------------
       ESCAPE KEY
    ----------------------------------------------------- */

    document.addEventListener("keydown", event => {

        if (event.key !== "Escape") {
            return;
        }


        if (loginModal.classList.contains("active")) {

            closeLoginModal();

        }


        if (registerModal.classList.contains("active")) {

            closeRegisterModal();

        }

    });

}


/* =========================================================
   OPEN LOGIN MODAL
========================================================= */

function openLoginModal() {

    const loginModal =
        document.getElementById("loginModal");

    const registerModal =
        document.getElementById("registerModal");


    if (!loginModal) {
        return;
    }


    if (registerModal) {

        registerModal.classList.remove("active");

        registerModal.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    loginModal.classList.add("active");

    loginModal.setAttribute(
        "aria-hidden",
        "false"
    );


    const loginInput =
        document.getElementById("login");


    if (loginInput) {

        setTimeout(() => {

            loginInput.focus();

        }, 50);

    }

}


/* =========================================================
   CLOSE LOGIN MODAL
========================================================= */

function closeLoginModal() {

    const loginModal =
        document.getElementById("loginModal");


    if (!loginModal) {
        return;
    }


    loginModal.classList.remove("active");

    loginModal.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* =========================================================
   OPEN REGISTER MODAL
========================================================= */

function openRegisterModal() {

    const registerModal =
        document.getElementById("registerModal");

    const loginModal =
        document.getElementById("loginModal");


    if (!registerModal) {
        return;
    }


    if (loginModal) {

        loginModal.classList.remove("active");

        loginModal.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    registerModal.classList.add("active");

    registerModal.setAttribute(
        "aria-hidden",
        "false"
    );


    const nameInput =
        document.getElementById("name");


    if (nameInput) {

        setTimeout(() => {

            nameInput.focus();

        }, 50);

    }

}


/* =========================================================
   CLOSE REGISTER MODAL
========================================================= */

function closeRegisterModal() {

    const registerModal =
        document.getElementById("registerModal");


    if (!registerModal) {
        return;
    }


    registerModal.classList.remove("active");

    registerModal.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* =========================================================
   LOGIN
========================================================= */

async function handleLogin(event) {

    event.preventDefault();


    const form =
        event.currentTarget;


    const login =
        document.getElementById("login")?.value.trim();


    const password =
        document.getElementById("loginPassword")?.value;


    /* -----------------------------------------------------
       BASIC VALIDATION
    ----------------------------------------------------- */

    if (!login) {

        showAuthMessage(
            "Please enter your username or email.",
            "error"
        );

        return;

    }


    if (!password) {

        showAuthMessage(
            "Please enter your password.",
            "error"
        );

        return;

    }


    const submitButton =
        form.querySelector(".auth-button");


    setButtonLoading(
        submitButton,
        true,
        "Login"
    );


    clearAuthMessage();


    try {

        const response =
            await fetch(
                CONFIG.LOGIN_API,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        login: login,

                        password: password

                    })
                }
            );


        const result =
            await response.json();


        if (!response.ok || !result.success) {

            showAuthMessage(
                result.message ||
                "Login failed.",
                "error"
            );

            return;

        }


        /* -------------------------------------------------
           LOGIN SUCCESS
        ------------------------------------------------- */

        showAuthMessage(
            "Login successful. Redirecting...",
            "success"
        );


        /*
         * Backend Flask session is already created.
         * The user can now be sent to the dashboard.
         */

        window.location.href =
            afterLoginUrl();

    }

    catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );


        showAuthMessage(
            "Unable to connect to the server.",
            "error"
        );

    }

    finally {

        setButtonLoading(
            submitButton,
            false,
            "Login"
        );

    }

}


/* =========================================================
   REGISTER
========================================================= */

async function handleRegister(event) {

    event.preventDefault();


    const form =
        event.currentTarget;


    const name =
        document.getElementById("name")?.value.trim();


    const username =
        document.getElementById("username")?.value.trim();


    const email =
        document.getElementById("email")?.value.trim();

    /* Account made from "Try Free Demo" = demo account (4 reports). */
    let isDemo = false;

    try {
        isDemo = sessionStorage.getItem("startDemo") === "1";
    } catch (e) { /* ignore */ }

    const phone =
        document.getElementById("phone")?.value.trim() || "";

    const phoneDigits =
        phone.replace(/[\s\-().]/g, "");


    const password =
        document.getElementById("registerPassword")?.value;


    const confirmPassword =
        document.getElementById("confirmPassword")?.value;


    /* -----------------------------------------------------
       BASIC VALIDATION
    ----------------------------------------------------- */

    if (!name) {

        showAuthMessage(
            "Please enter your full name.",
            "error"
        );

        return;

    }


    if (!username) {

        showAuthMessage(
            "Please choose a username.",
            "error"
        );

        return;

    }


    if (!email) {

        showAuthMessage(
            "Please enter your email address.",
            "error"
        );

        return;

    }


    if (!phone) {

        showAuthMessage(
            "Please enter your phone number.",
            "error"
        );

        return;
    }


    if (!/^\+?[0-9]{10,15}$/.test(phoneDigits)) {

        showAuthMessage(
            "Enter a valid phone number (10 to 15 digits, + country code allowed).",
            "error"
        );

        return;
    }


    if (!password) {

        showAuthMessage(
            "Please create a password.",
            "error"
        );

        return;

    }


    if (password.length < 8) {

        showAuthMessage(
            "Password must be at least 8 characters.",
            "error"
        );

        return;

    }


    if (password !== confirmPassword) {

        showAuthMessage(
            "Passwords do not match.",
            "error"
        );

        return;

    }


    const submitButton =
        form.querySelector(".auth-button");


    setButtonLoading(
        submitButton,
        true,
        "Create Account"
    );


    clearAuthMessage();


    try {

        const response =
            await fetch(
                CONFIG.REGISTER_API,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        name: name,

                        username: username,

                        email: email,

                        phone: phone,
                        demo: isDemo,

                        password: password,

                        confirm_password:
                            confirmPassword

                    })
                }
            );


        const result =
            await response.json();


        if (!response.ok || !result.success) {

            showAuthMessage(
                result.message ||
                "Registration failed.",
                "error"
            );

            return;

        }


        /* -------------------------------------------------
           REGISTRATION SUCCESS
        ------------------------------------------------- */

        /*
         * The server logs the new user in straight away,
         * so go to the dashboard (New Design for demo) now.
         */

        if (result.logged_in) {

            showAuthMessage(
                "Account created. Opening Moto Master...",
                "success"
            );

            window.location.href =
                afterLoginUrl();

            return;

        }

        showAuthMessage(
            "Account created successfully. Please login.",
            "success"
        );

        form.reset();
        clearAuthMessage();
        closeRegisterModal();
        openLoginModal();

        const loginInput =
            document.getElementById("login");

        if (loginInput) {
            loginInput.value =
                username;
        }

    }

    catch (error) {

        console.error(
            "REGISTER ERROR:",
            error
        );


        showAuthMessage(
            "Unable to connect to the server.",
            "error"
        );

    }

    finally {

        setButtonLoading(
            submitButton,
            false,
            "Create Account"
        );

    }

}


/* =========================================================
   AUTH MESSAGE
========================================================= */

function showAuthMessage(
    message,
    type = "error"
) {

    let messageElement =
        document.querySelector(
            ".auth-message"
        );


    /*
     * Create message element only when needed.
     * No HTML modification required.
     */

    if (!messageElement) {

        const activeModal =
            document.querySelector(
                ".auth-modal.active"
            );


        if (!activeModal) {
            return;
        }


        messageElement =
            document.createElement("div");


        messageElement.className =
            "auth-message";


        const form =
            activeModal.querySelector("form");


        if (form) {

            form.parentNode.insertBefore(
                messageElement,
                form
            );

        } else {

            activeModal
                .querySelector(".auth-modal-card")
                .appendChild(
                    messageElement
                );

        }

    }


    messageElement.textContent =
        message;


    messageElement.className =
        `auth-message ${type}`;


    /*
     * Inline styling keeps this functional
     * without changing your existing landing CSS.
     */

    messageElement.style.marginBottom =
        "12px";

    messageElement.style.padding =
        "9px 11px";

    messageElement.style.borderRadius =
        "7px";

    messageElement.style.fontSize =
        "12px";

    messageElement.style.textAlign =
        "center";


    if (type === "success") {

        messageElement.style.background =
            "#ecfdf5";

        messageElement.style.color =
            "#047857";

        messageElement.style.border =
            "1px solid #a7f3d0";

    } else {

        messageElement.style.background =
            "#fef2f2";

        messageElement.style.color =
            "#b91c1c";

        messageElement.style.border =
            "1px solid #fecaca";

    }

}


/* =========================================================
   CLEAR AUTH MESSAGE
========================================================= */

function clearAuthMessage() {

    const messages =
        document.querySelectorAll(
            ".auth-message"
        );


    messages.forEach(message => {

        message.remove();

    });

}


/* =========================================================
   BUTTON LOADING
========================================================= */

function setButtonLoading(
    button,
    loading,
    defaultText
) {

    if (!button) {
        return;
    }


    if (loading) {

        button.disabled = true;

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            "Please wait...";

        button.style.opacity =
            "0.7";

        button.style.cursor =
            "not-allowed";

    } else {

        button.disabled = false;

        button.textContent =
            button.dataset.originalText ||
            defaultText;

        button.style.opacity =
            "";

        button.style.cursor =
            "";

    }

}


/* =========================================================
   GENERIC ANCHOR PROTECTION
   Only prevent empty "#" links.
   Do NOT interfere with auth buttons.
========================================================= */

document.addEventListener(
    "click",
    event => {

        const link =
            event.target.closest("a[href='#']");


        if (!link) {
            return;
        }


        /*
         * Auth links already have their own
         * click handlers.
         */

        if (
            link.id === "navLogin" ||
            link.id === "navRegister" ||
            link.id === "showLogin" ||
            link.id === "showRegister"
        ) {
            return;
        }


        event.preventDefault();

    }
);

