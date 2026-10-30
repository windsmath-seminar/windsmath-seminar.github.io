// Site navigation: scrolled state, mobile menu, current-page marker.
document.addEventListener("DOMContentLoaded", function () {
  var nav = document.querySelector(".site-nav");
  if (!nav) return;

  var toggle = nav.querySelector(".site-nav__toggle");
  var menu = nav.querySelector(".site-nav__menu");

  // Sections marked data-nav="light" turn the bar white while it sits over them
  var lightSections = document.querySelectorAll('[data-nav="light"]');

  function overLight() {
    var line = nav.offsetHeight / 2;
    for (var i = 0; i < lightSections.length; i++) {
      var rect = lightSections[i].getBoundingClientRect();
      if (rect.top <= line && rect.bottom > line) return true;
    }
    return false;
  }

  // Hairline under the bar once the page has scrolled
  function onScroll() {
    nav.classList.toggle("is-scrolled", window.pageYOffset > 8);
    nav.classList.toggle("is-light", overLight());
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mark the current page
  var here = location.pathname.split("/").pop() || "index.html";
  nav.querySelectorAll(".site-nav__links a").forEach(function (link) {
    var target = link.getAttribute("href");
    if (target === here && !location.hash) {
      link.setAttribute("aria-current", "page");
    }
  });

  if (!toggle || !menu) return;

  function setOpen(open) {
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.querySelector(".site-nav__toggle-text").textContent = open ? "Close" : "Menu";
  }

  toggle.addEventListener("click", function () {
    setOpen(!nav.classList.contains("is-open"));
  });

  // Close after choosing a link (including in-page anchors)
  menu.addEventListener("click", function (event) {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 991 && nav.classList.contains("is-open")) setOpen(false);
  });
});
