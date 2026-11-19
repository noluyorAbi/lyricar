/* ==========================================================================
   Lyricar landing page, the whole client side.

   One clock drives every surface on the page, the way one LyricsEngine
   drives the phone, CarPlay, the Live Activity and the widgets in the app.
   The lyrics are read from the karaoke list in the HTML, so the page works
   and reads the same without this file. No network calls, no dependencies.
   Loaded with defer, so the DOM is parsed before this runs.
   ========================================================================== */

(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = reduceQuery.matches;

  /* Names and taglines from LyricTheme.swift; theme colors are each style's base. */
  var STYLES = {
    midnight: { name: "Midnight", tagline: "amber on black", theme: "#0b0b0f" },
    motorsport: { name: "Motorsport", tagline: "tricolor stripe on graphite", theme: "#17191d" },
    nightdrive: { name: "Night Drive", tagline: "black glass, blue glow", theme: "#03060c" },
    panoramic: { name: "Panoramic", tagline: "light band, gradient line", theme: "#f0f1ef" },
    sport: { name: "Sport", tagline: "carbon and redline", theme: "#0d0d0d" },
    luxe: { name: "Luxe", tagline: "champagne serif", theme: "#15110d" },
    neon: { name: "Neon", tagline: "synthwave glow", theme: "#16032a" },
    daylight: { name: "Daylight", tagline: "readable in sun", theme: "#f7f7f4" }
  };
  var STORAGE_KEY = "lyricar-style";
  var DURATION = 98000;
  var START_MS = 7900; /* the line the HTML marks as current */

  var sheet = doc.getElementById("sheet");
  var viewsEl = doc.getElementById("views");
  if (!sheet || !viewsEl) return;

  var lineEls = Array.prototype.slice.call(sheet.querySelectorAll(".k-line"));
  var lines = lineEls.map(function (el) {
    var text = el.hasAttribute("data-text") ? el.getAttribute("data-text") : el.textContent.trim();
    return { ms: Number(el.getAttribute("data-ms")), text: text === "" ? "♪" : text };
  });

  function display(i) {
    return i >= 0 && i < lines.length ? lines[i].text : "";
  }

  function indexAt(ms) {
    var low = 0;
    var high = lines.length - 1;
    var found = 0;
    while (low <= high) {
      var mid = (low + high) >> 1;
      if (lines[mid].ms <= ms) {
        found = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return found;
  }

  /* ---------------------------------------------------------------- clock */
  var clock = { playing: false, anchor: 0, pausedAt: START_MS };

  function now() {
    return window.performance.now();
  }

  function position() {
    if (!clock.playing) return clock.pausedAt;
    var p = (now() - clock.anchor) % DURATION;
    return p < 0 ? p + DURATION : p;
  }

  function seek(ms, instant) {
    ms = ((ms % DURATION) + DURATION) % DURATION;
    if (clock.playing) clock.anchor = now() - ms;
    else clock.pausedAt = ms;
    update(Boolean(instant));
  }

  /* `instant` for keyboard jumps: a key press moves the sheet without a slide. */
  function seekLine(i, instant) {
    i = Math.max(0, Math.min(lines.length - 1, i));
    seek(lines[i].ms + 1, instant);
  }

  function setPlaying(on) {
    if (on === clock.playing) return;
    var pos = position();
    clock.playing = on;
    if (on) clock.anchor = now() - pos;
    else clock.pausedAt = pos;
    syncPlayButtons();
    schedule();
  }

  function syncPlayButtons() {
    root.classList.toggle("is-paused", !clock.playing);
    var label = clock.playing ? "Pause the demo song" : "Play the demo song";
    each('[data-cmd="toggle"]', function (b) { b.setAttribute("aria-label", label); });
  }

  /* --------------------------------------------------------------- render */
  var current = -1;
  var fills = doc.querySelectorAll("[data-progress]");
  var binds = doc.querySelectorAll("[data-bind]");
  var focusStack = doc.querySelector(".focus-stack");
  var cpList = doc.getElementById("cp-list");
  var mode = "karaoke";

  function update(instant) {
    var pos = position();
    var i = indexAt(pos);
    if (i !== current || instant) {
      var previous = current;
      current = i;
      renderLine(i, previous, instant);
    }
    for (var k = 0; k < fills.length; k += 1) {
      fills[k].style.transform = "scaleX(" + (pos / DURATION).toFixed(4) + ")";
    }
  }

  function renderLine(i, previous, instant) {
    for (var k = 0; k < lineEls.length; k += 1) {
      var el = lineEls[k];
      el.classList.toggle("is-past", k < i);
      el.classList.toggle("is-current", k === i);
      if (k === i) el.setAttribute("aria-current", "true");
      else el.removeAttribute("aria-current");
    }
    positionSheet(instant);

    var texts = { now: display(i), next: display(i + 1), after: display(i + 2), prev: display(i - 1) };
    var changed = [];
    for (var b = 0; b < binds.length; b += 1) {
      var node = binds[b];
      var text = texts[node.getAttribute("data-bind")];
      if (node.textContent !== text) {
        node.textContent = text;
        changed.push(node);
      }
    }
    if (!instant && changed.length) {
      changed.forEach(function (n) { n.classList.remove("is-swapping"); });
      void doc.body.offsetWidth;
      changed.forEach(function (n) { n.classList.add("is-swapping"); });
    }

    renderFocus(texts.now, !instant && mode === "focus");
    renderCarPlay(i, previous, instant);
  }

  /* Karaoke: keep the current line in the upper third (anchor y 0.32, as in the app). */
  function positionSheet(instant) {
    var el = lineEls[Math.max(current, 0)];
    if (!el) return;
    var height = viewsEl.clientHeight;
    var y = Math.round(height * 0.32 - (el.offsetTop + el.offsetHeight * 0.32));
    if (instant) sheet.classList.add("is-instant");
    sheet.style.transform = "translateY(" + y + "px)";
    if (instant) {
      void sheet.offsetWidth;
      sheet.classList.remove("is-instant");
    }
  }

  /* Focus: the new line rises in from below while the old one leaves upward. */
  function renderFocus(text, animate) {
    if (!focusStack) return;
    var old = focusStack.querySelector(".focus-now:not(.is-leaving)");
    if (old && old.textContent === text) return;
    if (!animate || !old) {
      if (old) old.textContent = text;
      return;
    }
    var el = doc.createElement("p");
    el.className = "focus-now is-entering";
    el.textContent = text;
    focusStack.appendChild(el);
    old.classList.add("is-leaving");
    window.setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 320);
    void el.offsetWidth;
    el.classList.remove("is-entering");
  }

  /* CarPlay: the list starts at the current line, so the window moves, not the highlight. */
  var cpFinish = null;
  function renderCarPlay(i, previous, instant) {
    if (!cpList) return;
    if (cpFinish) cpFinish();
    var stepped = !instant && !reduce && previous >= 0 && i === previous + 1 && cpList.children.length > 1;
    if (!stepped) {
      cpList.textContent = "";
      for (var k = i; k < Math.min(i + 4, lines.length); k += 1) {
        var row = doc.createElement("li");
        row.textContent = display(k);
        if (k === i) row.className = "is-on";
        cpList.appendChild(row);
      }
      return;
    }
    if (i + 3 < lines.length) {
      var added = doc.createElement("li");
      added.textContent = display(i + 3);
      cpList.appendChild(added);
    }
    var first = cpList.firstElementChild;
    first.classList.remove("is-on");
    if (first.nextElementSibling) first.nextElementSibling.classList.add("is-on");
    cpList.style.transform = "translateY(" + -first.offsetHeight + "px)";
    var timer = window.setTimeout(function () { if (cpFinish) cpFinish(); }, 460);
    cpFinish = function () {
      window.clearTimeout(timer);
      cpFinish = null;
      cpList.classList.add("is-instant");
      if (cpList.firstElementChild) cpList.removeChild(cpList.firstElementChild);
      cpList.style.transform = "";
      void cpList.offsetWidth;
      cpList.classList.remove("is-instant");
    };
  }

  /* ----------------------------------------------------------------- loop */
  var raf = 0;
  var visible = 0;

  function frame() {
    raf = 0;
    update(false);
    schedule();
  }

  function schedule() {
    if (raf || !clock.playing || doc.hidden || visible === 0) return;
    raf = window.requestAnimationFrame(frame);
  }

  /* Only run while a live surface is on screen and the tab is visible. */
  var liveEls = doc.querySelectorAll("[data-live]");
  if ("IntersectionObserver" in window) {
    var states = [];
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var index = Array.prototype.indexOf.call(liveEls, entry.target);
        states[index] = entry.isIntersecting;
      });
      visible = states.filter(Boolean).length;
      if (visible) {
        update(false);
        schedule();
      }
    });
    Array.prototype.forEach.call(liveEls, function (el) { observer.observe(el); });
  } else {
    visible = 1;
  }
  doc.addEventListener("visibilitychange", function () {
    if (!doc.hidden) {
      update(false);
      schedule();
    }
  });

  /* ---------------------------------------------------------------- modes */
  var MODES = ["karaoke", "focus", "verse"];
  var picker = doc.querySelector(".mode-picker");

  function setMode(next) {
    if (next === mode || MODES.indexOf(next) < 0) return;
    var from = MODES.indexOf(mode);
    var to = MODES.indexOf(next);
    var forward = to > from;
    var oldView = viewsEl.querySelector('[data-view="' + mode + '"]');
    var newView = viewsEl.querySelector('[data-view="' + next + '"]');

    /* Place the incoming view on the side it comes from, without a transition. */
    newView.classList.add("is-instant");
    newView.classList.remove("to-left", "to-right", "is-active");
    newView.classList.toggle("from-left", !forward);
    void newView.offsetWidth;
    newView.classList.remove("is-instant", "from-left");

    oldView.classList.remove("is-active");
    oldView.classList.add(forward ? "to-left" : "to-right");
    newView.classList.add("is-active");
    oldView.setAttribute("aria-hidden", "true");
    newView.removeAttribute("aria-hidden");

    mode = next;
    viewsEl.setAttribute("data-mode", next);
    each(".mode-btn", function (btn) {
      var on = btn.getAttribute("data-mode") === next;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (picker) picker.style.setProperty("--mode-i", String(to));
    if (next === "karaoke") positionSheet(true);
  }

  /* --------------------------------------------------------------- styles */
  var meta = doc.querySelector('meta[name="theme-color"]');
  var pageBg = doc.querySelector(".page-bg");

  function applyStyle(name, animate) {
    if (!STYLES[name]) return;
    var old = root.getAttribute("data-style");
    if (old === name) return;

    if (animate && !reduce && pageBg) {
      /* Crossfade the old background out over the new one. */
      var fade = doc.createElement("div");
      fade.className = "bg-fade";
      fade.setAttribute("data-style", old);
      fade.setAttribute("aria-hidden", "true");
      pageBg.parentNode.insertBefore(fade, pageBg.nextSibling);
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { fade.classList.add("is-gone"); });
      });
      window.setTimeout(function () { if (fade.parentNode) fade.parentNode.removeChild(fade); }, 700);
      root.classList.add("is-restyling");
      window.setTimeout(function () { root.classList.remove("is-restyling"); }, 360);
    }

    root.setAttribute("data-style", name);
    if (meta) meta.setAttribute("content", STYLES[name].theme);
    each("[data-style-pick]", function (btn) {
      var on = btn.getAttribute("data-style-pick") === name;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    each("[data-style-name]", function (el) { el.textContent = STYLES[name].name; });
    each("[data-style-tagline]", function (el) { el.textContent = STYLES[name].tagline; });
    try { window.localStorage.setItem(STORAGE_KEY, name); } catch (error) { /* storage may be blocked */ }
    positionSheet(true);
  }

  /* Line heights change when a style's face finishes loading. */
  if (doc.fonts && doc.fonts.addEventListener) {
    doc.fonts.addEventListener("loadingdone", function () { positionSheet(true); });
  }
  window.addEventListener("resize", debounce(function () { positionSheet(true); }, 120));

  /* ----------------------------------------------------------------- copy */
  function copyCommand(btn) {
    var target = doc.getElementById(btn.getAttribute("data-copy"));
    if (!target || !navigator.clipboard || !navigator.clipboard.writeText) return;
    var label = btn.getAttribute("data-label") || btn.getAttribute("aria-label");
    btn.setAttribute("data-label", label);
    navigator.clipboard.writeText(target.textContent.trim()).then(function () {
      btn.classList.add("is-done");
      btn.setAttribute("aria-label", "Copied");
      window.setTimeout(function () {
        btn.classList.remove("is-done");
        btn.setAttribute("aria-label", label);
      }, 1600);
    }, function () { /* clipboard refused: the command stays selectable */ });
  }

  /* --------------------------------------------------------------- events */
  doc.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var cmd = target.closest("[data-cmd]");
    if (cmd) {
      var action = cmd.getAttribute("data-cmd");
      if (action === "toggle") setPlaying(!clock.playing);
      else if (action === "next") seekLine(current + 1);
      else if (action === "prev") seekLine(current - 1);
      return;
    }
    var line = target.closest(".k-line");
    if (line) {
      seekLine(lineEls.indexOf(line));
      return;
    }
    var pick = target.closest("[data-style-pick]");
    if (pick) {
      applyStyle(pick.getAttribute("data-style-pick"), true);
      return;
    }
    var modeBtn = target.closest(".mode-btn");
    if (modeBtn) {
      setMode(modeBtn.getAttribute("data-mode"));
      return;
    }
    var copy = target.closest("[data-copy]");
    if (copy) copyCommand(copy);
  });

  /* The karaoke sheet is one tab stop; the arrow keys do what a tap on a line does. */
  sheet.addEventListener("keydown", function (event) {
    var target;
    if (event.key === "ArrowDown") target = current + 1;
    else if (event.key === "ArrowUp") target = current - 1;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = lines.length - 1;
    else return;
    event.preventDefault();
    seekLine(target, true);
  });

  if (reduceQuery.addEventListener) {
    reduceQuery.addEventListener("change", function (event) { reduce = event.matches; });
  }

  /* ---------------------------------------------------------------- utils */
  function each(selector, fn) {
    Array.prototype.forEach.call(doc.querySelectorAll(selector), fn);
  }

  function debounce(fn, wait) {
    var timer = 0;
    return function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(fn, wait);
    };
  }

  /* ----------------------------------------------------------------- init */
  var saved = null;
  try { saved = window.localStorage.getItem(STORAGE_KEY); } catch (error) { saved = null; }
  if (saved && STYLES[saved]) applyStyle(saved, false);

  /* Motion welcome: the song plays. Reduced motion: it waits, paused, for the play button. */
  if (!reduce) {
    clock.playing = true;
    clock.anchor = now() - START_MS;
  }
  update(true);
  syncPlayButtons();
  schedule();
})();
