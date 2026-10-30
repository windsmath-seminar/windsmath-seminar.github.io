// ---------------------------------
// Event pages: the speaker photo tilts in 3D towards the mouse
// (up to 12 degrees on each axis) and settles back flat in 0.4s
// when the mouse leaves. Mouse only; touch screens keep it flat.
// ---------------------------------

(function () {

    const MAX_TILT = 12;    // degrees

    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        return;
    }

    document.querySelectorAll(".speaker-pic img, .og_all-pic img").forEach(function (photo) {

        const frame = photo.parentElement;
        frame.classList.add("tilt");

        frame.addEventListener("pointermove", function (event) {
            const rect = frame.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;    // -0.5 .. 0.5
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            photo.classList.add("is-tilting");
            photo.style.transform =
                "rotateX(" + (-y * 2 * MAX_TILT).toFixed(2) + "deg) " +
                "rotateY(" + (x * 2 * MAX_TILT).toFixed(2) + "deg)";
        });

        frame.addEventListener("pointerleave", function () {
            photo.classList.remove("is-tilting");
            photo.style.transform = "";
        });
    });
})();
