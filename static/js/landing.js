/* =========================================================
   MOTO MASTER — LANDING PAGE CONTROLLER
   Flask Authentication + Session Integration
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const CONFIG = Object.freeze({

    LOGIN_URL: "/login",

    REGISTER_URL: "/register",

    DASHBOARD_URL: "/dashboard",

    API_BASE_URL: ""

});


/* =========================================================
   GLOBAL ELEMENTS
========================================================= */

const navbar =
    document.getElementById("navbar");

const menuToggle =
    document.getElementById("menuToggle");

const toast =
    document.getElementById("toast");

const year =
    document.getElementById("currentYear");


/* =========================================================
   TOAST
========================================================= */

let toastTimer;

function showToast(message) {

    if (!toast) return;

    toast.innerHTML = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 3200);
}


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

if (menuToggle) {

    menuToggle.addEventListener(
        "click",
        () => {

            const open =
                navbar.classList.toggle(
                    "nav-mobile-open"
                );

            menuToggle.textContent =
                open ? "✕" : "☰";

            menuToggle.setAttribute(
                "aria-label",
                open
                    ? "Close menu"
                    : "Open menu"
            );

            menuToggle.setAttribute(
                "aria-expanded",
                String(open)
            );

        }
    );

}


document
    .querySelectorAll(
        ".nav-links a, .nav-actions a"
    )
    .forEach(link => {

        link.addEventListener(
            "click",
            () => {

                navbar.classList.remove(
                    "nav-mobile-open"
                );

                if (menuToggle) {

                    menuToggle.textContent =
                        "☰";

                    menuToggle.setAttribute(
                        "aria-label",
                        "Open menu"
                    );

                    menuToggle.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                }

            }
        );

    });


/* =========================================================
   SCROLL REVEAL
========================================================= */

const revealElements =
    document.querySelectorAll(
        ".reveal"
    );


if ("IntersectionObserver" in window) {

    const revealObserver =
        new IntersectionObserver(
            entries => {

                entries.forEach(entry => {

                    if (
                        entry.isIntersecting
                    ) {

                        entry.target.classList.add(
                            "visible"
                        );

                        revealObserver.unobserve(
                            entry.target
                        );

                    }

                });

            },
            {
                threshold: 0.12
            }
        );


    revealElements.forEach(
        element =>
            revealObserver.observe(element)
    );

} else {

    revealElements.forEach(
        element =>
            element.classList.add("visible")
    );

}


/* =========================================================
   NAVBAR STATE
========================================================= */

function updateNavbar() {

    if (!navbar) return;

    navbar.classList.toggle(
        "scrolled",
        window.scrollY > 20
    );

}


updateNavbar();

window.addEventListener(
    "scroll",
    updateNavbar,
    {
        passive: true
    }
);


/* =========================================================
   PLAN SELECTION
========================================================= */

const planButtons =
    document.querySelectorAll(
        ".plan-btn"
    );


planButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const plan = {

                id: button.dataset.plan,

                name: button.dataset.planName,

                amount:
                    Number(
                        button.dataset.amount
                    ),

                days:
                    Number(
                        button.dataset.days
                    )

            };


            /*
             * Browser stores selected plan.
             *
             * Backend must independently
             * validate the plan and amount
             * before creating Razorpay order.
             */

            sessionStorage.setItem(
                "motoMasterSelectedPlan",
                JSON.stringify(plan)
            );


            const registerUrl =
                `${CONFIG.REGISTER_URL}?plan=${encodeURIComponent(plan.id)}`;


            showToast(
                `<strong>${plan.name} plan selected.</strong> Redirecting to secure registration...`
            );


            button.disabled = true;


            setTimeout(() => {

                window.location.href =
                    registerUrl;

            }, 450);

        }
    );

});


/* =========================================================
   GET STARTED / START DESIGNING
========================================================= */

document
    .querySelectorAll(
        'a[href="#pricing"]'
    )
    .forEach(link => {

        link.addEventListener(
            "click",
            () => {

                setTimeout(() => {

                    const firstPlan =
                        document.querySelector(
                            ".plan-btn"
                        );

                    if (firstPlan) {

                        firstPlan.focus({
                            preventScroll: true
                        });

                    }

                }, 500);

            }
        );

    });


/* =========================================================
   FOOTER YEAR
========================================================= */

