"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient layer behind the public site: the survey mesh.
 * A field of measurement points drifts slowly across the viewport and connects to its neighbours with
 * hairlines; a few points are drawn as small accent cross marks (survey stations). On a fine pointer the
 * nearby points lean towards the cursor and link to it. Under the canvas the CSS adds a drafting grid
 * (fine lines on paper in light, a dot grid on graphite in dark) and, in dark only, one still warm light
 * from the top. Colours and alphas come from the `--field-*` tokens in globals.css.
 *
 * Motion is time-based (same speed at any refresh rate), paused when the tab is hidden and thinner on
 * phones. Under `prefers-reduced-motion` the field keeps a very slow drift (about a third of the speed)
 * with no cursor pull: the points are tiny and the motion is far below anything vestibular, and a frozen
 * field reads as a rendering bug rather than a courtesy.
 */
type Node = { x: number; y: number; vx: number; vy: number; z: number; r: number; mark: boolean };
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
    mouseA: n("--field-mouse-a", 0.35),
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
    let mx = -9999;
    let my = -9999;
    let mouseOn = false;
    const MAX_D = 140;
    const MOUSE_D = 190;
    const speedScale = () => (reduced.matches ? 0.35 : 1);

    const seed = () => {
      const area = w * h;
      const phone = w < 700;
      const count = phone ? Math.round(Math.min(44, Math.max(22, area / 14500))) : Math.round(Math.min(116, Math.max(48, area / 18000)));
      nodes = Array.from({ length: count }, (_, i) => {
        const z = 0.35 + Math.random() * 0.65;
        const a = Math.random() * Math.PI * 2;
        const s = (0.14 + Math.random() * 0.22) * z;
        return { x: Math.random() * w, y: Math.random() * h, vx: Math.cos(a) * s, vy: Math.sin(a) * s, z, r: 0.8 + z * 1.3, mark: i % 9 === 4 };
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
      const k = speedScale();
      for (let i = 0; i < n; i++) {
        const p = nodes[i];
        p.x += p.vx * dt * k;
        p.y += p.vy * dt * k;
        if (p.x < -24) p.x = w + 24;
        else if (p.x > w + 24) p.x = -24;
        if (p.y < -24) p.y = h + 24;
        else if (p.y > h + 24) p.y = -24;
        if (mouseOn && k === 1) {
          const dx = mx - p.x;
          const dy = my - p.y;
          const d = Math.hypot(dx, dy);
          if (d < MOUSE_D && d > 1) {
            const f = (1 - d / MOUSE_D) * 0.42 * p.z * dt;
            p.x += (dx / d) * f;
            p.y += (dy / d) * f;
          }
        }
      }
      // hairlines between neighbours, and to the cursor
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
        if (mouseOn && k === 1) {
          const d = Math.hypot(p.x - mx, p.y - my);
          if (d < MOUSE_D) {
            const f = 1 - d / MOUSE_D;
            // cursor links stay in the ink/paper colour: the accent is reserved for the survey marks
            ctx.strokeStyle = `rgba(${pal.node},${(f * f * pal.mouseA * p.z).toFixed(3)})`;
            ctx.lineWidth = 0.5 + f * 0.5;
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
          const s = 2.6 + p.z * 1.6;
          ctx.strokeStyle = `rgba(${pal.accent},${Math.min(1, a * 1.1).toFixed(3)})`;
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
    const still = () => {
      if (!raf) draw(0);
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const onMotion = () => {
      if (reduced.matches) onLeave();
    };
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      mouseOn = true;
    };
    const onLeave = () => {
      mouseOn = false;
      mx = my = -9999;
    };
    const onTheme = () => {
      pal = readPalette();
      still();
    };
    const themeObs = new MutationObserver(onTheme);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    let rs = 0;
    const onResize = () => {
      clearTimeout(rs);
      rs = window.setTimeout(() => {
        resize();
        still();
      }, 120);
    };

    resize();
    start();
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onMotion);
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
      reduced.removeEventListener("change", onMotion);
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
