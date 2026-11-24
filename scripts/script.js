(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* THEME — dark is the default; the light palette is a deliberate, readable alternative. */
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var themeButton = document.getElementById("themeToggle");
  var PALETTES = {
    dark: { line: "#24314B", accent: "#FBBF24", bg: "#070A12" },
    light: { line: "#DBDFE3", accent: "#B45309", bg: "#F7F7F4" }
  };

  function isDark() { return root.classList.contains("dark"); }
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function syncThemeButton() {
    var next = isDark() ? "light" : "dark";
    themeButton.setAttribute("aria-label", "Switch to " + next + " theme");
    if (themeMeta) themeMeta.setAttribute("content", PALETTES[isDark() ? "dark" : "light"].bg);
  }

  function setTheme(theme) {
    root.classList.toggle("dark", theme === "dark");
    root.setAttribute("data-theme", theme);
    safeSet("theme", theme);
    syncThemeButton();
    if (typeof draw === "function") draw();
  }

  syncThemeButton();
  themeButton.addEventListener("click", function () {
    setTheme(isDark() ? "light" : "dark");
  });

  document.getElementById("year").textContent = new Date().getFullYear();

  /* MOBILE MENU */
  var nav = document.getElementById("primaryNav");
  var navToggle = document.getElementById("navToggle");
  var menuIcon = document.getElementById("menuIcon");
  var closeIcon = document.getElementById("closeIcon");

  function setMenu(open) {
    nav.classList.toggle("hidden", !open);
    nav.classList.toggle("flex", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menuIcon.classList.toggle("hidden", open);
    closeIcon.classList.toggle("hidden", !open);
  }

  navToggle.addEventListener("click", function () {
    setMenu(nav.classList.contains("hidden"));
  });
  document.querySelectorAll("#primaryNav a").forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !nav.classList.contains("hidden")) {
      setMenu(false);
      navToggle.focus();
    }
  });
  document.addEventListener("click", function (e) {
    if (!nav.classList.contains("hidden") && !nav.contains(e.target) && !navToggle.contains(e.target)) setMenu(false);
  });
  window.matchMedia("(min-width: 768px)").addEventListener("change", function (m) {
    if (m.matches) setMenu(false);
  });

  /* ACTIVE SECTION IN NAV */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("#primaryNav a"));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          if (a.getAttribute("href") === "#" + entry.target.id) a.setAttribute("aria-current", "page");
          else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-25% 0px -65% 0px" });
    sections.forEach(function (s) { sectionObserver.observe(s); });
  }

  /* PROJECT FILTERS */
  var cards = Array.prototype.slice.call(document.querySelectorAll("#grid .card"));
  var buttons = Array.prototype.slice.call(document.querySelectorAll(".filter"));
  var filterStatus = document.getElementById("filterStatus");

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var filter = btn.getAttribute("data-filter");
      buttons.forEach(function (b) {
        var active = b === btn;
        b.setAttribute("aria-pressed", active ? "true" : "false");
        b.classList.toggle("bg-amber-600", active);
        b.classList.toggle("text-white", active);
        b.classList.toggle("dark:bg-amber-400", active);
        b.classList.toggle("dark:text-ink-950", active);
        b.classList.toggle("border-slate-300", !active);
        b.classList.toggle("text-slate-600", !active);
        b.classList.toggle("dark:border-ink-600", !active);
        b.classList.toggle("dark:text-slate-300", !active);
      });

      var shown = 0;
      cards.forEach(function (c) {
        var tags = (c.getAttribute("data-tags") || "").split(" ");
        var visible = filter === "all" || tags.indexOf(filter) !== -1;
        c.hidden = !visible;
        // Tailwind's display utilities can override the browser's [hidden] rule,
        // so mirror the state with the `hidden` utility as well.
        c.classList.toggle("hidden", !visible);
        if (visible) shown++;
      });
      filterStatus.textContent = filter === "all"
        ? "Showing all " + shown + " projects"
        : "Showing " + shown + " " + (shown === 1 ? "project" : "projects") + " in " + btn.textContent.trim().replace(/\d+$/, "").trim();
    });
  });

  /* REVEAL ON SCROLL — toggles Tailwind utilities, no custom CSS needed. */
  var revealItems = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("opacity-100", "translate-y-0");
        e.target.classList.remove("opacity-0", "translate-y-4");
        io.unobserve(e.target);
      });
    }, { threshold: 0.1 });
    revealItems.forEach(function (el) { io.observe(el); });
  } else {
    revealItems.forEach(function (el) {
      el.classList.add("opacity-100", "translate-y-0");
      el.classList.remove("opacity-0", "translate-y-4");
    });
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
    var palette = PALETTES[isDark() ? "dark" : "light"];
    var i, j, tr;

    ctx.lineWidth = 1.2;
    ctx.lineJoin = "round";
    ctx.strokeStyle = palette.line;
    ctx.globalAlpha = 0.9;
    for (i = 0; i < traces.length; i++) {
      tr = traces[i];
      ctx.beginPath();
      ctx.moveTo(tr.pts[0][0], tr.pts[0][1]);
      for (j = 1; j < tr.pts.length; j++) ctx.lineTo(tr.pts[j][0], tr.pts[j][1]);
      ctx.stroke();
      var ends = [tr.pts[0], tr.pts[tr.pts.length - 1]];
      for (j = 0; j < 2; j++) {
        ctx.beginPath();
        ctx.arc(ends[j][0], ends[j][1], 3.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.fillStyle = palette.accent;
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