if (year) {

    year.textContent =
        new Date().getFullYear();

}


/* =========================================================
   PREVENT EMPTY INTERNAL LINKS
========================================================= */

document
    .querySelectorAll(
        'a[href="#"]'
    )
    .forEach(link => {

        link.addEventListener(
            "click",
            event => {

                event.preventDefault();

            }
        );

    });


/* =========================================================
   LOGIN MODAL
========================================================= */

const loginModal =
    document.getElementById(
        "loginModal"
    );

const openLoginBtn =
    document.getElementById(
        "openLogin"
    );

const closeLoginBtn =
    document.getElementById(
        "closeLogin"
    );

const loginForm =
    document.getElementById(
        "loginForm"
    );


/* =========================================================
   OPEN LOGIN
========================================================= */

function openLoginModal() {

    if (!loginModal) return;


    loginModal.classList.add(
        "active"
    );


    loginModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "auth-modal-open"
    );


    setTimeout(() => {

        document
            .getElementById("loginEmail")
            ?.focus();

    }, 200);

}


/* =========================================================
   CLOSE LOGIN
========================================================= */

function closeLoginModal() {

    if (!loginModal) return;


    loginModal.classList.remove(
        "active"
    );


    loginModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "auth-modal-open"
    );

}


/* =========================================================
   LOGIN OPEN BUTTON
========================================================= */

openLoginBtn?.addEventListener(
    "click",
    openLoginModal
);


/* =========================================================
   LOGIN CLOSE BUTTON
========================================================= */

closeLoginBtn?.addEventListener(
    "click",
    closeLoginModal
);


/* =========================================================
   LOGIN CLICK OUTSIDE
========================================================= */

loginModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            loginModal
        ) {

            closeLoginModal();

        }

    }
);


/* =========================================================
   LOGIN ESCAPE
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            loginModal?.classList.contains(
                "active"
            )
        ) {

            closeLoginModal();

        }

    }
);


/* =========================================================
   LOGIN FORM
   BACKEND + FLASK SESSION
========================================================= */

loginForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const email =
            document
                .getElementById(
                    "loginEmail"
                )
                ?.value.trim();


        const password =
            document
                .getElementById(
                    "loginPassword"
                )
                ?.value;


        /* -------------------------------------------------
           LOGIN MESSAGE
        ------------------------------------------------- */

        let loginMessage =
            document.getElementById(
                "loginMessage"
            );


        if (!loginMessage) {

            loginMessage =
                document.createElement("p");


            loginMessage.id =
                "loginMessage";


            loginMessage.className =
                "auth-message";


            loginForm.appendChild(
                loginMessage
            );

        }


        loginMessage.textContent =
            "";


        loginMessage.style.color =
            "#dc2626";


        /* -------------------------------------------------
           VALIDATION
        ------------------------------------------------- */

        if (!email) {

            loginMessage.textContent =
                "Please enter your email address.";

            return;

        }


        if (!password) {

            loginMessage.textContent =
                "Please enter your password.";

            return;

        }


        /* -------------------------------------------------
           LOGIN REQUEST
        ------------------------------------------------- */

        try {

            const response =
                await fetch(
                    "/api/auth/login",
                    {

                        method: "POST",

                        /*
                         * Important:
                         * Allows Flask session cookie
                         * to be stored and sent.
                         */

                        credentials:
                            "same-origin",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                email: email,

                                password:
                                    password

                            })

                    }
                );


            const result =
                await response.json();


            /* -------------------------------------------------
               LOGIN FAILED
            ------------------------------------------------- */

            if (!response.ok) {

                loginMessage.textContent =
                    result.message ||
                    "Login failed.";

                return;

            }


            /* =========================================================
            LOGIN SUCCESS
            ========================================================= */

            loginMessage.style.color =
            "var(--blue-700)";


            loginMessage.textContent =
            "Login successful.";


            console.log(
            "Logged in user:",
            result.user
            );


            /* ---------------------------------------------------------
            REDIRECT TO USER DASHBOARD
            --------------------------------------------------------- */

            setTimeout(() => {

            window.location.href =
                CONFIG.DASHBOARD_URL;

            }, 500);


        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            loginMessage.textContent =
                "Unable to connect to the server.";

        }

    }
);


/* =========================================================
   REGISTER MODAL
========================================================= */

