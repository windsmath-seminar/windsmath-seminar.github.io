// ---------------------------------
// ID badges (People page)
// Click a badge, or its round button, to flip it
// between the front (photo) and the profile on the back.
// ---------------------------------

(function () {

    const badges = document.querySelectorAll(".idcard");

    badges.forEach(function (badge) {

        const front = badge.querySelector(".idcard__front");
        const back = badge.querySelector(".idcard__back");

        function setFlipped(flipped, moveFocus) {

            badge.classList.toggle("is-flipped", flipped);

            // Only the visible face can be reached with the keyboard
            front.inert = flipped;
            back.inert = !flipped;

            badge.querySelectorAll(".idcard__flip").forEach(function (button) {
                button.setAttribute("aria-expanded", flipped ? "true" : "false");
            });

            if (moveFocus) {
                const face = flipped ? back : front;
                face.querySelector(".idcard__flip").focus({ preventScroll: true });
            }
        }

        badge.addEventListener("click", function (event) {

            // Links on the back open normally
            if (event.target.closest("a")) {
                return;
            }

            const fromButton = event.target.closest(".idcard__flip") !== null;
            setFlipped(!badge.classList.contains("is-flipped"), fromButton);
        });

        // Spotlight follows the pointer across the badge
        badge.addEventListener("pointermove", function (event) {
            if (event.pointerType !== "mouse") {
                return;
            }
            const rect = front.getBoundingClientRect();
            badge.style.setProperty("--spot-x", (event.clientX - rect.left) + "px");
            badge.style.setProperty("--spot-y", (event.clientY - rect.top) + "px");
            badge.classList.add("is-lit");
        });
        badge.addEventListener("pointerleave", function () {
            badge.classList.remove("is-lit");
        });
    });
})();
