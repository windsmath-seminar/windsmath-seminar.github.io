(function () {
  var el = document.getElementById("registration-count");
  if (!el) return;

  var jsonUrl = "/data/registration-count.json";

  function showCount(n) {
    el.textContent = typeof n === "number" ? n.toLocaleString() : "—";
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
