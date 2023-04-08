document.addEventListener("scroll", function() {
  var navbar = document.querySelector(".navbar");
  var scrollPosition = window.pageYOffset;

  if (scrollPosition >= navbar.offsetHeight) {
    navbar.style.backgroundColor = "transparent";
  } else {
    var opacity = 1 - (scrollPosition / navbar.offsetHeight);
    navbar.style.backgroundColor = "rgba(33, 37, 41, " + opacity + ")";
  }
});// JavaScript Document