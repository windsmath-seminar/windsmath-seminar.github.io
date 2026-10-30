const synth = window.speechSynthesis;

let readBlocks = [];

let currentIndex = 0;
let currentChunkIndex = 0;
let currentChunks = [];

let currentUtterance = null;

let isPaused = false;
let readingActive = false;

let pauseTimer = null;
let pendingContinuation = null;

let runId = 0;


// ---------------------------------
// Reading rhythm
// ---------------------------------

// Pause after a normal sentence
const SENTENCE_PAUSE = 450;

// Pause after colon / semicolon
const CLAUSE_PAUSE = 250;

// Pause between blocks / paragraphs
const PARAGRAPH_PAUSE = 850;


// ---------------------------------
// Create player
// A round speaker button that opens the controls bar.
// The button can be dragged and snaps to the nearest edge:
// top / bottom -> the bar opens horizontally,
// left / right -> the bar opens vertically.
// ---------------------------------

const DOCK_STORAGE_KEY = "windsmath-read-aloud-dock";
const DOCK_MARGIN = 16;
const DRAG_THRESHOLD = 6;

const SPEAKER_ICON =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
    '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/>' +
    '<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    "</svg>";

const CLOSE_ICON =
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
    '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    "</svg>";

// Media keys: skip back (bar + triangle), play, pause, skip forward (mirror)
const PREV_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
    '<rect x="5" y="5" width="2.6" height="14" rx="1.3" fill="currentColor"/>' +
    '<path d="M18.5 6.3v11.4a1.2 1.2 0 0 1-1.86 1L9.1 13a1.2 1.2 0 0 1 0-2l7.54-5.7a1.2 1.2 0 0 1 1.86 1z" fill="currentColor"/>' +
    "</svg>";

const NEXT_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
    '<g transform="matrix(-1 0 0 1 24 0)">' +
    '<rect x="5" y="5" width="2.6" height="14" rx="1.3" fill="currentColor"/>' +
    '<path d="M18.5 6.3v11.4a1.2 1.2 0 0 1-1.86 1L9.1 13a1.2 1.2 0 0 1 0-2l7.54-5.7a1.2 1.2 0 0 1 1.86 1z" fill="currentColor"/>' +
    "</g></svg>";

const PLAY_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
    '<path d="M8 5.9v12.2a1.2 1.2 0 0 0 1.84 1.02l9.6-6.1a1.2 1.2 0 0 0 0-2.04l-9.6-6.1A1.2 1.2 0 0 0 8 5.9z" fill="currentColor"/>' +
    "</svg>";

const PAUSE_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
    '<rect x="6.5" y="5" width="3.8" height="14" rx="1.2" fill="currentColor"/>' +
    '<rect x="13.7" y="5" width="3.8" height="14" rx="1.2" fill="currentColor"/>' +
    "</svg>";

// Speed menu: three dots, then a tortoise (0.5x) and a hare (1.5x)
const DOTS_ICON =
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
    '<circle cx="12" cy="5.5" r="2" fill="currentColor"/>' +
    '<circle cx="12" cy="12" r="2" fill="currentColor"/>' +
    '<circle cx="12" cy="18.5" r="2" fill="currentColor"/>' +
    "</svg>";

const HARE_SHAPE =
    '<ellipse cx="10" cy="15.5" rx="6.2" ry="4.3"/>' +
    '<circle cx="16.6" cy="11.4" r="3"/>' +
    '<ellipse cx="15.4" cy="6" rx="1.25" ry="3.5" transform="rotate(-14 15.4 6)"/>' +
    '<ellipse cx="18.1" cy="6.4" rx="1.15" ry="3.2" transform="rotate(16 18.1 6.4)"/>' +
    '<circle cx="3.6" cy="13.6" r="1.7"/>' +
    '<ellipse cx="13.4" cy="19.7" rx="2.7" ry="1.05"/>';

const TORTOISE_ICON =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false"><g fill="currentColor">' +
    '<path d="M3.5 15.2C4 10.4 7.4 7.6 11 7.6s7 2.8 7.5 7.6z"/>' +
    '<ellipse cx="20.1" cy="13.4" rx="2.3" ry="1.9"/>' +
    '<rect x="5.6" y="14.6" width="2.8" height="3.6" rx="1.1"/>' +
    '<rect x="13.6" y="14.6" width="2.8" height="3.6" rx="1.1"/>' +
    '<path d="M3.9 14.2L1.8 15.6 4.1 15.9z"/>' +
    "</g></svg>";

