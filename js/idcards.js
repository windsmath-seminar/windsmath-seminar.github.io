// ---------------------------------
// Hanging badges (People page)
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

    // ---------------------------------
    // Section titles written along the wire
    // The first wire of each section carries the section heading
    // (left) and its note (right), following the curve. The original
    // heading stays in the page for screen readers and narrow screens.
    // ---------------------------------

    const SVG_NS = "http://www.w3.org/2000/svg";
    const TEXT_ROOM = 26;
    let wireCount = 0;

    function addText(svg, pathId, content, offset, anchor, numberText) {
        const text = document.createElementNS(SVG_NS, "text");
        text.setAttribute("class", "lanyard__text");
        text.setAttribute("dy", "-8");
        const textPath = document.createElementNS(SVG_NS, "textPath");
        textPath.setAttribute("href", "#" + pathId);
        textPath.setAttribute("startOffset", offset);
        textPath.setAttribute("text-anchor", anchor);
        if (numberText) {
            const number = document.createElementNS(SVG_NS, "tspan");
            number.setAttribute("class", "lanyard__num");
            number.textContent = numberText + " ";
            textPath.appendChild(number);
        }
        textPath.appendChild(document.createTextNode(content));
        text.appendChild(textPath);
        svg.appendChild(text);
    }

    document.querySelectorAll(".lanyard").forEach(function (lanyard) {

        const section = lanyard.closest("section");
        const head = section && section.querySelector(".w-head");
        const isFirst = section && section.querySelector(".lanyard") === lanyard;

        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("class", "lanyard__wire");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");

        const pathId = "lanyard-wire-" + (++wireCount);
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("id", pathId);
        svg.appendChild(path);

        if (head && isFirst) {
            const heading = head.querySelector("h2");
            const number = heading.querySelector(".w-label__num");
            const title = heading.textContent.replace(number ? number.textContent : "", "").trim();
            addText(svg, pathId, title, "1.5%", "start", number ? number.textContent.trim() : "");

            const note = head.querySelector("p.w-label");
            if (note) {
                addText(svg, pathId, note.textContent.trim(), "98.5%", "end");
            }
            section.classList.add("has-wire-title");
        }

        lanyard.prepend(svg);
        lanyard.classList.add("has-svg-wire");

        // Same curve as the strings use: lowest point --sag below the ends
        function draw() {
            const width = lanyard.clientWidth;
            const sag = parseFloat(getComputedStyle(lanyard).getPropertyValue("--sag")) || 22;
            const top = TEXT_ROOM + 2;
            svg.setAttribute("width", width);
            svg.setAttribute("height", top + 2 * sag + 4);
            svg.setAttribute("viewBox", "0 0 " + width + " " + (top + 2 * sag + 4));
            path.setAttribute("d", "M0 " + top + " Q" + (width / 2) + " " + (top + 2 * sag) + " " + width + " " + top);
        }

        draw();
        window.addEventListener("resize", draw);
    });
})();
