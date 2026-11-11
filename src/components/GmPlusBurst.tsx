"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const DURATION_MS = 5000;
const PARTICLES = 150;
const ROCKETS = 6;
const USDC_BLUE = "#2775ca";
const CONFETTI = ["#c278ff", "#ff7ad9", "#7fd4ff", "#ffffff", "#8a3dff"];

/** Official Arc icon (arc.io), 31x32 viewBox. */
const ARC_ICON_PATH =
  "M0 32C0.260374 24.166 1.59328 16.8547 3.82135 11.1696C6.64316 3.96673 10.728 0 15.3227 0C19.9174 0 24.0016 3.96673 26.824 11.1696C28.292 14.9157 29.372 19.3668 30.0119 24.2089C30.0691 24.6414 30.1178 25.0809 30.1678 25.5195C30.184 25.5466 30.1938 25.5718 30.1905 25.5923C30.1905 25.5923 30.5666 27.9326 30.6465 32H30.604C30.0462 31.5439 23.4681 26.3931 12.5636 27.8845C12.7282 26.0457 12.9544 24.2565 13.2467 22.5415C13.2617 22.4538 13.2789 22.3692 13.2942 22.2821C17.5711 22.1536 21.3146 22.6486 24.1853 23.2972C24.1746 23.2293 24.1657 23.1594 24.1547 23.0918C23.5647 19.4302 22.6941 16.0779 21.5717 13.2131C19.7364 8.52888 17.3416 5.61852 15.3227 5.61852C13.3038 5.61852 10.909 8.52888 9.07379 13.2131C8.62954 14.3462 8.22512 15.5545 7.86244 16.8291C7.35258 18.615 6.92424 20.5296 6.58214 22.5413C6.0758 25.5124 5.75944 28.6987 5.64292 32H0Z";
let arcIcon: Path2D | null = null;

type Particle = {
  /** ms after start before this particle appears (spreads the show over 5s). */
  delay: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  kind: "coin" | "confetti" | "star";
  flip: number;
  vflip: number;
};

type Rocket = {
  /** Previous position, used to point the rocket along its motion. */
  px: number;
  py: number;
  delay: number;
  scale: number;
  /** Orbit around (cx, cy) with radii (rx, ry); omega < 0 turns the other way. */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  omega: number;
  phase: number;
  /** Entry point below the screen the rocket rises from. */
  sx: number;
};

type Spark = { x: number; y: number; vx: number; vy: number; life: number };

function makeParticle(w: number, h: number, i: number): Particle {
  const roll = Math.random();
  const kind: Particle["kind"] =
    roll < 0.45 ? "coin" : roll < 0.9 ? "confetti" : "star";
  const fromBurst = i < PARTICLES * 0.6;
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
  const speed = 9 + Math.random() * 11;
  return {
    delay: fromBurst ? Math.random() * 500 : 300 + Math.random() * 3200,
    x: fromBurst ? w / 2 + (Math.random() - 0.5) * w * 0.25 : Math.random() * w,
    y: fromBurst ? h * 0.62 : -20 - Math.random() * h * 0.4,
    vx: fromBurst ? Math.cos(angle) * speed : (Math.random() - 0.5) * 2,
    vy: fromBurst ? Math.sin(angle) * speed : 2 + Math.random() * 3,
    size: kind === "coin" ? 11 + Math.random() * 7 : 5 + Math.random() * 7,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
    color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
    kind,
    flip: Math.random() * Math.PI * 2,
    vflip: 0.1 + Math.random() * 0.16,
  };
}

function makeRocket(w: number, h: number, i: number): Rocket {
  const maxRx = Math.max(60, Math.min(w * 0.32, w / 2 - 60));
  const rx = maxRx * (0.55 + Math.random() * 0.45);
  const ry = h * (0.14 + Math.random() * 0.16);
  const cx = w / 2 + (Math.random() - 0.5) * Math.max(0, w / 2 - rx - 60);
  const cy = h * 0.48 + (Math.random() - 0.5) * h * 0.14;
  // About 1.6 to 2.4 laps over the 5s show; alternate directions.
  const lapsPerSecond = (0.32 + Math.random() * 0.16) * (i % 2 === 0 ? 1 : -1);
  const phase = Math.random() * Math.PI * 2;
  return {
    px: cx + rx * Math.cos(phase),
    py: h + 90,
    delay: 80 + i * 150,
    scale: 0.85 + Math.random() * 0.45,
    cx,
    cy,
    rx,
    ry,
    omega: (Math.PI * 2 * lapsPerSecond) / 1000,
    phase,
    sx: cx + rx * Math.cos(phase),
  };
}