const HARE_ICON =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false"><g fill="currentColor">' +
    HARE_SHAPE +
    "</g></svg>";

function createReadAloudPlayer() {

    // Prevent duplicate players
    if (document.getElementById("readAloudPlayer")) {
        return;
    }

    const player = document.createElement("div");

    player.id = "readAloudPlayer";
    player.className = "ra";

    player.innerHTML = `
        <button type="button"
                class="ra__fab"
                aria-expanded="false"
                aria-controls="readAloudPanel"
                aria-label="Open read-aloud controls"
                data-tip="Listen to this page">
            <span class="ra__icon ra__icon--speaker">${SPEAKER_ICON}</span>
            <span class="ra__icon ra__icon--close">${CLOSE_ICON}</span>
        </button>

        <div class="ra__panel"
             id="readAloudPanel"
             role="region"
             aria-label="Read aloud controls"
             hidden>

            <div class="ra__status-wrap">
                <strong class="ra__title">Listen to this page</strong>
                <span id="readStatus" class="ra__status" aria-live="polite">Ready</span>
            </div>

            <button id="readPrev" class="ra__btn" type="button"
                    aria-label="Previous section" data-tip="Previous section">${PREV_ICON}</button>

            <button id="readPlay" class="ra__btn ra__btn--main" type="button"
                    aria-label="Listen to this page" data-tip="Play">${PLAY_ICON}</button>

            <!-- Not shown in the fan: the play key pauses and resumes -->
            <button id="readStop" class="ra__btn" type="button" hidden
                    aria-label="Stop reading" data-tip="Stop">&#9632;</button>

            <button id="readNext" class="ra__btn" type="button"
                    aria-label="Next section" data-tip="Next section">${NEXT_ICON}</button>

            <div class="ra__speed">
                <!-- The real setting; the keys below set it -->
                <select id="readSpeed" class="ra__speed-select" aria-hidden="true" tabindex="-1">
                    <option value="0.5">0.5&times;</option>
                    <option value="1" selected>1.0&times;</option>
                    <option value="1.5">1.5&times;</option>
                </select>
                <!-- One shape: the square and two circles melt together (SVG filter) -->
                <div class="ra__goo" aria-hidden="true">
                    <span class="ra__goo-base"></span>
                    <span class="ra__goo-dot"></span>
                    <span class="ra__goo-dot"></span>
                </div>
                <button type="button" class="ra__speed-toggle" aria-expanded="false"
                        aria-label="Reading speed" data-tip="Speed">${DOTS_ICON}</button>
                <button type="button" class="ra__speed-opt" data-speed="0.5" tabindex="-1"
                        aria-pressed="false" aria-label="Slow: 0.5 times" data-tip="0.5&times;">${TORTOISE_ICON}</button>
                <button type="button" class="ra__speed-opt" data-speed="1.5" tabindex="-1"
                        aria-pressed="false" aria-label="Fast: 1.5 times" data-tip="1.5&times;">${HARE_ICON}</button>
            </div>
        </div>

        <svg class="ra__defs" width="0" height="0" aria-hidden="true" focusable="false">
            <filter id="ra-goo" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
                <feColorMatrix in="blur" mode="matrix"
                               values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo"/>
                <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
            </filter>
        </svg>
    `;

    document.body.appendChild(player);

    initReadAloudDock(player);
}


