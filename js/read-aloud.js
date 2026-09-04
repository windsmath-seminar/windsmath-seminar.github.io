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
// ---------------------------------

function createReadAloudPlayer() {

    // Prevent duplicate players
    if (document.getElementById("readAloudPlayer")) {
        return;
    }

    const player = document.createElement("div");

    player.id = "readAloudPlayer";
    player.className = "read-aloud-player";

    player.setAttribute(
        "role",
        "region"
    );

    player.setAttribute(
        "aria-label",
        "Read aloud controls"
    );

    player.innerHTML = `
        <div class="read-aloud-brand">

            <span class="read-aloud-speaker"
                  aria-hidden="true">
                ?üîä
            </span>

            <div class="read-aloud-brand-text">

                <strong>
                    Listen to this page
                </strong>

                <span id="readStatus"
                      class="read-aloud-status"
                      aria-live="polite">
                    Ready
                </span>

            </div>

        </div>


        <div class="read-aloud-controls">

            <button id="readPrev"
                    class="read-control"
                    type="button"
                    aria-label="Previous section"
                    title="Previous section">
                ?Üê
            </button>


            <button id="readPlay"
                    class="read-control read-control-main"
                    type="button"
                    aria-label="Listen to this page">

                <span class="play-symbol">
                    ?ñ?
                </span>

                <span class="play-text">
                    Listen
                </span>

            </button>


            <button id="readStop"
                    class="read-control"
                    type="button"
                    aria-label="Stop reading"
                    title="Stop">
                ?ñ?
            </button>


            <button id="readNext"
                    class="read-control"
                    type="button"
                    aria-label="Next section"
                    title="Next section">
                ?Üí
            </button>


            <div class="read-speed-wrapper">

                <label for="readSpeed">
                    Speed
                </label>

                <select id="readSpeed"
                        aria-label="Reading speed">

                    <option value="0.5">
                        0.5?ó
                    </option>

                    <option value="0.75">
                        0.75?ó
                    </option>

                    <option value="1" selected>
                        1.0?ó
                    </option>

                    <option value="1.25">
                        1.25?ó
                    </option>

                    <option value="1.5">
                        1.5?ó
                    </option>

                </select>

            </div>

        </div>
    `;

    document.body.appendChild(player);

    document.body.classList.add(
        "has-read-aloud"
    );
}


// ---------------------------------
// Main setup
// ---------------------------------

