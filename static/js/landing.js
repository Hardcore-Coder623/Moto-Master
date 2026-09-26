
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

    initAuthModals();

});


/* =========================================================
   MOBILE MENU
========================================================= */

function initMobileMenu() {

    const menuToggle = document.getElementById("menuToggle");

    const navLinks = document.querySelector(".nav-links");

    if (!menuToggle || !navLinks) {
        return;
    }


    menuToggle.addEventListener("click", () => {

        navLinks.classList.toggle("active");

    });


    navLinks.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            navLinks.classList.remove("active");

        });

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

            }


            openRegisterModal();

        });

    });

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

        setTimeout(() => {

            window.location.href =
                CONFIG.DASHBOARD_URL;

        }, 700);

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

        showAuthMessage(
            "Account created successfully. Please login.",
            "success"
        );


        /*
         * Do not automatically login here.
         *
         * Registration creates the account.
         * Login will create the Flask session.
         */


        setTimeout(() => {

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

        }, 900);

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