function initReadAloudDock(player) {

    const fab = player.querySelector(".ra__fab");
    const panel = player.querySelector(".ra__panel");
    const speed = player.querySelector(".ra__speed");
    const speedSelect = player.querySelector("#readSpeed");
    const speedToggle = speed.querySelector(".ra__speed-toggle");
    const speedOptions = Array.from(speed.querySelectorAll(".ra__speed-opt"));
    const gooDots = Array.from(speed.querySelectorAll(".ra__goo-dot"));

    // Default: bottom-right corner
    let dock = { edge: "bottom", frac: 1 };

    try {
        const saved = JSON.parse(localStorage.getItem(DOCK_STORAGE_KEY));
        if (
            saved &&
            ["top", "bottom", "left", "right"].indexOf(saved.edge) !== -1 &&
            typeof saved.frac === "number"
        ) {
            dock = { edge: saved.edge, frac: Math.min(1, Math.max(0, saved.frac)) };
        }
    } catch (e) {
        /* storage unavailable: keep the default position */
    }

    function saveDock() {
        try {
            localStorage.setItem(DOCK_STORAGE_KEY, JSON.stringify(dock));
        } catch (e) {
            /* storage unavailable: position is not remembered */
        }
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function viewport() {
        return {
            w: document.documentElement.clientWidth,
            h: window.innerHeight
        };
    }

    // Keep clear of the sticky navigation bar
    function topLimit() {
        const nav = document.querySelector(".site-nav");
        const navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
        return Math.max(DOCK_MARGIN, navBottom + 12);
    }

    function isOpen() {
        return fab.getAttribute("aria-expanded") === "true";
    }

    function isVertical() {
        return dock.edge === "left" || dock.edge === "right";
    }

    // Position the dock from its edge + fraction.
    // The bar opens toward the side with more room, so the
    // round button itself stays where the user left it.
    function place() {

        const vp = viewport();
        const size = fab.offsetWidth || 52;
        const vertical = isVertical();
        const growBack = dock.frac > 0.5;
        const minTop = topLimit();

        player.dataset.edge = dock.edge;
        player.classList.toggle("ra--vertical", vertical);
        player.classList.toggle("ra--reverse", growBack);

        const w = player.offsetWidth;
        const h = player.offsetHeight;
        let left;
        let top;

        if (vertical) {
            const fabTop = clamp(dock.frac * vp.h - size / 2, minTop, vp.h - size - DOCK_MARGIN);
            top = growBack ? fabTop + size - h : fabTop;
            top = clamp(top, minTop, Math.max(minTop, vp.h - h - DOCK_MARGIN));
            left = dock.edge === "left" ? DOCK_MARGIN : vp.w - w - DOCK_MARGIN;
        } else {
            const fabLeft = clamp(dock.frac * vp.w - size / 2, DOCK_MARGIN, vp.w - size - DOCK_MARGIN);
            left = growBack ? fabLeft + size - w : fabLeft;
            left = clamp(left, DOCK_MARGIN, Math.max(DOCK_MARGIN, vp.w - w - DOCK_MARGIN));
            top = dock.edge === "top" ? minTop : vp.h - h - DOCK_MARGIN;
        }

        player.style.left = left + "px";
        player.style.top = top + "px";
    }

    // ---------------------------------
    // Open / close
    // ---------------------------------

    let closeTimer = null;

    // Fan: every control swings out from the round button, nearest first,
    // FAN_STEP ms apart. Each one pivots on the button's centre, starting
    // folded towards the middle of the screen.
    const FAN_STEP = 60;
    const FAN_CLOSE_STEP = 30;
    const FAN_ANGLE = 60;

    function fanItems() {
        return Array.prototype.filter.call(panel.children, function (item) {
            return item.offsetWidth > 1;
        });
    }

    function measureFan() {

        const items = fanItems();
        const fabX = fab.offsetLeft + fab.offsetWidth / 2;
        const fabY = fab.offsetTop + fab.offsetHeight / 2;
        const playerRect = player.getBoundingClientRect();
        const middleX = viewport().w / 2 - playerRect.left;
        const middleY = viewport().h / 2 - playerRect.top;

        const measured = items.map(function (item) {
            const x = item.offsetLeft + item.offsetWidth / 2;
            const y = item.offsetTop + item.offsetHeight / 2;
            return { item: item, x: x, y: y, distance: Math.hypot(x - fabX, y - fabY) };
        });

        measured.sort(function (a, b) {
            return a.distance - b.distance;
        });

        measured.forEach(function (m, index) {

            // Fold towards whichever side is nearer the middle of the screen
            const dx = m.x - fabX;
            const dy = m.y - fabY;
            const rad = FAN_ANGLE * Math.PI / 180;
            const cw = Math.hypot(fabX + dx * Math.cos(rad) - dy * Math.sin(rad) - middleX,
                                  fabY + dx * Math.sin(rad) + dy * Math.cos(rad) - middleY);
            const ccw = Math.hypot(fabX + dx * Math.cos(-rad) - dy * Math.sin(-rad) - middleX,
                                   fabY + dx * Math.sin(-rad) + dy * Math.cos(-rad) - middleY);

            m.item.style.setProperty("--fan-origin", (fabX - m.item.offsetLeft) + "px " + (fabY - m.item.offsetTop) + "px");
            m.item.style.setProperty("--fan-angle", (cw < ccw ? FAN_ANGLE : -FAN_ANGLE) + "deg");
            m.item.style.setProperty("--fan-in", (index * FAN_STEP) + "ms");
            m.item.style.setProperty("--fan-out", ((measured.length - 1 - index) * FAN_CLOSE_STEP) + "ms");
        });

        return measured.length;
    }

    function setOpen(open) {

        clearTimeout(closeTimer);

        fab.setAttribute("aria-expanded", open ? "true" : "false");
        fab.setAttribute("aria-label", open ? "Close read-aloud controls" : "Open read-aloud controls");

        if (open) {
            panel.hidden = false;
            place();
            measureFan();
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    player.classList.add("is-open");
                });
            });
        } else {
            setSpeedOpen(false);
            const count = measureFan();
            player.classList.remove("is-open");
            closeTimer = setTimeout(function () {
                panel.hidden = true;
                place();
            }, count * FAN_CLOSE_STEP + 260);
        }
    }

    // ---------------------------------
    // Drag, then snap to the nearest edge
    // ---------------------------------

    let drag = null;
    let suppressClick = false;

    fab.addEventListener("pointerdown", function (event) {

        if (event.button !== 0) {
            return;
        }

        const rect = fab.getBoundingClientRect();

        drag = {
            id: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            moved: false
        };

        try {
            fab.setPointerCapture(event.pointerId);
        } catch (e) {
            /* capture unsupported: dragging still works while over the button */
        }
    });

    fab.addEventListener("pointermove", function (event) {

        if (!drag || event.pointerId !== drag.id) {
            return;
        }

        if (!drag.moved) {

            const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);

            if (distance < DRAG_THRESHOLD) {
                return;
            }

            drag.moved = true;

            // Collapse instantly while dragging
            if (isOpen()) {
                clearTimeout(closeTimer);
                player.classList.remove("is-open");
                panel.hidden = true;
                fab.setAttribute("aria-expanded", "false");
                fab.setAttribute("aria-label", "Open read-aloud controls");
            }

            player.classList.remove("ra--reverse");
            player.classList.add("is-dragging");
        }

        const vp = viewport();
        const size = fab.offsetWidth;

        player.style.left = clamp(event.clientX - drag.offsetX, 0, vp.w - size) + "px";
        player.style.top = clamp(event.clientY - drag.offsetY, 0, vp.h - size) + "px";
    });

    function endDrag(event) {

        if (!drag || event.pointerId !== drag.id) {
            return;
        }

        const moved = drag.moved;
        drag = null;

        if (!moved) {
            return;
        }

        suppressClick = true;
        player.classList.remove("is-dragging");

        const vp = viewport();
        const rect = fab.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const distances = {
            left: cx,
            right: vp.w - cx,
            top: cy - topLimit(),
            bottom: vp.h - cy
        };

        const edge = Object.keys(distances).reduce(function (a, b) {
            return distances[a] <= distances[b] ? a : b;
        });

        dock = {
            edge: edge,
            frac: edge === "top" || edge === "bottom" ? cx / vp.w : cy / vp.h
        };

        saveDock();

        player.classList.add("is-snapping");
        place();

        setTimeout(function () {
            player.classList.remove("is-snapping");
        }, 320);
    }

    fab.addEventListener("pointerup", endDrag);
    fab.addEventListener("pointercancel", endDrag);

    // Click (mouse, touch, Enter, Space) toggles the bar
    fab.addEventListener("click", function (event) {

        if (suppressClick) {
            suppressClick = false;
            event.preventDefault();
            return;
        }

        setOpen(!isOpen());
    });

    player.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && isOpen()) {
            setOpen(false);
            fab.focus();
        }
    });

    // ---------------------------------
    // Speed menu: the dots key grows into a curved shape holding the
    // two speeds; the dots close it again. Picking the speed in use
    // again goes back to normal (1x).
    // ---------------------------------

    // Where the two circles sit, from the dots key: [along the bar, away from the edge]
    const SPEED_SPOTS = [[-12, 40], [12, 57]];

    function placeSpeedSpots() {
        SPEED_SPOTS.forEach(function (spot, i) {
            const along = spot[0];
            const away = spot[1];
            let x = along;
            let y = -away;
            if (dock.edge === "top") {
                y = away;
            } else if (dock.edge === "left") {
                x = away;
                y = along;
            } else if (dock.edge === "right") {
                x = -away;
                y = along;
            }
            [gooDots[i], speedOptions[i]].forEach(function (element) {
                element.style.setProperty("--sx", x + "px");
                element.style.setProperty("--sy", y + "px");
                element.style.setProperty("--i", String(i));
            });
        });
    }

    function showSpeed() {
        speedOptions.forEach(function (option) {
            const on = option.dataset.speed === speedSelect.value;
            option.setAttribute("aria-pressed", on ? "true" : "false");
        });
        speedToggle.dataset.tip = "Speed: " + speedSelect.value + "\u00d7";
    }

    function setSpeedOpen(open) {
        if (open) {
            placeSpeedSpots();
            showSpeed();
        }
        speed.classList.toggle("is-open", open);
        speedToggle.setAttribute("aria-expanded", open ? "true" : "false");
        speedOptions.forEach(function (option) {
            option.tabIndex = open ? 0 : -1;
        });
    }

    speedToggle.addEventListener("click", function () {
        setSpeedOpen(!speed.classList.contains("is-open"));
    });

    speedOptions.forEach(function (option) {
        option.addEventListener("click", function () {
            speedSelect.value = speedSelect.value === option.dataset.speed ? "1" : option.dataset.speed;
            speedSelect.dispatchEvent(new Event("change"));
            showSpeed();
        });
    });

    speedSelect.addEventListener("change", showSpeed);

    window.addEventListener("resize", place);

    place();

    // ---------------------------------
    // Attention nudge on page load
    // ---------------------------------

    const reduceMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reduceMotion) {
        setTimeout(function () {
            if (isOpen() || drag) {
                return;
            }
            fab.classList.add("ra__fab--nudge");
            fab.addEventListener("animationend", function () {
                fab.classList.remove("ra__fab--nudge");
            }, { once: true });
        }, 900);
    }
}