document.addEventListener("DOMContentLoaded", function () {

    createReadAloudPlayer();


    // ---------------------------------
    // Find readable visible content
    // ---------------------------------

    function getReadableBlocks() {

        /*
         * Read meaningful visible text inside <main>.
         *
         * The Read Aloud player is appended to <body>,
         * not <main>, so it will not be included.
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


        return candidates.filter(function (element) {

            // Safety: never read the player itself
            if (element.closest(".read-aloud-player")) {
                return false;
            }


            // Ignore elements without meaningful text
            const text =
                element.textContent
                    .replace(/\s+/g, " ")
                    .trim();

            if (!text) {
                return false;
            }


            // Ignore hidden elements
            const style =
                window.getComputedStyle(element);

            if (
                style.display === "none" ||
                style.visibility === "hidden"
            ) {
                return false;
            }


            // Ignore elements with no visible box
            if (element.getClientRects().length === 0) {
                return false;
            }


            return true;
        });
    }


    readBlocks = getReadableBlocks();


    const playButton =
        document.getElementById("readPlay");

    const stopButton =
        document.getElementById("readStop");

    const prevButton =
        document.getElementById("readPrev");

    const nextButton =
        document.getElementById("readNext");

    const speedSelect =
        document.getElementById("readSpeed");

    const statusText =
        document.getElementById("readStatus");


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

    function setPlayButtonState(state) {

        if (state === "pause") {

            playButton.innerHTML = `
                <span class="play-symbol">?è?</span>
                <span class="play-text">Pause</span>
            `;

            playButton.setAttribute(
                "aria-label",
                "Pause reading"
            );

            return;
        }


        if (state === "resume") {

            playButton.innerHTML = `
                <span class="play-symbol">?ñ?</span>
                <span class="play-text">Resume</span>
            `;

            playButton.setAttribute(
                "aria-label",
                "Resume reading"
            );

            return;
        }


        playButton.innerHTML = `
            <span class="play-symbol">?ñ?</span>
            <span class="play-text">Listen</span>
        `;

        playButton.setAttribute(
            "aria-label",
            "Listen to this page"
        );
    }


    // ---------------------------------
    // Highlighting
    // ---------------------------------

    function removeHighlight() {

        readBlocks.forEach(function (block) {

            block.classList.remove(
                "currently-reading"
            );

            block.removeAttribute(
                "aria-current"
            );
        });
    }


    function highlightBlock(index) {

        removeHighlight();

        const block = readBlocks[index];

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
         * Scroll only when the current block is
         * leaving the comfortable visible area.
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

        const voices = synth.getVoices();

        // Prefer British English
        let voice = voices.find(function (v) {
            return (
                v.lang.toLowerCase() === "en-gb"
            );
        });

        // Otherwise use any English voice
        if (!voice) {

            voice = voices.find(function (v) {
                return (
                    v.lang
                        .toLowerCase()
                        .startsWith("en")
                );
            });
        }

        return voice;
    }


    // ---------------------------------
    // Split text into natural chunks
    // ---------------------------------

    function splitTextIntoChunks(text) {

        const cleanedText =
            text.replace(/\s+/g, " ").trim();

        let sentences = [];


        // Modern browsers: use natural sentence boundaries
        if (
            typeof Intl !== "undefined" &&
            Intl.Segmenter
        ) {

            const segmenter =
                new Intl.Segmenter(
                    "en",
                    {
                        granularity: "sentence"
                    }
                );

            sentences =
                Array.from(
                    segmenter.segment(cleanedText)
                )
                .map(function (item) {
                    return item.segment.trim();
                });

        } else {

            // Fallback for older browsers
            sentences =
                cleanedText.match(
                    /[^.!?]+[.!?]+|[^.!?]+$/g
                ) || [cleanedText];
        }


        const chunks = [];


        sentences.forEach(function (sentence) {

            /*
             * Add shorter pauses after colon and semicolon.
             */

            const prepared =
                sentence.replace(
                    /([;:])\s+/g,
                    "$1|||"
                );

            const clauses =
                prepared.split("|||");


            clauses.forEach(
                function (clause, index) {

                    clause = clause.trim();

                    if (!clause) {
                        return;
                    }


                    const isLastClause =
                        index ===
                        clauses.length - 1;


                    chunks.push({
                        text: clause,

                        pauseAfter:
                            isLastClause
                                ? SENTENCE_PAUSE
                                : CLAUSE_PAUSE
                    });
                }
            );
        });


        return chunks;
    }


    // ---------------------------------
    // Timer helpers
    // ---------------------------------

    function clearPauseTimer() {

        if (pauseTimer) {

            clearTimeout(pauseTimer);

            pauseTimer = null;
        }
    }


    function scheduleContinuation(
        callback,
        delay,
        token
    ) {

        clearPauseTimer();

        pendingContinuation = callback;

        pauseTimer =
            setTimeout(function () {

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

                pendingContinuation = null;

                if (continuation) {
                    continuation();
                }

            }, delay);
    }


    // ---------------------------------
    // Prepare a block
    // ---------------------------------

    function prepareBlock(index) {

        currentIndex = index;

        currentChunkIndex = 0;

        highlightBlock(currentIndex);

        const text =
            readBlocks[currentIndex]
                .textContent
                .trim();

        currentChunks =
            splitTextIntoChunks(text);
    }


    // ---------------------------------
    // Speak one sentence / clause
    // ---------------------------------

    function speakCurrentChunk(token) {

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

                        speakCurrentChunk(token);

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
            currentChunks[currentChunkIndex];


        statusText.textContent =
            "Reading...";


        currentUtterance =
            new SpeechSynthesisUtterance(
                chunk.text
            );


        currentUtterance.lang = "en-GB";


        currentUtterance.rate =
            parseFloat(
                speedSelect.value
            );


        // Keep pitch neutral
        currentUtterance.pitch = 1;


        const voice =
            getEnglishVoice();


        if (voice) {

            currentUtterance.voice =
                voice;
        }


        currentUtterance.onend =
            function () {

                if (token !== runId) {
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
                    event.error !== "canceled" &&
                    event.error !== "interrupted"
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


        setPlayButtonState("pause");
    }


    // ---------------------------------
    // Start reading a block
    // ---------------------------------

    function startBlock(index) {

        // Refresh page content every time reading starts
        readBlocks = getReadableBlocks();

        if (readBlocks.length === 0) {
            return;
        }

        // Clamp index in case page content changed
        index = Math.max(
            0,
            Math.min(
                index,
                readBlocks.length - 1
            )
        );

        runId++;

        const token = runId;

        clearPauseTimer();

        pendingContinuation = null;

        synth.cancel();


        readingActive = true;
        isPaused = false;


        prepareBlock(index);

        speakCurrentChunk(token);
    }


    // ---------------------------------
    // Stop
    // ---------------------------------

    function stopReading(
        resetPosition = true
    ) {

        runId++;

        readingActive = false;
        isPaused = false;

        clearPauseTimer();

        pendingContinuation = null;

        synth.cancel();

        removeHighlight();

        currentUtterance = null;


        if (resetPosition) {

            currentIndex = 0;
            currentChunkIndex = 0;
        }


        setPlayButtonState("listen");

        statusText.textContent =
            "Ready";
    }


    // ---------------------------------
    // Play / Pause / Resume
    // ---------------------------------

    playButton.addEventListener(
        "click",
        function () {

            // Currently reading -> pause
            if (
                readingActive &&
                !isPaused
            ) {

                isPaused = true;

                clearPauseTimer();


                if (
                    synth.speaking &&
                    !synth.paused
                ) {

                    synth.pause();
                }


                setPlayButtonState("resume");

                statusText.textContent =
                    "Paused";

                return;
            }


            // Currently paused -> resume
            if (
                readingActive &&
                isPaused
            ) {

                isPaused = false;


                if (synth.paused) {

                    synth.resume();

                } else if (
                    pendingContinuation
                ) {

                    const continuation =
                        pendingContinuation;

                    pendingContinuation = null;

                    scheduleContinuation(
                        continuation,
                        100,
                        runId
                    );
                }


                setPlayButtonState("pause");

                statusText.textContent =
                    "Reading...";

                return;
            }


            // Not currently reading
            startBlock(currentIndex);
        }
    );


    // ---------------------------------
    // Stop button
    // ---------------------------------

    stopButton.addEventListener(
        "click",
        function () {

            stopReading(true);
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

            startBlock(previous);
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

            startBlock(next);
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
             * restart the current sentence
             * at the new speed.
             */

            if (readingActive) {

                runId++;

                clearPauseTimer();

                pendingContinuation = null;

                synth.cancel();

                isPaused = false;

                setPlayButtonState("pause");

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
        ).some(function (option) {

            return (
                option.value ===
                savedSpeed
            );
        })
    ) {

        speedSelect.value =
            savedSpeed;
    }


    // Some browsers load voices later
    speechSynthesis.onvoiceschanged =
        function () {

            getEnglishVoice();
        };


    // Stop speech when leaving the page
    window.addEventListener(
        "beforeunload",
        function () {

            synth.cancel();
        }
    );

});