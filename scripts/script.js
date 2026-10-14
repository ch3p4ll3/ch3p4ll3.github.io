(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* THEME */
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var saved = safeGet("theme");
  if (saved) root.setAttribute("data-theme", saved);
  else if (window.matchMedia("(prefers-color-scheme: light)").matches) root.setAttribute("data-theme", "light");
  document.getElementById("themeToggle").addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    safeSet("theme", next);
  });

  document.getElementById("year").textContent = new Date().getFullYear();

  /* MOBILE MENU */
  var nav = document.querySelector(".nav");
  var navToggle = document.getElementById("navToggle");
  function setMenu(open) {
    nav.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  navToggle.addEventListener("click", function () {
    setMenu(!nav.classList.contains("open"));
  });
  document.querySelectorAll("#primaryNav a").forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); navToggle.focus(); }
  });
  document.addEventListener("click", function (e) {
    if (nav.classList.contains("open") && !nav.contains(e.target)) setMenu(false);
  });
  window.matchMedia("(min-width: 641px)").addEventListener("change", function (m) {
    if (m.matches) setMenu(false);
  });

  /* FILTERS */
  var cards = Array.prototype.slice.call(document.querySelectorAll("#grid .card"));
  var buttons = document.querySelectorAll(".filter");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      buttons.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var f = btn.getAttribute("data-filter");
      cards.forEach(function (c) {
        var tags = (c.getAttribute("data-tags") || "").split(" ");
        c.hidden = !(f === "all" || tags.indexOf(f) !== -1);
      });
    });
  });

  /* REVEAL ON SCROLL */
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  /* LIVE GITHUB NUMBERS (falls back silently to the static values in the HTML) */
  fetch("https://api.github.com/users/ch3p4ll3/repos?per_page=100&type=owner")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (repos) {
      var own = repos.filter(function (r) { return !r.fork; });
      var byName = {};
      own.forEach(function (r) { byName[r.name] = r; });
      cards.forEach(function (c) {
        var r = byName[c.getAttribute("data-repo")];
        if (!r) return;
        var s = c.querySelector("[data-stars]"), f = c.querySelector("[data-forks]");
        if (s) s.textContent = r.stargazers_count;
        if (f) f.textContent = r.forks_count;
      });
      var top = own.reduce(function (m, r) { return Math.max(m, r.stargazers_count); }, 0);
      if (top) document.getElementById("statStars").textContent = top;
      document.getElementById("statRepos").textContent = own.length >= 100 ? "100+" : own.length;
    })
    .catch(function () {});

  /* HERO: PCB traces with signal pulses running along them */
  var canvas = document.getElementById("trace");
  var ctx = canvas.getContext("2d");
  var G = 28, TAIL = 14, STEP = 5;
  var w, h, dpr, traces = [];
  var DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  function rand(a, b) { return a + Math.random() * (b - a); }
  function color(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }

  function buildTrace() {
    var x = Math.round(rand(0, w) / G) * G;
    var y = Math.round(rand(0, h) / G) * G;
    var dir = Math.floor(rand(0, 4));
    var pts = [[x, y]], lens = [0], total = 0;
    var segs = Math.round(rand(3, 7));
    for (var i = 0; i < segs; i++) {
      var len = Math.round(rand(2, 8)) * G;
      x += DIRS[dir][0] * len;
      y += DIRS[dir][1] * len;
      pts.push([x, y]);
      total += len;
      lens.push(total);
      dir = (dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
    }
    return { pts: pts, lens: lens, total: total, t: rand(-TAIL * STEP, total), speed: rand(0.7, 2.1) };
  }

  function pointAt(tr, d) {
    for (var i = 1; i < tr.lens.length; i++) {
      if (d <= tr.lens[i]) {
        var k = (d - tr.lens[i - 1]) / (tr.lens[i] - tr.lens[i - 1]);
        var a = tr.pts[i - 1], b = tr.pts[i];
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      }
    }
    return tr.pts[tr.pts.length - 1];
  }

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.max(14, Math.min(42, Math.round((w * h) / 24000)));
    traces = [];
    for (var i = 0; i < n; i++) traces.push(buildTrace());
    if (reduce) draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    var accent = color("--accent"), line = color("--line-solid");
    var i, j, tr;

    ctx.lineWidth = 1.2;
    ctx.lineJoin = "round";
    ctx.strokeStyle = line;
    ctx.globalAlpha = 0.9;
    for (i = 0; i < traces.length; i++) {
      tr = traces[i];
      ctx.beginPath();
      ctx.moveTo(tr.pts[0][0], tr.pts[0][1]);
      for (j = 1; j < tr.pts.length; j++) ctx.lineTo(tr.pts[j][0], tr.pts[j][1]);
      ctx.stroke();
      // solder pads at both ends
      var ends = [tr.pts[0], tr.pts[tr.pts.length - 1]];
      for (j = 0; j < 2; j++) {
        ctx.beginPath();
        ctx.arc(ends[j][0], ends[j][1], 3.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.fillStyle = accent;
    for (i = 0; i < traces.length; i++) {
      tr = traces[i];
      for (j = 0; j < TAIL; j++) {
        var d = tr.t - j * STEP;
        if (d < 0 || d > tr.total) continue;
        var p = pointAt(tr, d);
        ctx.globalAlpha = 1 - j / TAIL;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 2.4 - j * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  var running = false, visible = true;

  function frame() {
    if (!visible || document.hidden) { running = false; return; }
    for (var i = 0; i < traces.length; i++) {
      var tr = traces[i];
      tr.t += tr.speed;
      if (tr.t - TAIL * STEP > tr.total) traces[i] = buildTrace();
    }
    draw();
    requestAnimationFrame(frame);
  }

  function start() {
    if (reduce || running || !visible || document.hidden) return;
    running = true;
    requestAnimationFrame(frame);
  }

  size();

  // Only rebuild on width changes: mobile browsers fire resize whenever the
  // address bar shows/hides, which would reshuffle the traces while scrolling.
  var lastW = canvas.clientWidth;
  window.addEventListener("resize", function () {
    if (canvas.clientWidth !== lastW) { lastW = canvas.clientWidth; size(); }
  });

  // Pause the animation when the hero is off screen or the tab is hidden (saves battery on phones).
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start();
    }).observe(canvas);
  }
  document.addEventListener("visibilitychange", start);
  start();
})();