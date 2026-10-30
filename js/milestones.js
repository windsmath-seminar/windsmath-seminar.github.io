// ---------------------------------
// Past events timeline
// Builds a scrollable strip of events from the .past-event-block
// entries on the page, plus a ruler (one tick per month) to scrub
// through them. Nothing to maintain here: add events to the list as
// before and they appear on the timeline.
//
// A block without a "Date: ..." line can set its month with
// data-milestone-date="YYYY-MM" (or "YYYY-MM-DD").
// A block with several videos and matching "... Place: ..." lines
// (the video festival) gets one card per video.
// ---------------------------------

(function () {

    const mount = document.getElementById("milestones");
    if (!mount) {
        return;
    }

    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    function clean(text) {
        return text.replace(/ /g, " ").replace(/\s+/g, " ").trim();
    }

    function parseDate(block) {

        const override = block.dataset.milestoneDate;
        if (override) {
            const parts = override.split("-").map(Number);
            return { y: parts[0], m: parts[1] - 1, d: parts[2] || 15 };
        }

        const line = Array.from(block.querySelectorAll("p"))
            .map(function (p) { return clean(p.textContent); })
            .find(function (t) { return /^Date\b/i.test(t); });
        if (!line) {
            return null;
        }

        const match = line.match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
        if (!match) {
            return null;
        }

        const m = MONTHS.indexOf(match[1].charAt(0).toUpperCase() + match[1].slice(1, 3).toLowerCase());
        return m === -1 ? null : { y: Number(match[3]), m: m, d: Number(match[2]) };
    }

    // Speaker / presenter line, or the first plain line of the block
    function subtitle(block) {
        const lines = Array.from(block.querySelectorAll(".event-details p"))
            .filter(function (p) { return !p.querySelector("a"); })
            .map(function (p) { return clean(p.textContent); })
            .filter(function (t) { return t && !/^Date\b/i.test(t); });
        const line = lines[0] || "";
        return line.replace(/^(Speakers?|Presenters?)\s*:\s*/i, "");
    }

    function youtubeThumb(frame) {
        const id = frame.getAttribute("src").split("embed/")[1].split(/[?&#]/)[0];
        return "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
    }

    function thumbnail(block) {
        const frame = block.querySelector("iframe[src*='youtube.com/embed/']");
        if (frame) {
            return youtubeThumb(frame);
        }
        const img = block.querySelector("img");
        return img ? img.getAttribute("src") : null;
    }

    // Video festival: one entry per award ("First Place: ...") and video
    function awards(block) {
        const frames = Array.from(block.querySelectorAll("iframe[src*='youtube.com/embed/']"));
        const places = Array.from(block.querySelectorAll(".event-details p"))
            .map(function (p) { return clean(p.textContent); })
            .filter(function (t) { return /^\w+ Place\s*:/i.test(t); });
        if (frames.length < 2 || frames.length !== places.length) {
            return null;
        }
        return frames.map(function (frame, k) {
            return { who: places[k], thumb: youtubeThumb(frame) };
        });
    }

    function pad(n) {
        return (n < 10 ? "0" : "") + n;
    }

    function escapeHtml(text) {
        return text.replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c];
        });
    }

    // ---------------------------------
    // Collect events
    // ---------------------------------

    const used = {};
    const events = [];

    document.querySelectorAll(".past-event-block").forEach(function (block) {

        const date = parseDate(block);
        const heading = block.querySelector("h2");
        if (!date || !heading) {
            return;
        }

        let id = block.id;
        if (!id) {
            id = "event-" + date.y + "-" + pad(date.m + 1) + "-" + pad(date.d);
            while (used[id]) {
                id += "-b";
            }
            block.id = id;
        }
        used[id] = true;

        const base = {
            id: id,
            y: date.y,
            m: date.m,
            d: date.d,
            label: MONTHS[date.m] + " " + date.y,
            title: clean(heading.textContent)
        };

        (awards(block) || [{ who: subtitle(block), thumb: thumbnail(block) }]).forEach(function (part, k) {
            events.push(Object.assign({ order: k }, base, part));
        });
    });

    if (!events.length) {
        return;
    }

    events.sort(function (a, b) {
        return (a.y - b.y) || (a.m - b.m) || (a.d - b.d) || (a.order - b.order);
    });

    // Each event sits on the ruler at its month: 0 = month of the first event
    const first = events[0];
    const last = events[events.length - 1];
    const monthCount = (last.y - first.y) * 12 + (last.m - first.m) + 1;

    events.forEach(function (e) {
        e.k = (e.y - first.y) * 12 + (e.m - first.m);
    });

    // ---------------------------------
    // Markup
    // ---------------------------------

    const ARROW_LEFT = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const ARROW_RIGHT = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    function stripHtml(events, name) {
        const cards = events.map(function (e) {
            const media = e.thumb
                ? '<img src="' + escapeHtml(e.thumb) + '" alt="" loading="lazy" decoding="async">'
                : '<span class="ms__placeholder">Seminar</span>';
            return '<li class="ms__item">' +
                '<a class="ms__card" href="#' + e.id + '">' +
                '<span class="ms__date">' + e.label + '</span>' +
                '<span class="ms__media">' + media + '</span>' +
                '<span class="ms__title">' + escapeHtml(e.title) + '</span>' +
                (e.who ? '<span class="ms__who">' + escapeHtml(e.who) + '</span>' : '') +
                '</a></li>';
        }).join("");
        return '<div class="ms__viewport" data-track="' + name + '">' +
            '<button type="button" class="ms__nav ms__nav--prev" aria-label="Previous event">' + ARROW_LEFT + '</button>' +
            '<ol class="ms__track">' + cards + '</ol>' +
            '<button type="button" class="ms__nav ms__nav--next" aria-label="Next event">' + ARROW_RIGHT + '</button>' +
            '</div>';
    }

    mount.innerHTML =
        stripHtml(events, "all") +
        '<div class="ms__scrub">' +
            '<p class="ms__now" aria-hidden="true"></p>' +
            '<div class="ms__ruler" role="slider" tabindex="0" aria-label="Browse events by date"' +
                ' aria-valuemin="0" aria-valuemax="' + (monthCount - 1) + '">' +
                '<canvas aria-hidden="true"></canvas>' +
            '</div>' +
        '</div>';

    // ---------------------------------
    // Mechanical click on every step (Web Audio, no sound files).
    // Browsers only allow sound after the visitor has clicked or
    // pressed a key on the page, so the first steps may be silent.
    // ---------------------------------

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    let audio = null;
    let noise = null;
    let lastTick = 0;

    function unlockAudio() {
        if (!AudioContextClass) {
            return;
        }
        if (!audio) {
            audio = new AudioContextClass();
            // A short burst of decaying noise: the "click" of a detent
            const length = Math.floor(audio.sampleRate * 0.025);
            noise = audio.createBuffer(1, length, audio.sampleRate);
            const data = noise.getChannelData(0);
            for (let k = 0; k < length; k++) {
                data[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / length, 4);
            }
        }
        if (audio.state === "suspended") {
            audio.resume();
        }
    }

    function playTick() {

        if (!audio || audio.state !== "running") {
            return;
        }

        const now = audio.currentTime;
        if (now - lastTick < 0.03) {
            return;
        }
        lastTick = now;

        const click = audio.createBufferSource();
        click.buffer = noise;
        const filter = audio.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 3200;
        filter.Q.value = 1.2;
        const clickGain = audio.createGain();
        clickGain.gain.value = 0.35;
        click.connect(filter).connect(clickGain).connect(audio.destination);
        click.start(now);

        // A low knock under the click gives it a mechanical body
        const knock = audio.createOscillator();
        knock.type = "triangle";
        knock.frequency.setValueAtTime(900, now);
        knock.frequency.exponentialRampToValueAtTime(320, now + 0.03);
        const knockGain = audio.createGain();
        knockGain.gain.setValueAtTime(0.12, now);
        knockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        knock.connect(knockGain).connect(audio.destination);
        knock.start(now);
        knock.stop(now + 0.05);
    }

    ["pointerdown", "keydown", "touchstart"].forEach(function (type) {
        document.addEventListener(type, unlockAudio, { passive: true });
    });

    // ---------------------------------
    // The strip of cards plus the ruler below it
    // ---------------------------------

    const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July",
        "August", "September", "October", "November", "December"];

    function createTimeline(events, name) {

        const viewport = mount.querySelector('.ms__viewport[data-track="' + name + '"]');
        const track = viewport.querySelector(".ms__track");
        const items = Array.from(track.children);
        const prevButton = viewport.querySelector(".ms__nav--prev");
        const nextButton = viewport.querySelector(".ms__nav--next");

        let active = -1;
        let lockUntil = 0;      // while the strip glides there on its own, ignore its scroll events

        // follow: also move the ruler (false when the ruler itself asked)
        function setActive(i, follow) {

            if (i === active) {
                return;
            }
            if (active !== -1) {
                playTick();
            }
            active = i;

            items.forEach(function (item, k) {
                item.classList.toggle("is-active", k === i);
            });

            prevButton.disabled = i === 0;
            nextButton.disabled = i === events.length - 1;

            if (follow) {
                ruler.follow(events[i].k);
            }
        }

        function centerOffset(i) {
            const item = items[i];
            return item.offsetLeft + item.offsetWidth / 2 - track.clientWidth / 2;
        }

        function goTo(i, smooth, fromRuler) {
            i = Math.min(Math.max(i, 0), events.length - 1);
            setActive(i, !fromRuler);
            if (!smooth) {
                ruler.jump(events[i].k);
            }
            lockUntil = performance.now() + (smooth ? 1500 : 50);
            track.scrollTo({ left: centerOffset(i), behavior: smooth ? "smooth" : "auto" });
        }

        // Whichever card sits closest to the middle is active
        let scrollFrame = null;
        track.addEventListener("scroll", function () {
            if (scrollFrame) {
                return;
            }
            scrollFrame = requestAnimationFrame(function () {
                scrollFrame = null;
                if (performance.now() < lockUntil) {
                    return;
                }
                const middle = track.scrollLeft + track.clientWidth / 2;
                let best = 0;
                let bestDistance = Infinity;
                items.forEach(function (item, k) {
                    const distance = Math.abs(item.offsetLeft + item.offsetWidth / 2 - middle);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        best = k;
                    }
                });
                setActive(best, true);
            });
        }, { passive: true });

        // The glide has finished: the strip may drive the ruler again
        track.addEventListener("scrollend", function () {
            lockUntil = Math.min(lockUntil, performance.now() + 50);
        });

        prevButton.addEventListener("click", function () { goTo(active - 1, true); });
        nextButton.addEventListener("click", function () { goTo(active + 1, true); });

        // Drag the strip with a mouse (touch already swipes)

        let drag = null;

        track.addEventListener("pointerdown", function (event) {
            if (event.pointerType !== "mouse" || event.button !== 0) {
                return;
            }
            drag = { x: event.clientX, left: track.scrollLeft, moved: false };
        });

        window.addEventListener("pointermove", function (event) {
            if (!drag) {
                return;
            }
            const dx = event.clientX - drag.x;
            if (!drag.moved && Math.abs(dx) > 6) {
                drag.moved = true;
                track.classList.add("is-dragging");
            }
            if (drag.moved) {
                track.scrollLeft = drag.left - dx;
            }
        });

        window.addEventListener("pointerup", function () {
            if (!drag) {
                return;
            }
            const moved = drag.moved;
            drag = null;
            track.classList.remove("is-dragging");
            if (moved) {
                // Settle on the nearest card and swallow the click that follows
                goTo(active, true);
                const swallow = function (event) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                };
                track.addEventListener("click", swallow, { capture: true, once: true });
                setTimeout(function () {
                    track.removeEventListener("click", swallow, { capture: true });
                }, 0);
            }
        });

        // A card that is not in the middle is brought there first
        track.addEventListener("click", function (event) {
            const card = event.target.closest(".ms__card");
            if (!card) {
                return;
            }
            const i = items.indexOf(card.parentElement);
            if (i !== active) {
                event.preventDefault();
                goTo(i, true);
            }
        });

        // The event shown for a month on the ruler: the one in that month,
        // or the nearest one
        function eventFor(month) {
            if (active !== -1 && events[active].k === month) {
                return active;
            }
            let best = 0;
            events.forEach(function (e, k) {
                if (Math.abs(e.k - month) <= Math.abs(events[best].k - month)) {
                    best = k;
                }
            });
            return best;
        }

        const ruler = createRuler(function (month) {
            const i = eventFor(month);
            if (i !== active) {
                goTo(i, true, true);
            }
        });

        // Start on the most recent event
        window.addEventListener("resize", function () {
            ruler.resize();
            if (active !== -1) {
                goTo(active, false);
            }
        });
        ruler.resize();
        requestAnimationFrame(function () { goTo(events.length - 1, false); });
    }

    // ---------------------------------
    // The ruler: one tick per month from the first event to the last, a
    // thicker one each January and a dot under each month with an event.
    // The orange needle follows the mouse (or a finger) along the ruler and
    // rests on the nearest tick; ticks near it rise and brighten a little.
    // The wheel and the arrow keys move it too.
    // ---------------------------------

    function createRuler(onPick) {

        const ruler = mount.querySelector(".ms__ruler");
        const canvas = ruler.querySelector("canvas");
        const ctx = canvas.getContext("2d");
        const now = mount.querySelector(".ms__now");

        const PAD = 8;              // px kept clear at both ends
        const FOLLOW = [420, 41];   // stiffness, damping: needle chasing the pointer
        const SETTLE = [160, 26];   // needle coming to rest on a tick, without overshoot
        const SPREAD = 2.2;         // months over which the bump around the needle fades
        const WHEEL = 1 / 40;       // months per pixel of wheel scroll
        const TICK = "235, 240, 247";
        const NEEDLE = "#ff9f0a";

        const maxMonth = monthCount - 1;
        const eventMonths = {};
        events.forEach(function (e) { eventMonths[e.k] = true; });

        let pos = maxMonth;         // month under the needle (fractional while moving)
        let vel = 0;                // months per second
        let target = maxMonth;
        let spring = SETTLE;
        let moving = false;
        let byUser = false;         // moved by the visitor (true) or by the card strip (false)
        let pressed = false;
        let shown = -1;
        let width = 0;
        let height = 0;
        let ratio = 1;
        let frame = null;
        let lastTime = 0;
        let wheelTimer = null;

        function clamp(value) {
            return Math.min(Math.max(value, 0), maxMonth);
        }

        function step() {
            return maxMonth ? (width - PAD * 2) / maxMonth : 0;
        }

        function monthAt(clientX) {
            const rect = ruler.getBoundingClientRect();
            return clamp((clientX - rect.left - PAD) / (step() || 1));
        }

        function monthName(k) {
            const m = first.m + k;
            return FULL_MONTHS[m % 12] + " " + (first.y + Math.floor(m / 12));
        }

        function resize() {
            ratio = window.devicePixelRatio || 1;
            width = ruler.clientWidth;
            height = ruler.clientHeight;
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            draw();
        }

        function draw() {

            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.clearRect(0, 0, width, height);

            const gap = step();
            const base = height - 18;   // ticks stand on this line

            for (let k = 0; k <= maxMonth; k++) {

                const x = PAD + k * gap;
                const d = (k - pos) / SPREAD;
                const lift = Math.exp(-d * d / 2);      // 1 at the needle, fading to 0
                const january = (first.m + k) % 12 === 0;

                const h = january ? 16 + 10 * lift : 9 + 9 * lift;
                const w = january ? 3 : 1;
                ctx.fillStyle = "rgba(" + TICK + "," + (january ? 0.62 + 0.38 * lift : 0.3 + 0.6 * lift) + ")";
                ctx.fillRect(x - w / 2, base - h, w, h);

                if (eventMonths[k]) {
                    ctx.fillStyle = "rgba(" + TICK + "," + (0.35 + 0.6 * lift) + ")";
                    ctx.beginPath();
                    ctx.arc(x, base + 8, 1.5 + 0.8 * lift, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // The needle
            const nx = PAD + pos * gap;
            ctx.fillStyle = NEEDLE;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(nx - 1, 4, 2, base, 1);
            } else {
                ctx.rect(nx - 1, 4, 2, base);
            }
            ctx.fill();

            const month = Math.round(clamp(pos));
            if (month !== shown) {
                const forward = month > shown;
                const initial = shown === -1;
                shown = month;
                show(month, forward, initial);
            }
        }

        // The date above the ruler slides in from the side time moves to
        function show(month, forward, initial) {
            now.textContent = monthName(month);
            ruler.setAttribute("aria-valuenow", String(month));
            const i = events.findIndex(function (e) { return e.k === month; });
            ruler.setAttribute("aria-valuetext", monthName(month) + (i === -1 ? "" : ": " + events[i].title));
            if (initial) {
                return;
            }
            now.classList.remove("is-next", "is-prev");
            void now.offsetWidth;
            now.classList.add(forward ? "is-next" : "is-prev");
            if (byUser) {
                playTick();
                onPick(month);
            }
        }

        function tick(time) {
            frame = null;
            if (moving) {
                const dt = Math.min((time - (lastTime || time)) / 1000, 0.032);
                lastTime = time;
                vel += (-spring[0] * (pos - target) - spring[1] * vel) * dt;
                pos += vel * dt;
                if (Math.abs(pos - target) < 0.001 && Math.abs(vel) < 0.01) {
                    pos = target;
                    vel = 0;
                    moving = false;
                }
            }
            draw();
            if (moving) {
                frame = requestAnimationFrame(tick);
            }
        }

        function moveTo(month, how) {
            target = month;
            spring = how;
            if (!moving) {
                moving = true;
                lastTime = 0;
            }
            if (!frame) {
                frame = requestAnimationFrame(tick);
            }
        }

        // Mouse: the needle follows the pointer while it is over the ruler.
        // Touch and pen: while pressed. Either way it rests on a tick after.

        function chase(event) {
            byUser = true;
            moveTo(monthAt(event.clientX), FOLLOW);
        }

        function rest() {
            moveTo(Math.round(clamp(moving ? target : pos)), SETTLE);
        }

        ruler.addEventListener("pointerdown", function (event) {
            if (event.pointerType === "mouse" && event.button !== 0) {
                return;
            }
            pressed = true;
            try {
                ruler.setPointerCapture(event.pointerId);
            } catch (e) {
                /* capture is optional */
            }
            chase(event);
        });

        ruler.addEventListener("pointermove", function (event) {
            if (pressed || event.pointerType === "mouse") {
                chase(event);
            }
        });

        function release(event) {
            if (pressed) {
                pressed = false;
                rest();
            } else if (event.type === "pointerleave") {
                rest();
            }
        }

        ruler.addEventListener("pointerup", release);
        ruler.addEventListener("pointercancel", release);
        ruler.addEventListener("pointerleave", function (event) {
            if (!pressed) {
                release(event);
            }
        });

        // Wheel or trackpad: small moves for fine steps, big ones run on
        ruler.addEventListener("wheel", function (event) {
            const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
            const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * unit;
            if (!delta) {
                return;
            }
            event.preventDefault();
            byUser = true;
            moveTo(clamp((moving ? target : pos) + delta * WHEEL), SETTLE);
            clearTimeout(wheelTimer);
            wheelTimer = setTimeout(rest, 140);
        }, { passive: false });

        ruler.addEventListener("keydown", function (event) {
            const from = moving ? target : Math.round(pos);
            const keys = {
                ArrowLeft: from - 1,
                ArrowDown: from - 1,
                ArrowRight: from + 1,
                ArrowUp: from + 1,
                PageDown: from - 12,
                PageUp: from + 12,
                Home: 0,
                End: maxMonth
            };
            if (event.key in keys) {
                event.preventDefault();
                byUser = true;
                moveTo(clamp(Math.round(keys[event.key])), SETTLE);
            }
        });

        return {
            resize: resize,
            // The card strip moved: glide to its month unless the visitor holds the ruler
            follow: function (month) {
                if (pressed) {
                    return;
                }
                byUser = false;
                moveTo(month, SETTLE);
            },
            jump: function (month) {
                if (pressed) {
                    return;
                }
                byUser = false;
                moving = false;
                vel = 0;
                pos = target = month;
                draw();
            }
        };
    }

    createTimeline(events, "all");
})();
