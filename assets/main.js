/* Living Hope Senior Care — interactions */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header shadow, scroll progress, back-to-top */
  var header = document.querySelector(".site-header");
  var bar = document.querySelector(".scroll-progress");
  var toTop = document.querySelector(".to-top");
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle("scrolled", y > 20);
    if (toTop) toTop.classList.toggle("show", y > 700);
    if (bar) {
      var h = doc.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
    }
    parallax();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  if (toTop) toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });

  /* Gentle parallax on background photos */
  var pItems = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  function parallax() {
    if (reduce) return;
    pItems.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var speed = parseFloat(el.getAttribute("data-parallax")) || 0.12;
      var off = (r.top + r.height / 2 - window.innerHeight / 2) * -speed;
      el.style.transform = "translate3d(0," + off.toFixed(1) + "px,0)";
    });
  }

  /* Mobile menu */
  var toggle = document.querySelector(".menu-toggle");
  var scrim = document.querySelector(".nav-scrim");
  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (toggle) toggle.addEventListener("click", function () { setMenu(!document.body.classList.contains("menu-open")); });
  if (scrim) scrim.addEventListener("click", function () { setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  document.querySelectorAll(".nav a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });

  /* Scroll reveal (content is visible without JS; the .js class opts in) */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var d = en.target.getAttribute("data-delay");
          if (d) en.target.style.transitionDelay = d + "ms";
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
    /* Safety net: never leave content hidden */
    setTimeout(function () { revealEls.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in"); }); }, 1800);
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* Count-up numbers */
  var counters = document.querySelectorAll("[data-count]");
  function runCount(el) {
    var end = parseInt(el.getAttribute("data-count"), 10);
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = end + suffix; return; }
    var start = null;
    function tick(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / 1600, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { runCount(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* Year */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Form helpers ---------- */
  function validate(scope) {
    var ok = true, first = null;
    scope.querySelectorAll("[required]").forEach(function (input) {
      var field = input.closest(".field") || input.closest(".consent");
      var valid;
      if (input.type === "checkbox") valid = input.checked;
      else if (input.type === "radio") valid = !!scope.querySelector('input[name="' + input.name + '"]:checked');
      else valid = input.value.trim() !== "" && input.checkValidity();
      if (field) field.classList.toggle("invalid", !valid);
      if (!valid) { ok = false; if (!first) first = input; }
    });
    if (first) first.focus();
    return ok;
  }
  document.querySelectorAll("input, select, textarea").forEach(function (el) {
    el.addEventListener("input", function () { var f = el.closest(".field"); if (f) f.classList.remove("invalid"); });
  });

  function showSuccess(form) {
    var success = form.parentElement.querySelector(".form-success");
    form.hidden = true;
    if (success) {
      success.hidden = false;
      success.setAttribute("tabindex", "-1");
      success.focus();
      success.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }
  }

  /* Simple forms (request care) */
  document.querySelectorAll("form[data-simple-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      /* TODO: connect to your form backend (PHP mailer, Formspree, Wix form, etc.) */
      showSuccess(form);
    });
  });

  /* Pre-select a service from ?service= in the URL */
  try {
    var svc = new URLSearchParams(location.search).get("service");
    if (svc) {
      var box = document.querySelector('input[name="services"][value="' + svc + '"]');
      if (box) box.checked = true;
    }
  } catch (err) { /* ignore */ }

  /* ---------- Caregiver application (multi-step) ---------- */
  var app = document.querySelector("#application-form");
  if (app) {
    var steps = Array.prototype.slice.call(app.querySelectorAll(".form-step"));
    var marks = Array.prototype.slice.call(document.querySelectorAll(".progress li"));
    var current = 0;
    function go(i) {
      steps[current].hidden = true;
      current = i;
      steps[current].hidden = false;
      marks.forEach(function (m, idx) {
        m.classList.toggle("active", idx === current);
        m.classList.toggle("done", idx < current);
        if (idx === current) m.setAttribute("aria-current", "step"); else m.removeAttribute("aria-current");
      });
      if (current === steps.length - 1) buildReview();
      var top = app.closest(".form-card").getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
      var h = steps[current].querySelector("h3");
      if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    }
    app.querySelectorAll("[data-next]").forEach(function (b) {
      b.addEventListener("click", function () { if (validate(steps[current])) go(current + 1); });
    });
    app.querySelectorAll("[data-prev]").forEach(function (b) {
      b.addEventListener("click", function () { go(current - 1); });
    });

    /* File uploads */
    var MAX = 10 * 1024 * 1024;
    app.querySelectorAll(".upload").forEach(function (zone) {
      var input = zone.querySelector("input[type=file]");
      var label = zone.querySelector(".u-text");
      var original = label.innerHTML;
      var row = zone.closest(".req-row");
      input.addEventListener("change", function () {
        var f = input.files && input.files[0];
        if (!f) { label.innerHTML = original; zone.classList.remove("filled"); if (row) row.classList.remove("has-file"); return; }
        if (f.size > MAX) {
          input.value = "";
          label.innerHTML = "<strong>That file is over 10 MB</strong><small>Please upload a smaller PDF or photo.</small>";
          zone.classList.remove("filled");
          return;
        }
        var kb = f.size / 1024;
        var size = kb > 1024 ? (kb / 1024).toFixed(1) + " MB" : Math.round(kb) + " KB";
        label.innerHTML = "<strong></strong><small>" + size + " · tap to replace</small>";
        label.querySelector("strong").textContent = f.name;
        zone.classList.add("filled");
        if (row) {
          row.classList.add("has-file");
          var yes = row.querySelector('input[value="yes"]');
          if (yes && !row.querySelector("input[type=radio]:checked")) yes.checked = true;
        }
      });
      ["dragenter", "dragover"].forEach(function (ev) { zone.addEventListener(ev, function () { zone.classList.add("drag"); }); });
      ["dragleave", "drop"].forEach(function (ev) { zone.addEventListener(ev, function () { zone.classList.remove("drag"); }); });
    });

    function buildReview() {
      var list = app.querySelector("#review-reqs");
      if (!list) return;
      list.innerHTML = "";
      app.querySelectorAll(".req-row").forEach(function (row) {
        var name = row.getAttribute("data-req");
        var picked = row.querySelector("input[type=radio]:checked");
        var file = row.querySelector("input[type=file]");
        var li = document.createElement("li");
        var a = document.createElement("span"); a.textContent = name;
        var b = document.createElement("span");
        var val = picked ? picked.value : "no";
        var map = { yes: ["yes", "I have this"], progress: ["progress-s", "In progress"], no: ["no", "Not yet"] };
        b.className = "status " + map[val][0];
        b.textContent = map[val][1] + (file && file.files && file.files[0] ? " · document attached" : "");
        li.appendChild(a); li.appendChild(b); list.appendChild(li);
      });
      var nm = app.querySelector("#a-first"), ln = app.querySelector("#a-last");
      var who = app.querySelector("#review-name");
      if (who && nm) who.textContent = (nm.value + " " + (ln ? ln.value : "")).trim();
    }

    app.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(steps[current])) return;
      /* TODO: post FormData(app) to your backend; files are included as multipart uploads. */
      var marksWrap = document.querySelector(".progress");
      if (marksWrap) marksWrap.hidden = true;
      showSuccess(app);
    });
  }

  onScroll();
})();