// ---------------------------------
// Main setup
// ---------------------------------

document.addEventListener(
    "DOMContentLoaded",
    function () {

        createReadAloudPlayer();


        // ---------------------------------
        // Find readable visible content
        // ---------------------------------

        function getReadableBlocks() {

            /*
             * Read meaningful visible text
             * inside <main>.
             */

            const candidates = Array.from(
                document.querySelectorAll(
                    `
                    main .navbar-brand,
                    main h1,
                    main h2,
                    main h3,
                    main h4,
                    main h5,
                    main h6,
                    main p,
                    main li,
                    main a.btn,
                    main button,
                    main small,
                    main blockquote,
                    main figcaption,
                    main dt,
                    main dd,
                    main th,
                    main td,
                    main label
                    `
                )
            );


            return candidates.filter(
                function (element) {

                    // Never read the player itself
                    if (
                        element.closest(
                            "#readAloudPlayer"
                        )
                    ) {
                        return false;
                    }


                    // Ignore elements without text
                    const text =
                        element.textContent
                            .replace(/\s+/g, " ")
                            .trim();


                    if (!text) {
                        return false;
                    }


                    // Ignore hidden elements
                    const style =
                        window.getComputedStyle(
                            element
                        );


                    if (
                        style.display === "none" ||
                        style.visibility === "hidden"
                    ) {
                        return false;
                    }


                    // Ignore elements without
                    // a visible layout box
                    if (
                        element.getClientRects()
                            .length === 0
                    ) {
                        return false;
                    }


                    return true;
                }
            );
        }


        readBlocks =
            getReadableBlocks();


        const playButton =
            document.getElementById(
                "readPlay"
            );

        const stopButton =
            document.getElementById(
                "readStop"
            );

        const prevButton =
            document.getElementById(
                "readPrev"
            );

        const nextButton =
            document.getElementById(
                "readNext"
            );

        const speedSelect =
            document.getElementById(
                "readSpeed"
            );

        const statusText =
            document.getElementById(
                "readStatus"
            );


        if (
            !playButton ||
            !stopButton ||
            !prevButton ||
            !nextButton ||
            !speedSelect ||
            !statusText ||
            readBlocks.length === 0
        ) {
            return;
        }


        // ---------------------------------
        // Player button state
        // ---------------------------------

        function setPlayButtonState(
            state
        ) {

            // Pulsing ring on the round button while reading
            const dockElement = document.getElementById("readAloudPlayer");
            if (dockElement) {
                dockElement.classList.toggle("is-playing", state === "pause");
            }

            if (state === "pause") {

                playButton.innerHTML = PAUSE_ICON;
                playButton.dataset.tip = "Pause";


                playButton.setAttribute(
                    "aria-label",
                    "Pause reading"
                );

                return;
            }


            if (state === "resume") {

                playButton.innerHTML = PLAY_ICON;
                playButton.dataset.tip = "Resume";


                playButton.setAttribute(
                    "aria-label",
                    "Resume reading"
                );

                return;
            }


            playButton.innerHTML = PLAY_ICON;
            playButton.dataset.tip = "Play";


            playButton.setAttribute(
                "aria-label",
                "Listen to this page"
            );
        }


        // ---------------------------------
        // Highlighting
        // ---------------------------------

        function removeHighlight() {

            readBlocks.forEach(
                function (block) {

                    block.classList.remove(
                        "currently-reading"
                    );


                    block.removeAttribute(
                        "aria-current"
                    );
                }
            );
        }


        function highlightBlock(
            index
        ) {

            removeHighlight();


            const block =
                readBlocks[index];


            if (!block) {
                return;
            }


            block.classList.add(
                "currently-reading"
            );


            block.setAttribute(
                "aria-current",
                "true"
            );


            /*
             * Scroll only when the current
             * block is moving outside the
             * comfortable visible area.
             */

            const rect =
                block.getBoundingClientRect();


            const topLimit = 100;


            const bottomLimit =
                window.innerHeight - 140;


            if (
                rect.top < topLimit ||
                rect.bottom > bottomLimit
            ) {

                block.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }
        }


        // ---------------------------------
        // Voice
        // ---------------------------------

        function getEnglishVoice() {

            const voices =
                synth.getVoices();


            // Prefer British English
            let voice =
                voices.find(
                    function (v) {

                        return (
                            v.lang
                                .toLowerCase() ===
                            "en-gb"
                        );
                    }
                );


            // Otherwise use any
            // English voice
            if (!voice) {

                voice =
                    voices.find(
                        function (v) {

                            return (
                                v.lang
                                    .toLowerCase()
                                    .startsWith("en")
                            );
                        }
                    );
            }


            return voice;
        }


        // ---------------------------------
        // Split text into natural chunks
        // ---------------------------------

        function splitTextIntoChunks(
            text
        ) {

            const cleanedText =
                text
                    .replace(/\s+/g, " ")
                    .trim();


            let sentences = [];


            /*
             * Modern browsers:
             * use natural sentence
             * boundaries.
             */

            if (
                typeof Intl !==
                    "undefined" &&
                Intl.Segmenter
            ) {

                const segmenter =
                    new Intl.Segmenter(
                        "en",
                        {
                            granularity:
                                "sentence"
                        }
                    );


                sentences =
                    Array.from(
                        segmenter.segment(
                            cleanedText
                        )
                    )
                    .map(
                        function (item) {

                            return (
                                item.segment
                                    .trim()
                            );
                        }
                    );

            } else {

                /*
                 * Fallback for
                 * older browsers.
                 */

                sentences =
                    cleanedText.match(
                        /[^.!?]+[.!?]+|[^.!?]+$/g
                    ) || [cleanedText];
            }


            const chunks = [];


            sentences.forEach(
                function (sentence) {

                    /*
                     * Add shorter pauses
                     * after colon and
                     * semicolon.
                     */

                    const prepared =
                        sentence.replace(
                            /([;:])\s+/g,
                            "$1|||"
                        );


                    const clauses =
                        prepared.split(
                            "|||"
                        );


                    clauses.forEach(
                        function (
                            clause,
                            index
                        ) {

                            clause =
                                clause.trim();


                            if (!clause) {
                                return;
                            }


                            const isLastClause =
                                index ===
                                clauses.length - 1;


                            chunks.push({

                                text:
                                    clause,

                                pauseAfter:
                                    isLastClause
                                        ? SENTENCE_PAUSE
                                        : CLAUSE_PAUSE
                            });
                        }
                    );
                }
            );


            return chunks;
        }


        // ---------------------------------
        // Timer helpers
        // ---------------------------------

        function clearPauseTimer() {

            if (pauseTimer) {

                clearTimeout(
                    pauseTimer
                );

                pauseTimer = null;
            }
        }


        function scheduleContinuation(
            callback,
            delay,
            token
        ) {

            clearPauseTimer();


            pendingContinuation =
                callback;


            pauseTimer =
                setTimeout(
                    function () {

                        pauseTimer = null;


                        if (
                            token !== runId ||
                            !readingActive ||
                            isPaused
                        ) {
                            return;
                        }


                        const continuation =
                            pendingContinuation;


                        pendingContinuation =
                            null;


                        if (
                            continuation
                        ) {

                            continuation();
                        }

                    },
                    delay
                );
        }


        // ---------------------------------
        // Prepare a block
        // ---------------------------------

        function prepareBlock(
            index
        ) {

            currentIndex =
                index;


            currentChunkIndex =
                0;


            highlightBlock(
                currentIndex
            );


            const text =
                readBlocks[
                    currentIndex
                ]
                .textContent
                .trim();


            currentChunks =
                splitTextIntoChunks(
                    text
                );
        }


        // ---------------------------------
        // Speak one sentence / clause
        // ---------------------------------

        function speakCurrentChunk(
            token
        ) {

            if (
                token !== runId ||
                !readingActive ||
                isPaused
            ) {
                return;
            }


            // Current block finished
            if (
                currentChunkIndex >=
                currentChunks.length
            ) {

                if (
                    currentIndex <
                    readBlocks.length - 1
                ) {

                    scheduleContinuation(
                        function () {

                            prepareBlock(
                                currentIndex + 1
                            );


                            speakCurrentChunk(
                                token
                            );
                        },

                        PARAGRAPH_PAUSE,

                        token
                    );

                } else {

                    stopReading(true);
                }


                return;
            }


            const chunk =
                currentChunks[
                    currentChunkIndex
                ];


            statusText.textContent =
                "Reading...";


            currentUtterance =
                new SpeechSynthesisUtterance(
                    chunk.text
                );


            currentUtterance.lang =
                "en-GB";


            currentUtterance.rate =
                parseFloat(
                    speedSelect.value
                );


            // Keep pitch neutral
            currentUtterance.pitch =
                1;


            const voice =
                getEnglishVoice();


            if (voice) {

                currentUtterance.voice =
                    voice;
            }


            currentUtterance.onend =
                function () {

                    if (
                        token !== runId
                    ) {
                        return;
                    }


                    currentChunkIndex++;


                    scheduleContinuation(
                        function () {

                            speakCurrentChunk(
                                token
                            );
                        },

                        chunk.pauseAfter,

                        token
                    );
                };


            currentUtterance.onerror =
                function (event) {

                    if (
                        event.error !==
                            "canceled" &&
                        event.error !==
                            "interrupted"
                    ) {

                        console.error(
                            "Speech synthesis error:",
                            event
                        );
                    }
                };


            synth.speak(
                currentUtterance
            );


            setPlayButtonState(
                "pause"
            );
        }


        // ---------------------------------
        // Start reading
        // ---------------------------------

        function startBlock(
            index
        ) {

            /*
             * Refresh page content
             * whenever reading starts.
             */

            readBlocks =
                getReadableBlocks();


            if (
                readBlocks.length === 0
            ) {
                return;
            }


            /*
             * Clamp index in case
             * page content changed.
             */

            index =
                Math.max(
                    0,
                    Math.min(
                        index,
                        readBlocks.length - 1
                    )
                );


            runId++;


            const token =
                runId;


            clearPauseTimer();


            pendingContinuation =
                null;


            synth.cancel();


            readingActive =
                true;


            isPaused =
                false;


            prepareBlock(
                index
            );


            speakCurrentChunk(
                token
            );
        }


        // ---------------------------------
        // Stop
        // ---------------------------------

        function stopReading(
            resetPosition = true
        ) {

            runId++;


            readingActive =
                false;


            isPaused =
                false;


            clearPauseTimer();


            pendingContinuation =
                null;


            synth.cancel();


            removeHighlight();


            currentUtterance =
                null;


            if (
                resetPosition
            ) {

                currentIndex =
                    0;

                currentChunkIndex =
                    0;
            }


            setPlayButtonState(
                "listen"
            );


            statusText.textContent =
                "Ready";
        }


        // ---------------------------------
        // Play / Pause / Resume
        // ---------------------------------

        playButton.addEventListener(
            "click",
            function () {

                /*
                 * Currently reading:
                 * pause.
                 */

                if (
                    readingActive &&
                    !isPaused
                ) {

                    isPaused =
                        true;


                    clearPauseTimer();


                    if (
                        synth.speaking &&
                        !synth.paused
                    ) {

                        synth.pause();
                    }


                    setPlayButtonState(
                        "resume"
                    );


                    statusText.textContent =
                        "Paused";


                    return;
                }


                /*
                 * Currently paused:
                 * resume.
                 */

                if (
                    readingActive &&
                    isPaused
                ) {

                    isPaused =
                        false;


                    if (
                        synth.paused
                    ) {

                        synth.resume();

                    } else if (
                        pendingContinuation
                    ) {

                        const continuation =
                            pendingContinuation;


                        pendingContinuation =
                            null;


                        scheduleContinuation(
                            continuation,
                            100,
                            runId
                        );
                    }


                    setPlayButtonState(
                        "pause"
                    );


                    statusText.textContent =
                        "Reading...";


                    return;
                }


                /*
                 * Not currently reading.
                 */

                startBlock(
                    currentIndex
                );
            }
        );


        // ---------------------------------
        // Stop button
        // ---------------------------------

        stopButton.addEventListener(
            "click",
            function () {

                stopReading(
                    true
                );
            }
        );


        // ---------------------------------
        // Previous block
        // ---------------------------------

        prevButton.addEventListener(
            "click",
            function () {

                const previous =
                    Math.max(
                        0,
                        currentIndex - 1
                    );


                startBlock(
                    previous
                );
            }
        );


        // ---------------------------------
        // Next block
        // ---------------------------------

        nextButton.addEventListener(
            "click",
            function () {

                const next =
                    Math.min(
                        readBlocks.length - 1,
                        currentIndex + 1
                    );


                startBlock(
                    next
                );
            }
        );


        // ---------------------------------
        // Reading speed
        // ---------------------------------

        speedSelect.addEventListener(
            "change",
            function () {

                localStorage.setItem(
                    "windsmath-reading-speed",
                    speedSelect.value
                );


                /*
                 * If currently reading,
                 * restart the current
                 * sentence at the
                 * new speed.
                 */

                if (
                    readingActive
                ) {

                    runId++;


                    clearPauseTimer();


                    pendingContinuation =
                        null;


                    synth.cancel();


                    isPaused =
                        false;


                    setPlayButtonState(
                        "pause"
                    );


                    statusText.textContent =
                        "Reading...";


                    speakCurrentChunk(
                        runId
                    );
                }
            }
        );


        // ---------------------------------
        // Restore saved speed
        // ---------------------------------

        const savedSpeed =
            localStorage.getItem(
                "windsmath-reading-speed"
            );


        if (
            savedSpeed &&
            Array.from(
                speedSelect.options
            )
            .some(
                function (option) {

                    return (
                        option.value ===
                        savedSpeed
                    );
                }
            )
        ) {

            speedSelect.value =
                savedSpeed;
        }


        // Some browsers load voices later
        speechSynthesis.onvoiceschanged =
            function () {

                getEnglishVoice();
            };


        // Stop speech when leaving page
        window.addEventListener(
            "beforeunload",
            function () {

                synth.cancel();
            }
        );

    }
);