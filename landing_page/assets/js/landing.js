/* ==========================================================================
   ArchiTek Soft — landing page behaviour
   Showcase modes, comparison slider, viewer swatches, fullscreen, theme,
   mobile menu, reveal-on-scroll, header state and the ambient point field.
   Plain ES2017, no dependencies. Every block guards its own elements.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;

  /* --------------------------------------------------------------------
     1. Showcase modes: 01 sketch → 3D · 02 Web Viewer · 03 Live 3D
     -------------------------------------------------------------------- */
  var tabData = [
    { idx: "01", title: "Էսքիզը դառնում է պատրաստի պատկեր", text: "Քաշեք բաժանարարը՝ տեսնելու ձեռքի էսքիզի և պատրաստի 3D պատկերի տարբերությունը՝ նույն չափերով։", linkText: "Ինչպես է աշխատում", linkHref: "/process" },
    { idx: "02", title: "Պտտեք և փոխեք գույնը", text: "Այս հղումն է ստանում յուրաքանչյուր պատվիրատու. պտտեք, մոտեցրեք, ընտրեք ֆասադի գույնը, տեսեք Ձեր սենյակում։", linkText: "Բացել Web Viewer-ը", linkHref: "/configurator" },
    { idx: "03", title: "Քայլեք սենյակում իրական ժամանակում", text: "Կինեմատոգրաֆիկ ներկայացում սրահի էկրանի և կարևոր հանդիպումների համար. բացեք դռները, փոխեք նյութերը, նայեք ցանկացած անկյունից։", linkText: "Live 3D-ի մասին", linkHref: "/capabilities" }
  ];

  var dockBtns = [0, 1, 2].map(function (i) { return doc.getElementById("dock-btn-" + i); });
  var panels = [0, 1, 2].map(function (i) { return doc.getElementById("stage-panel-" + i); });
  var videoEl = doc.getElementById("stage-video");
  var mv = doc.getElementById("main-model-viewer");
  var liveIdx = doc.getElementById("live-cur-idx");
  var liveTitle = doc.getElementById("live-title");
  var liveText = doc.getElementById("live-text");
  var liveLink = doc.getElementById("live-link");
  var liveCard = doc.getElementById("live-desc-card");
  var stage = doc.getElementById("showcase-stage");
  var current = 0;
  var modelLoaded = false;

  function loadModelOnce() {
    if (modelLoaded || !mv) return;
    var src = mv.getAttribute("data-src");
    if (src) mv.setAttribute("src", src);
    modelLoaded = true;
  }

  function setTab(idx) {
    if (idx === current && panels[idx] && panels[idx].getAttribute("aria-hidden") === "false") return;
    current = idx;
    dockBtns.forEach(function (btn, i) {
      if (!btn) return;
      var on = i === idx;
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.setAttribute("tabindex", on ? "0" : "-1");
      btn.classList.toggle("is-active", on);
    });
    panels.forEach(function (panel, i) {
      if (!panel) return;
      var on = i === idx;
      panel.setAttribute("aria-hidden", on ? "false" : "true");
      panel.classList.toggle("opacity-100", on);
      panel.classList.toggle("opacity-0", !on);
      panel.classList.toggle("pointer-events-none", !on);
    });
    if (idx === 1) loadModelOnce();
    if (videoEl) {
      if (idx === 2) { var pr = videoEl.play(); if (pr && pr.catch) pr.catch(function () {}); }
      else videoEl.pause();
    }
    var d = tabData[idx];
    if (d && liveIdx && liveTitle && liveText && liveLink) {
      liveIdx.textContent = d.idx;
      liveTitle.textContent = d.title;
      liveText.textContent = d.text;
      var span = liveLink.querySelector("span");
      if (span) span.textContent = d.linkText; else liveLink.textContent = d.linkText;
      liveLink.setAttribute("href", d.linkHref);
      if (liveCard && !reduceMotion) {
        liveCard.classList.remove("hx-live");
        void liveCard.offsetWidth; // restart the entrance animation
        liveCard.classList.add("hx-live");
      }
    }
  }
  dockBtns.forEach(function (btn, i) {
    if (btn) btn.addEventListener("click", function () { setTab(i); });
  });
  if (stage) {
    stage.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); setTab((current + 1) % 3); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); setTab((current + 2) % 3); }
    });
  }

  /* --------------------------------------------------------------------
     2. Comparison slider (pointer + keyboard)
     -------------------------------------------------------------------- */
  var slider = doc.getElementById("ba-slider");
  var clip = doc.getElementById("ba-clip");
  var img = doc.getElementById("ba-img");
  var handle = doc.getElementById("ba-handle");
  if (slider && clip && img && handle) {
    var dragging = false;
    var setPos = function (pct) {
      pct = Math.max(2, Math.min(98, pct));
      clip.style.width = pct + "%";
      img.style.width = (10000 / pct) + "%";
      handle.style.left = pct + "%";
      slider.setAttribute("aria-valuenow", String(Math.round(pct)));
    };
    var fromEvent = function (clientX) {
      var r = slider.getBoundingClientRect();
      setPos(((clientX - r.left) / r.width) * 100);
    };
    slider.addEventListener("pointerdown", function (e) {
      dragging = true;
      try { slider.setPointerCapture(e.pointerId); } catch (err) {}
      fromEvent(e.clientX);
    });
    slider.addEventListener("pointermove", function (e) { if (dragging || e.buttons === 1) fromEvent(e.clientX); });
    slider.addEventListener("pointerup", function () { dragging = false; });
    slider.addEventListener("pointercancel", function () { dragging = false; });
    slider.addEventListener("keydown", function (e) {
      var cur = parseFloat(clip.style.width) || 55;
      if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); setPos(cur - 4); }
      else if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); setPos(cur + 4); }
    });
  }

  /* --------------------------------------------------------------------
     3. Web Viewer: reset, AR, material swatches (loaded only when opened)
     -------------------------------------------------------------------- */
  var resetBtn = doc.getElementById("mv-reset-btn");
  var arBtn = doc.getElementById("mv-ar-btn");
  var originalTexture = null;
  function targetMaterial() {
    if (!mv || !mv.model || !mv.model.materials) return null;
    return mv.model.materials[1] || mv.model.materials[0] || null;
  }
  if (mv) {
    mv.addEventListener("load", function () {
      try {
        var m = targetMaterial();
        if (m && m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorTexture) originalTexture = m.pbrMetallicRoughness.baseColorTexture.texture;
      } catch (err) {}
      if (arBtn) arBtn.disabled = !mv.canActivateAR;
    });
    if (arBtn) arBtn.disabled = true;
    if (resetBtn) resetBtn.addEventListener("click", function () { if (mv.resetTurntableRotation) mv.resetTurntableRotation(); });
    if (arBtn) arBtn.addEventListener("click", function () { if (mv.activateAR) mv.activateAR(); });
  }
  function hexToLinear(hex) {
    var n = parseInt(hex.replace("#", ""), 16);
    var lin = function (c) { var v = c / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255), 1];
  }
  var swatches = doc.querySelectorAll("#swatches-container .swatch-btn");
  Array.prototype.forEach.call(swatches, function (btn) {
    btn.addEventListener("click", function () {
      Array.prototype.forEach.call(swatches, function (b) { b.classList.remove("is-active"); b.setAttribute("aria-pressed", "false"); });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
      var color = btn.getAttribute("data-color");
      var m = targetMaterial();
      if (!m) return;
      try {
        var pbr = m.pbrMetallicRoughness;
        if (color === "wood") {
          if (originalTexture) pbr.baseColorTexture.setTexture(originalTexture);
          pbr.setBaseColorFactor([1, 1, 1, 1]);
          if (pbr.setRoughnessFactor) pbr.setRoughnessFactor(0.6);
        } else {
          pbr.baseColorTexture.setTexture(null);
          pbr.setBaseColorFactor(hexToLinear(color));
          if (pbr.setRoughnessFactor) pbr.setRoughnessFactor(0.45);
          if (pbr.setMetallicFactor) pbr.setMetallicFactor(0);
        }
      } catch (err) {}
    });
  });

  /* --------------------------------------------------------------------
     4. Fullscreen on the stage
     -------------------------------------------------------------------- */
  var fsBtn = doc.getElementById("fs-toggle-btn");
  var enterSvg = doc.getElementById("fs-enter-svg");
  var exitSvg = doc.getElementById("fs-exit-svg");
  if (fsBtn && stage) {
    if (!doc.fullscreenEnabled && !doc.webkitFullscreenEnabled) fsBtn.hidden = true;
    fsBtn.addEventListener("click", function () {
      if (doc.fullscreenElement) { doc.exitFullscreen().catch(function () {}); return; }
      if (stage.requestFullscreen) stage.requestFullscreen().catch(function () {});
      else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
    });
    doc.addEventListener("fullscreenchange", function () {
      var on = !!doc.fullscreenElement;
      if (enterSvg) enterSvg.classList.toggle("hidden", on);
      if (exitSvg) exitSvg.classList.toggle("hidden", !on);
      fsBtn.setAttribute("aria-label", on ? "Փակել լիաէկրանը" : "Լիաէկրան");
    });
  }

  /* --------------------------------------------------------------------
     5. Theme toggle with a short cross-fade
     -------------------------------------------------------------------- */
  var themeToggle = doc.getElementById("theme-toggle");
  function currentTheme() {
    var t = root.getAttribute("data-theme");
    if (t === "light" || t === "dark") return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.classList.add("theme-transition");
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
        doc.cookie = "theme=" + next + ";path=/;max-age=31536000;samesite=lax";
      } catch (err) {}
      window.setTimeout(function () { root.classList.remove("theme-transition"); }, 450);
    });
  }

  /* --------------------------------------------------------------------
     6. Mobile menu
     -------------------------------------------------------------------- */
  var menuBtn = doc.getElementById("mobile-menu-btn");
  var menu = doc.getElementById("mobile-menu");
  var l1 = doc.getElementById("burger-line-1"), l2 = doc.getElementById("burger-line-2"), l3 = doc.getElementById("burger-line-3");
  function setMenu(open) {
    if (!menu || !menuBtn) return;
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menu.setAttribute("aria-hidden", open ? "false" : "true");
    root.style.overflow = open ? "hidden" : "";
    if (l1) l1.style.transform = open ? "translateY(7px) rotate(45deg)" : "";
    if (l2) l2.style.opacity = open ? "0" : "";
    if (l3) l3.style.transform = open ? "translateY(-7px) rotate(-45deg)" : "";
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () { setMenu(menu.getAttribute("aria-hidden") !== "false"); });
    Array.prototype.forEach.call(menu.querySelectorAll("a"), function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    window.addEventListener("resize", function () { if (window.innerWidth >= 1024) setMenu(false); });
  }

  /* --------------------------------------------------------------------
     7. Header scrolled state + reveal on scroll
     -------------------------------------------------------------------- */
  var yearEl = doc.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var header = doc.getElementById("site-header");
  var onScroll = function () { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var revealEls = doc.querySelectorAll(".reveal, .reveal-stagger");
  if (revealEls.length) {
    if (!("IntersectionObserver" in window) || reduceMotion) {
      Array.prototype.forEach.call(revealEls, function (el) { el.classList.add("is-in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
      Array.prototype.forEach.call(revealEls, function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-in"); else io.observe(el);
      });
    }
  }

  /* --------------------------------------------------------------------
     8. Ambient point field — a quiet, theme-aware constellation.
        Fewer, smaller nodes; short connections; gentle cursor influence;
        pauses when the tab is hidden; static under reduced motion.
     -------------------------------------------------------------------- */
  (function pointField() {
    var canvas = doc.getElementById("tech-interactive-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var W = 0, H = 0, dpr = 1, pts = [], raf = 0, running = false;
    var mouse = { x: -9999, y: -9999, on: false };
    var maxDist = 110, mouseDist = 150;
    var colorCache = null, colorTheme = "";

    function palette() {
      var theme = currentTheme();
      if (colorCache && colorTheme === theme) return colorCache;
      var cs = getComputedStyle(root);
      colorTheme = theme;
      colorCache = {
        node: cs.getPropertyValue("--lp-node").trim() || "23, 21, 15",
        accent: cs.getPropertyValue("--lp-node-accent").trim() || "217, 73, 31",
        nodeA: parseFloat(cs.getPropertyValue("--lp-node-alpha")) || 0.28,
        lineA: parseFloat(cs.getPropertyValue("--lp-line-alpha")) || 0.07,
        mouseA: parseFloat(cs.getPropertyValue("--lp-mouse-alpha")) || 0.22
      };
      return colorCache;
    }

    function build() {
      pts = [];
      var area = W * H;
      var count = Math.round(area / 26000);
      count = Math.max(24, Math.min(finePointer ? 80 : 40, count));
      for (var i = 0; i < count; i++) {
        pts.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.1 + 0.9,
          accent: (i % 7 === 0),
          ph: Math.random() * Math.PI * 2
        });
      }
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (reduceMotion) draw(0);
    }
    var last = 0;
    function draw(t) {
      var p = palette();
      ctx.clearRect(0, 0, W, H);
      var n = pts.length;
      for (var i = 0; i < n; i++) {
        var a = pts[i];
        if (!reduceMotion) {
          a.x += a.vx; a.y += a.vy; a.ph += 0.012;
          if (a.x < -20) a.x = W + 20; else if (a.x > W + 20) a.x = -20;
          if (a.y < -20) a.y = H + 20; else if (a.y > H + 20) a.y = -20;
        }
        for (var j = i + 1; j < n; j++) {
          var b = pts[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          if (dx > maxDist || dx < -maxDist || dy > maxDist || dy < -maxDist) continue;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxDist) {
            var f = 1 - d / maxDist;
            ctx.strokeStyle = "rgba(" + p.node + "," + (f * f * p.lineA).toFixed(3) + ")";
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        if (mouse.on) {
          var mx = a.x - mouse.x, my = a.y - mouse.y;
          var md = Math.sqrt(mx * mx + my * my);
          if (md < mouseDist && md > 0.001) {
            var mf = 1 - md / mouseDist;
            a.x -= (mx / md) * mf * 0.25; a.y -= (my / md) * mf * 0.25;
            ctx.strokeStyle = "rgba(" + p.accent + "," + (mf * p.mouseA).toFixed(3) + ")";
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
        var rr = a.r + (reduceMotion ? 0 : Math.sin(a.ph) * 0.25);
        ctx.fillStyle = a.accent ? "rgba(" + p.accent + "," + (p.nodeA + 0.1).toFixed(3) + ")" : "rgba(" + p.node + "," + p.nodeA.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(a.x, a.y, rr, 0, Math.PI * 2); ctx.fill();
      }
    }
    function loop(t) {
      if (!running) return;
      // ~40 fps is plenty for a background; halves the work on laptops and phones
      if (t - last > 24) { draw(t); last = t; }
      raf = requestAnimationFrame(loop);
    }
    function start() { if (running || reduceMotion) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    window.addEventListener("resize", resize, { passive: true });
    if (finePointer) {
      window.addEventListener("pointermove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; }, { passive: true });
      doc.addEventListener("pointerleave", function () { mouse.on = false; mouse.x = -9999; mouse.y = -9999; });
    }
    doc.addEventListener("visibilitychange", function () { if (doc.hidden) stop(); else start(); });
    if (themeToggle) themeToggle.addEventListener("click", function () { colorCache = null; if (reduceMotion) draw(0); });
    resize();
    start();
  })();
})();
