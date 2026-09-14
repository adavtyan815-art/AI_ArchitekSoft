"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient layer behind the public site: a living field of connected points (drawn on a canvas),
 * two slow atmospheric glows and a faint drafting grid. Colours come from CSS tokens
 * (`--field-*` in globals.css) so light and dark are tuned separately.
 *
 * Behaviour
 * - Points drift slowly with depth (nearer points are larger, faster and brighter) and connect
 *   to neighbours with hairlines; on a fine pointer they lean gently towards the cursor and link to it.
 * - Time-based motion (the same speed at any refresh rate), paused when the tab is hidden,
 *   fewer points on phones, a single still frame under `prefers-reduced-motion`.
 * - The same pointer listener feeds `--mx/--my` to `.spot` surfaces for the spotlight border.
 */
type Node = { x: number; y: number; vx: number; vy: number; z: number; r: number; ph: number; acc: boolean };
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
    let dpr = 1;
    let nodes: Node[] = [];
    let raf = 0;
    let last = 0;
    let mx = -9999;
    let my = -9999;
    let mouseOn = false;
    const MAX_D = 132;
    const MOUSE_D = 190;

    const seed = () => {
      const area = w * h;
      const phone = w < 700;
      const count = phone ? Math.round(Math.min(46, Math.max(22, area / 14000))) : Math.round(Math.min(120, Math.max(48, area / 17500)));
      nodes = Array.from({ length: count }, (_, i) => {
        const z = 0.35 + Math.random() * 0.65;
        const a = Math.random() * Math.PI * 2;
        const s = (0.12 + Math.random() * 0.22) * z;
        return { x: Math.random() * w, y: Math.random() * h, vx: Math.cos(a) * s, vy: Math.sin(a) * s, z, r: 0.9 + z * 1.5, ph: Math.random() * Math.PI * 2, acc: i % 6 === 0 };
      });
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 2);
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
      // motion
      for (let i = 0; i < n; i++) {
        const p = nodes[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.ph += 0.018 * dt;
        if (p.x < -24) p.x = w + 24;
        else if (p.x > w + 24) p.x = -24;
        if (p.y < -24) p.y = h + 24;
        else if (p.y > h + 24) p.y = -24;
        if (mouseOn) {
          const dx = mx - p.x;
          const dy = my - p.y;
          const d = Math.hypot(dx, dy);
          if (d < MOUSE_D && d > 1) {
            const f = (1 - d / MOUSE_D) * 0.55 * p.z * dt;
            p.x += (dx / d) * f;
            p.y += (dy / d) * f;
          }
        }
      }
      // links
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
          const a = f * f * pal.lineA * Math.min(p.z, q.z) * 1.4;
          ctx.strokeStyle = `rgba(${pal.node},${a.toFixed(3)})`;
          ctx.lineWidth = 0.5 + f * 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
        if (mouseOn) {
          const d = Math.hypot(p.x - mx, p.y - my);
          if (d < MOUSE_D) {
            const f = 1 - d / MOUSE_D;
            ctx.strokeStyle = `rgba(${pal.accent},${(f * pal.mouseA * p.z).toFixed(3)})`;
            ctx.lineWidth = 0.6 + f * 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mx, my);
            ctx.stroke();
          }
        }
      }
      // points
      for (let i = 0; i < n; i++) {
        const p = nodes[i];
        const r = p.r + Math.sin(p.ph) * 0.35;
        const a = pal.nodeA * (0.45 + 0.55 * p.z);
        if (p.acc) {
          ctx.fillStyle = `rgba(${pal.accent},${(a * 0.22).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(${pal.accent},${Math.min(1, a * 1.15).toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(${pal.node},${a.toFixed(3)})`;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(3, (t - last) / 16.667) : 1;
      last = t;
      draw(dt);
    };
    const start = () => {
      if (raf || reduced.matches) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const onMotion = () => {
      if (reduced.matches) {
        stop();
        draw(0);
      } else start();
    };

    // Spotlight border on `.spot` surfaces + cursor link for the field (fine pointers only).
    let spots: HTMLElement[] = [];
    let spotsAt = 0;
    let pending = false;
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      mouseOn = true;
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        const now = performance.now();
        if (now - spotsAt > 1500) {
          spots = Array.from(document.querySelectorAll<HTMLElement>(".spot"));
          spotsAt = now;
        }
        for (const el of spots) {
          const r = el.getBoundingClientRect();
          if (mx > r.left - 160 && mx < r.right + 160 && my > r.top - 160 && my < r.bottom + 160) {
            el.style.setProperty("--mx", `${mx - r.left}px`);
            el.style.setProperty("--my", `${my - r.top}px`);
          }
        }
      });
    };
    const onLeave = () => {
      mouseOn = false;
      mx = my = -9999;
    };

    const themeObs = new MutationObserver(() => {
      pal = readPalette();
      if (reduced.matches) draw(0);
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      pal = readPalette();
      if (reduced.matches) draw(0);
    };

    let rs = 0;
    const onResize = () => {
      clearTimeout(rs);
      rs = window.setTimeout(() => {
        resize();
        if (reduced.matches) draw(0);
      }, 120);
    };

    resize();
    if (reduced.matches) draw(0);
    else start();
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onMotion);
    scheme.addEventListener("change", onScheme);
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
      scheme.removeEventListener("change", onScheme);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  return (
    <div className="ambient" aria-hidden>
      <canvas ref={ref} className="ambient-field" />
      <div className="ambient-grid" />
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
    </div>
  );
}