const registerModal =
    document.getElementById(
        "registerModal"
    );


const openRegister =
    document.getElementById(
        "openRegister"
    );


const closeRegister =
    document.getElementById(
        "closeRegister"
    );


const backToLogin =
    document.getElementById(
        "backToLogin"
    );


const registerForm =
    document.getElementById(
        "registerForm"
    );


const registerMessage =
    document.getElementById(
        "registerMessage"
    );


/* =========================================================
   OPEN REGISTER MODAL
========================================================= */

function openRegisterModal() {

    if (!registerModal) return;


    /* Close Login */

    closeLoginModal();


    /* Open Register */

    registerModal.classList.add(
        "active"
    );


    registerModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "auth-modal-open"
    );


    setTimeout(() => {

        document
            .getElementById(
                "registerName"
            )
            ?.focus();

    }, 200);

}


/* =========================================================
   CLOSE REGISTER MODAL
========================================================= */

function closeRegisterModal() {

    if (!registerModal) return;


    registerModal.classList.remove(
        "active"
    );


    registerModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "auth-modal-open"
    );

}


/* =========================================================
   CREATE ACCOUNT BUTTON
========================================================= */

openRegister?.addEventListener(
    "click",
    openRegisterModal
);


/* =========================================================
   REGISTER CLOSE BUTTON
========================================================= */

closeRegister?.addEventListener(
    "click",
    closeRegisterModal
);


/* =========================================================
   BACK TO LOGIN
========================================================= */

backToLogin?.addEventListener(
    "click",
    () => {

        closeRegisterModal();


        setTimeout(() => {

            openLoginModal();

        }, 150);

    }
);


/* =========================================================
   REGISTER CLICK OUTSIDE
========================================================= */

registerModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            registerModal
        ) {

            closeRegisterModal();

        }

    }
);


/* =========================================================
   REGISTER ESCAPE
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            registerModal?.classList.contains(
                "active"
            )
        ) {

            closeRegisterModal();

        }

    }
);


/* =========================================================
   REGISTER FORM
   BACKEND
========================================================= */

registerForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const name =
            document
                .getElementById(
                    "registerName"
                )
                ?.value.trim();


        const email =
            document
                .getElementById(
                    "registerEmail"
                )
                ?.value.trim();


        const password =
            document
                .getElementById(
                    "registerPassword"
                )
                ?.value;


        const confirmPassword =
            document
                .getElementById(
                    "registerConfirmPassword"
                )
                ?.value;


        const terms =
            document
                .getElementById(
                    "registerTerms"
                )
                ?.checked;


        registerMessage.textContent =
            "";


        registerMessage.style.color =
            "#dc2626";


        /* -------------------------------------------------
           VALIDATION
        ------------------------------------------------- */

        if (!name) {

            registerMessage.textContent =
                "Please enter your full name.";

            return;

        }


        if (!email) {

            registerMessage.textContent =
                "Please enter your email address.";

            return;

        }


        if (password.length < 8) {

            registerMessage.textContent =
                "Password must contain at least 8 characters.";

            return;

        }


        if (
            password !==
            confirmPassword
        ) {

            registerMessage.textContent =
                "Passwords do not match.";

            return;

        }


        if (!terms) {

            registerMessage.textContent =
                "Please accept the Terms & Conditions.";

            return;

        }


        /* -------------------------------------------------
           REGISTER REQUEST
        ------------------------------------------------- */

        try {

            const response =
                await fetch(
                    "/api/auth/register",
                    {

                        method: "POST",

                        credentials:
                            "same-origin",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                name: name,

                                email: email,

                                password:
                                    password,

                                confirm_password:
                                    confirmPassword

                            })

                    }
                );


            const result =
                await response.json();


            /* -------------------------------------------------
               REGISTER FAILED
            ------------------------------------------------- */

            if (!response.ok) {

                registerMessage.textContent =
                    result.message ||
                    "Registration failed.";

                return;

            }


            /* -------------------------------------------------
               REGISTER SUCCESS
            ------------------------------------------------- */

            registerMessage.style.color =
                "var(--blue-700)";


            registerMessage.textContent =
                "Registration successful.";


            registerForm.reset();


        } catch (error) {

            console.error(
                "Registration error:",
                error
            );


            registerMessage.textContent =
                "Unable to connect to the server.";

        }

    }
);