function drawStar(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.4;
    const a = (Math.PI / 4) * i;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

/** USDC-style coin: blue disc, white ring and dollar sign. */
function drawUsdcCoin(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = USDC_BLUE;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${Math.round(r * 1.15)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", 0, r * 0.05);
}

/** Rocket pointing up (-y) with the Arc icon on a porthole. */
function drawRocket(ctx: CanvasRenderingContext2D, flame: number) {
  // Exhaust flame.
  const flameLen = 20 + flame * 16;
  const fg = ctx.createLinearGradient(0, 20, 0, 20 + flameLen);
  fg.addColorStop(0, "#fff7b0");
  fg.addColorStop(0.45, "#ffb21e");
  fg.addColorStop(1, "rgba(255,90,40,0)");
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(-7, 20);
  ctx.quadraticCurveTo(0, 20 + flameLen * 1.2, 7, 20);
  ctx.closePath();
  ctx.fill();

  // Fins.
  ctx.fillStyle = "#8a3dff";
  ctx.beginPath();
  ctx.moveTo(-11, 4);
  ctx.lineTo(-22, 26);
  ctx.lineTo(-10, 20);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(11, 4);
  ctx.lineTo(22, 26);
  ctx.lineTo(10, 20);
  ctx.closePath();
  ctx.fill();

  // Body.
  const bg = ctx.createLinearGradient(-13, 0, 13, 0);
  bg.addColorStop(0, "#dfe6ff");
  bg.addColorStop(0.5, "#ffffff");
  bg.addColorStop(1, "#b9c4ee");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(0, -36);
  ctx.bezierCurveTo(14, -24, 14, -2, 12, 22);
  ctx.lineTo(-12, 22);
  ctx.bezierCurveTo(-14, -2, -14, -24, 0, -36);
  ctx.closePath();
  ctx.fill();

  // Nose cone.
  ctx.fillStyle = "#ff4fb8";
  ctx.beginPath();
  ctx.moveTo(0, -36);
  ctx.bezierCurveTo(7, -30, 10, -24, 10.5, -19);
  ctx.lineTo(-10.5, -19);
  ctx.bezierCurveTo(-10, -24, -7, -30, 0, -36);
  ctx.closePath();
  ctx.fill();

  // Porthole with the Arc icon.
  ctx.fillStyle = "#12062b";
  ctx.beginPath();
  ctx.arc(0, -3, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#c278ff";
  ctx.stroke();
  ctx.save();
  const s = 0.3;
  ctx.translate(-15.5 * s, -3 - 16 * s);
  ctx.scale(s, s);
  ctx.fillStyle = "#ffffff";
  arcIcon ??= new Path2D(ARC_ICON_PATH);
  ctx.fill(arcIcon);
  ctx.restore();
}

type Props = { onDone?: () => void };

/**
 * Celebration for a confirmed GM+: Arc rockets fly up, USDC coins and
 * confetti burst, and a soft glow pulses. Purely visual, ignores pointer
 * events, and is skipped when the user asks for reduced motion.
 */
export function GmPlusBurst({ onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDone?.();
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.scale(dpr, dpr);

    const particles = Array.from({ length: PARTICLES }, (_, i) =>
      makeParticle(w, h, i),
    );
    const rockets = Array.from({ length: ROCKETS }, (_, i) =>
      makeRocket(w, h, i),
    );
    const sparks: Spark[] = [];
    const start = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, w, h);
      const fade = t > DURATION_MS - 700 ? Math.max(0, (DURATION_MS - t) / 700) : 1;

      for (const p of particles) {
        if (t < p.delay || p.y > h + 60) continue;
        p.vy += 0.28;
        p.vx *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.flip += p.vflip;

        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        if (p.kind === "coin") {
          // Spinning coin: squash horizontally as it flips.
          ctx.scale(Math.abs(Math.cos(p.flip)) * 0.85 + 0.15, 1);
          drawUsdcCoin(ctx, p.size);
        } else if (p.kind === "star") {
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          drawStar(ctx, p.size);
        } else {
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.scale(1, Math.abs(Math.cos(p.flip)) * 0.9 + 0.1);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }

      // Spark trail behind rockets.
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.035;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = s.life * fade;
        ctx.fillStyle = s.life > 0.5 ? "#ffd45e" : "#ff7ad9";
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.2 * s.life + 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const r of rockets) {
        if (t < r.delay) continue;
        const local = t - r.delay;
        // Orbit around the screen; the first 900ms blend in from below.
        const theta = r.phase + r.omega * local;
        const ox = r.cx + r.rx * Math.cos(theta);
        const oy = r.cy + r.ry * Math.sin(theta);
        const k = Math.min(1, local / 900);
        const ease = 1 - (1 - k) * (1 - k);
        const x = r.sx + (ox - r.sx) * ease;
        const y = h + 90 + (oy - (h + 90)) * ease;
        const dx = x - r.px;
        const dy = y - r.py;
        r.px = x;
        r.py = y;
        const heading = Math.atan2(dx, -dy);

        if (sparks.length < 260) {
          // Exhaust leaves from the tail, opposite the heading.
          sparks.push({
            x: x - Math.sin(heading) * 26 * r.scale + (Math.random() - 0.5) * 5,
            y: y + Math.cos(heading) * 26 * r.scale + (Math.random() - 0.5) * 5,
            vx: -Math.sin(heading) * 0.8 + (Math.random() - 0.5) * 1,
            vy: Math.cos(heading) * 0.8 + (Math.random() - 0.5) * 1,
            life: 1,
          });
        }

        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(x, y);
        ctx.rotate(heading);
        ctx.scale(r.scale, r.scale);
        drawRocket(ctx, 0.5 + 0.5 * Math.sin(t / 45 + r.phase));
        ctx.restore();
      }

      if (t < DURATION_MS) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w, h);
        onDone?.();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // Runs once per mount; the parent remounts it (key) for each GM+.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Portal to <body>: the console card has a backdrop filter, which would
  // otherwise trap `position: fixed` inside the card.
  return createPortal(
    <>
      <div className="gm-burst-glow" aria-hidden />
      <canvas ref={canvasRef} className="gm-burst-canvas" aria-hidden />
    </>,
    document.body,
  );
}
