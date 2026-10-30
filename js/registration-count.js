(function () {
  var els = document.querySelectorAll("#registration-count, [data-registration-count]");
  if (!els.length) return;

  var jsonUrl = "/data/registration-count.json";
  var COUNT_UP_MS = 1000;
  var shown = null;

  function format(n) {
    return typeof n === "number" ? n.toLocaleString() : "—";
  }

  // Count from 1 up to n, easing out so it slows near the end
  function countUp(el, n) {
    var start = null;

    function step(now) {
      if (start === null) start = now;
      var t = Math.min((now - start) / COUNT_UP_MS, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(Math.max(1, Math.round(1 + (n - 1) * eased)));
      if (t < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  // Start counting once the number scrolls into view
  function countUpWhenVisible(el, n) {
    if (!("IntersectionObserver" in window) || !window.requestAnimationFrame) {
      el.textContent = format(n);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      countUp(el, n);
    });

    observer.observe(el);
  }

  function showCount(n) {
    var first = shown === null;
    if (n === shown) return;
    shown = n;

    els.forEach(function (el) {
      if (first && n > 1) {
        countUpWhenVisible(el, n);
      } else {
        el.textContent = format(n);
      }
    });
  }

  function refresh() {
    fetch(jsonUrl + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then(function (data) {
        if (data && typeof data.count === "number") showCount(data.count);
      })
      .catch(function () {
        /* keep last displayed value on error */
      });
  }

  refresh();
  setInterval(refresh, 60000);
})();
