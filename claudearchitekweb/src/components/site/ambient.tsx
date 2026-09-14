"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient layer behind the public site: the survey mesh.
 * A field of measurement points drifts slowly across the viewport and connects to its neighbours with
 * hairlines that form and dissolve as distances change; a few points are drawn as small accent cross
 * marks (survey stations). Under the canvas the CSS adds a drafting grid (fine lines on paper in light,
 * a dot grid on graphite in dark) and, in dark only, one still warm light from the top.
 *
 * Cursor: each point has a base position (the drift) and a displacement. A fine pointer pulls nearby
 * points a little towards it; the displacement is a damped spring, so when the cursor moves on or leaves
 * the points ease back to their drift instead of snapping. Connections are computed on the displaced
 * positions, so the mesh visibly reacts to the disturbance.
 *
 * Motion is time-based, paused when the tab is hidden and thinner on phones. Under
 * `prefers-reduced-motion` the drift runs at a third of the speed and the cursor has no effect.
 * Colours and alphas come from the `--field-*` tokens in globals.css.
 */
type Node = { bx: number; by: number; vx: number; vy: number; ox: number; oy: number; z: number; r: number; mark: boolean; x: number; y: number };
type Palette = { node: string; accent: string; nodeA: number; lineA: number; mouseA: number };

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => (cs.getPropertyValue(name).trim() || fallback).replace(/\s+/g, "");
  const n = (name: string, fallback: number) => {
    const x = parseFloat(cs.getPropertyValue(name));
    return Number.isFinite(x) ? x : fallback;
  };
  return {
    node: v("--field-node", "23,21,15"),
    accent: v("--field-accent", "217,73,31"),
    nodeA: n("--field-node-a", 0.5),
    lineA: n("--field-line-a", 0.16),
    mouseA: n("--field-mouse-a", 0.3),
  };
}

export function Ambient() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;

    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pal = readPalette();
    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    let raf = 0;
    let last = 0;
    // pointer: target and eased position (the eased one drives the field, so quick moves stay smooth)
    let tx = -9999;
    let ty = -9999;
    let mx = -9999;
    let my = -9999;
    let mouseOn = false;
    const MAX_D = 140; // neighbour link distance
    const MOUSE_D = 170; // radius of the cursor's influence
    const PULL = 22; // maximum displacement towards the cursor, px

    const seed = () => {
      const area = w * h;
      const phone = w < 700;
      const count = phone ? Math.round(Math.min(36, Math.max(18, area / 17000))) : Math.round(Math.min(110, Math.max(44, area / 19000)));
      nodes = Array.from({ length: count }, (_, i) => {
        const z = 0.35 + Math.random() * 0.65;
        const a = Math.random() * Math.PI * 2;
        const s = (0.12 + Math.random() * 0.2) * z;
        const x = Math.random() * w;
        const y = Math.random() * h;
        return { bx: x, by: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, ox: 0, oy: 0, z, r: 0.8 + z * 1.3, mark: i % 12 === 5, x, y };
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, w, h);
      const n = nodes.length;
      const slow = reduced.matches;
      const k = slow ? 0.35 : 1;
      const cursor = mouseOn && !slow;
      // the eased pointer follows the real one (about 120 ms behind)
      if (cursor) {
        mx += (tx - mx) * Math.min(1, 0.14 * dt);
        my += (ty - my) * Math.min(1, 0.14 * dt);
      }
      // drift + spring displacement
      const relax = Math.min(1, 0.055 * dt);
      for (let i = 0; i < n; i++) {
        const p = nodes[i];
        p.bx += p.vx * dt * k;
        p.by += p.vy * dt * k;
        if (p.bx < -24) p.bx = w + 24;
        else if (p.bx > w + 24) p.bx = -24;
        if (p.by < -24) p.by = h + 24;
        else if (p.by > h + 24) p.by = -24;
        let gx = 0;
        let gy = 0;
        if (cursor) {
          const dx = mx - p.bx;
          const dy = my - p.by;
          const d = Math.hypot(dx, dy);
          if (d < MOUSE_D && d > 1) {
            const f = 1 - d / MOUSE_D;
            const pull = PULL * f * f * (0.5 + 0.5 * p.z); // nearer, deeper points move most
            gx = (dx / d) * pull;
            gy = (dy / d) * pull;
          }
        }
        // ease the displacement towards its goal (0 when the cursor is away)
        p.ox += (gx - p.ox) * relax;
        p.oy += (gy - p.oy) * relax;
        p.x = p.bx + p.ox;
        p.y = p.by + p.oy;
      }
      // hairlines between neighbours (on displaced positions, so links react to the disturbance)
      ctx.lineCap = "round";
      for (let i = 0; i < n; i++) {
        const p = nodes[i];
        for (let j = i + 1; j < n; j++) {
          const q = nodes[j];
          const dx = p.x - q.x;
          if (dx > MAX_D || dx < -MAX_D) continue;
          const dy = p.y - q.y;
          if (dy > MAX_D || dy < -MAX_D) continue;
          const d = Math.hypot(dx, dy);
          if (d >= MAX_D) continue;
          const f = 1 - d / MAX_D;
          const a = f * f * pal.lineA * Math.min(p.z, q.z) * 1.5;
          ctx.strokeStyle = `rgba(${pal.node},${a.toFixed(3)})`;
          ctx.lineWidth = 0.5 + f * 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
        // a faint thread from disturbed points to the cursor, in the same ink/paper colour
        if (cursor) {
          const d = Math.hypot(p.x - mx, p.y - my);
          if (d < MOUSE_D * 0.8) {
            const f = 1 - d / (MOUSE_D * 0.8);
            ctx.strokeStyle = `rgba(${pal.node},${(f * f * pal.mouseA * p.z).toFixed(3)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mx, my);
            ctx.stroke();
          }
        }
      }
      // points: ink/paper dots; survey stations as small accent cross marks
      for (let i = 0; i < n; i++) {
        const p = nodes[i];
        const a = pal.nodeA * (0.45 + 0.55 * p.z);
        if (p.mark) {
          const s = 2.4 + p.z * 1.4;
          ctx.strokeStyle = `rgba(${pal.accent},${Math.min(1, a * 0.95).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x - s, p.y);
          ctx.lineTo(p.x + s, p.y);
          ctx.moveTo(p.x, p.y - s);
          ctx.lineTo(p.x, p.y + s);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${pal.node},${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(3, (t - last) / 16.667) : 1;
      last = t;
      draw(dt);
    };
    const start = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!mouseOn) {
        mx = tx;
        my = ty;
        mouseOn = true;
      }
    };
    const onLeave = () => {
      mouseOn = false; // displacements relax back on their own
    };
    const onTheme = () => {
      pal = readPalette();
    };
    const themeObs = new MutationObserver(onTheme);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    let rs = 0;
    const onResize = () => {
      clearTimeout(rs);
      rs = window.setTimeout(resize, 120);
    };

    resize();
    start();
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    scheme.addEventListener("change", onTheme);
    if (fine) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      window.addEventListener("blur", onLeave);
    }
    return () => {
      stop();
      clearTimeout(rs);
      themeObs.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      scheme.removeEventListener("change", onTheme);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  return (
    <div className="ambient" aria-hidden>
      <div className="ambient-grid" />
      <div className="ambient-light" />
      <canvas ref={ref} className="ambient-field" />
    </div>
  );
}
