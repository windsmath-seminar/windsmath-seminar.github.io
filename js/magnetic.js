// ---------------------------------
// Magnetic buttons (.magnetic)
// Within REACH px of the button, it leans towards the pointer (at most
// MAX px) and its label leans further (LABEL x), easing a share of the
// remaining distance each frame. Out of reach, it springs back home.
// The hover fill grows from the side the pointer came in.
// The label is optional: a whole card can be magnetic too.
// ---------------------------------

(function () {

    const REACH = 80;
    const MAX = 14;
    const LABEL = 1.6;
    const FOLLOW = 0.15;
    const PULL = 0.4;

    // Spring used for the return: a little overshoot, then settles
    const STIFFNESS = 0.12;
    const DAMPING = 0.72;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    document.querySelectorAll(".magnetic").forEach(function (button) {

        const label = button.querySelector(".magnetic__label");

        // Hover fill: start from the entry point, drain towards the exit point
        function setOrigin(event) {
            const rect = button.getBoundingClientRect();
            button.style.setProperty("--fill-x", (event.clientX - rect.left) + "px");
            button.style.setProperty("--fill-y", (event.clientY - rect.top) + "px");
        }
        button.addEventListener("pointerenter", setOrigin);
        button.addEventListener("pointerleave", setOrigin);

        // Press: shrink while held, spring back on release (CSS does the easing)
        button.addEventListener("pointerdown", function () {
            button.classList.add("is-pressed");
        });
        ["pointerup", "pointerleave", "pointercancel"].forEach(function (type) {
            button.addEventListener(type, function () {
                button.classList.remove("is-pressed");
            });
        });

        if (!finePointer) {
            return;
        }

        let x = 0, y = 0;            // current offset
        let vx = 0, vy = 0;          // velocity, for the spring back
        let targetX = 0, targetY = 0;
        let inReach = false;
        let frame = null;

        function render() {
            button.style.translate = x.toFixed(2) + "px " + y.toFixed(2) + "px";
            if (label) {
                label.style.translate = ((LABEL - 1) * x).toFixed(2) + "px " + ((LABEL - 1) * y).toFixed(2) + "px";
            }
        }

        function step() {
            if (inReach) {
                x += (targetX - x) * FOLLOW;
                y += (targetY - y) * FOLLOW;
                vx = vy = 0;
            } else {
                vx = (vx + (0 - x) * STIFFNESS) * DAMPING;
                vy = (vy + (0 - y) * STIFFNESS) * DAMPING;
                x += vx;
                y += vy;
            }
            render();

            const settled = Math.abs(targetX - x) < 0.05 && Math.abs(targetY - y) < 0.05 &&
                Math.abs(vx) < 0.05 && Math.abs(vy) < 0.05;
            if (settled) {
                x = targetX;
                y = targetY;
                render();
                frame = null;
                return;
            }
            frame = requestAnimationFrame(step);
        }

        function wake() {
            if (frame === null) {
                frame = requestAnimationFrame(step);
            }
        }

        window.addEventListener("pointermove", function (event) {
            if (event.pointerType !== "mouse") {
                return;
            }

            // Measure the button at rest, not where it has been pulled to
            const rect = button.getBoundingClientRect();
            const left = rect.left - x;
            const top = rect.top - y;
            const right = left + rect.width;
            const bottom = top + rect.height;

            const outX = Math.max(left - event.clientX, 0, event.clientX - right);
            const outY = Math.max(top - event.clientY, 0, event.clientY - bottom);
            const near = Math.hypot(outX, outY) <= REACH;

            if (near) {
                const dx = (event.clientX - (left + right) / 2) * PULL;
                const dy = (event.clientY - (top + bottom) / 2) * PULL;
                const length = Math.hypot(dx, dy);
                const scale = length > MAX ? MAX / length : 1;
                targetX = dx * scale;
                targetY = dy * scale;
            } else {
                targetX = targetY = 0;
            }

            if (near !== inReach || near) {
                inReach = near;
                wake();
            }
        }, { passive: true });

        document.documentElement.addEventListener("mouseleave", function () {
            inReach = false;
            targetX = targetY = 0;
            wake();
        });
    });
})();
