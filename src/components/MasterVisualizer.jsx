import React, { useEffect, useRef } from "react";

const N_PARTICLES = 130;

function getDecade() {
  return document.documentElement.dataset.decade ?? "";
}

function makeParticles(w, h, decade) {
  return Array.from({ length: N_PARTICLES }, () => {
    let hue;
    if (decade === "80s") {
      hue = Math.random() > 0.15 ? 28 + Math.random() * 22 : 5 + Math.random() * 10;
    } else if (decade === "90s-2000s") {
      hue = Math.random() > 0.18 ? 88 + Math.random() * 8 : 185 + Math.random() * 10;
    } else {
      const useAmber = Math.random() > 0.35;
      hue = useAmber ? 28 + Math.random() * 20 : 155 + Math.random() * 20;
    }
    return {
      x:   Math.random() * w,
      y:   Math.random() * h,
      vx:  (Math.random() - 0.5) * 0.35,
      vy:  (Math.random() - 0.5) * 0.35,
      r:   Math.random() * 1.6 + 0.4,
      hue,
    };
  });
}

// Peak hold state for the spectrum analyzer
const peakHold  = [];
const PEAK_HOLD = 36; // frames to hold peak
const peakTimer = [];

export default function MasterVisualizer({ analyser }) {
  const canvasRef   = useRef(null);
  const particleRef = useRef([]);
  const animRef     = useRef(null);
  const dimRef      = useRef({ w: 1200, h: 160 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;

    const ro = new ResizeObserver(([entry]) => {
      const w      = entry.contentRect.width;
      const h      = entry.contentRect.height;
      const decade = getDecade();
      dimRef.current = { w, h };
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      particleRef.current = makeParticles(w, h, decade);
    });
    ro.observe(canvas);

    const rect   = canvas.getBoundingClientRect();
    const decade = getDecade();
    dimRef.current = { w: rect.width, h: rect.height };
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    particleRef.current = makeParticles(rect.width, rect.height, decade);

    const timeData = new Uint8Array(2048);
    const freqData = new Uint8Array(2048);
    let time = 0;

    function draw() {
      animRef.current = requestAnimationFrame(draw);
      time += 0.016;

      const ctx    = canvas.getContext("2d");
      const { w, h } = dimRef.current;
      const decade = getDecade();
      const is80s   = decade === "80s";
      const is90s   = decade === "90s-2000s";
      const is2000s = decade === "2010s";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // ── 2000s: spectrum analyzer ────────────────────────────────────
      if (is2000s) {
        draw2000s(ctx, w, h, time, analyser, freqData, timeData);
        return;
      }

      // ── Particle / waveform for 80s / 90s / default ─────────────────
      let amp = 0;
      let hasAudio = false;
      if (analyser) {
        analyser.getByteTimeDomainData(timeData);
        hasAudio = true;
        for (let i = 0; i < timeData.length; i++) amp += Math.abs(timeData[i] - 128);
        amp = Math.min(1, (amp / timeData.length / 128) * 8);
      }

      if (is80s) {
        ctx.fillStyle = `rgba(8, 6, 4, ${hasAudio && amp > 0.02 ? 0.09 : 0.16})`;
      } else if (is90s) {
        ctx.fillStyle = `rgba(4, 8, 20, ${hasAudio && amp > 0.02 ? 0.07 : 0.13})`;
      } else {
        ctx.fillStyle = `rgba(8, 3, 6, ${hasAudio && amp > 0.02 ? 0.1 : 0.18})`;
      }
      ctx.fillRect(0, 0, w, h);

      // Particles
      for (const p of particleRef.current) {
        p.x += p.vx + (Math.random() - 0.5) * amp * 3.5;
        p.y += p.vy + (Math.random() - 0.5) * amp * 2;
        if (p.x < 0) p.x = w; else if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; else if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + amp * 2.2, 0, Math.PI * 2);
        const sat = (is80s || is90s) ? "100%" : "80%";
        const lit = is90s ? "65%" : "60%";
        ctx.fillStyle = `hsla(${p.hue}, ${sat}, ${lit}, ${0.22 + amp * 0.5})`;
        ctx.fill();
      }

      // Concentric rings
      const cx = w / 2;
      const cy = h / 2;
      for (let i = 0; i < 5; i++) {
        const base  = 14 + i * 20;
        const pulse = Math.sin(time * 1.4 + i * 0.9) * 4;
        const ring  = base + amp * 55 + pulse;
        const alpha = Math.max(0, (0.38 - i * 0.065) * (0.3 + amp * 0.9));
        ctx.beginPath();
        ctx.arc(cx, cy, ring, 0, Math.PI * 2);
        if (is80s) {
          ctx.strokeStyle = i % 2 === 0
            ? `rgba(200, 160, 80, ${alpha})`
            : `rgba(200, 60, 0, ${alpha * 0.6})`;
        } else if (is90s) {
          ctx.strokeStyle = i % 2 === 0
            ? `rgba(170, 255, 0, ${alpha})`
            : `rgba(0, 212, 255, ${alpha * 0.6})`;
        } else {
          ctx.strokeStyle = i % 2 === 0
            ? `rgba(232, 160, 48, ${alpha})`
            : `rgba(0, 200, 150, ${alpha * 0.6})`;
        }
        ctx.lineWidth = 1 + amp * 2.5;
        ctx.stroke();
      }

      // Waveform
      const waveColor = is80s ? "#d4a050" : is90s ? "#aaff00" : "#e8a030";
      ctx.beginPath();
      ctx.strokeStyle = waveColor;
      ctx.lineWidth   = 1.5 + amp * 2;
      ctx.shadowColor = waveColor;
      ctx.shadowBlur  = 8 + amp * 28;
      if (hasAudio) {
        const step = w / timeData.length;
        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128 - 1;
          const x = i * step;
          const y = cy + v * (h / 2 - 14);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
      } else {
        for (let x = 0; x <= w; x += 2) {
          const y = cy + Math.sin(x * 0.014 + time * 2.1) * 6
                       * (0.3 + Math.sin(time * 0.65) * 0.2);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      className="master-visualizer"
    />
  );
}

/* ── 2000s spectrum analyzer rendering ────────────────────────────────── */
function draw2000s(ctx, w, h, time, analyser, freqData, timeData) {
  // Flat dark background
  ctx.fillStyle = "#0e0e0e";
  ctx.fillRect(0, 0, w, h);

  // Subtle horizontal grid
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 1;
  const gridLines = 6;
  for (let i = 1; i < gridLines; i++) {
    const y = Math.round((h / gridLines) * i) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // dB labels on right edge
  const dbLabels = ["-6", "-12", "-18", "-24", "-36"];
  ctx.font = "10px Consolas, monospace";
  ctx.fillStyle = "#3a3a3a";
  ctx.textAlign = "right";
  for (let i = 0; i < dbLabels.length; i++) {
    const y = Math.round((h / gridLines) * (i + 1));
    ctx.fillText(dbLabels[i], w - 4, y - 2);
  }

  // Collect frequency data
  const N_BARS  = 72;
  const barArea = w - 6;
  const barW    = barArea / N_BARS;
  let hasAudio  = false;

  if (analyser) {
    try {
      analyser.getByteFrequencyData(freqData);
      hasAudio = true;
    } catch (_) {}
  }

  for (let i = 0; i < N_BARS; i++) {
    let val;
    if (hasAudio) {
      // Map bar index logarithmically across frequency bins
      const binStart = Math.floor(Math.pow(i / N_BARS, 1.5) * (freqData.length * 0.65));
      const binEnd   = Math.floor(Math.pow((i + 1) / N_BARS, 1.5) * (freqData.length * 0.65));
      let   sum = 0;
      const count = Math.max(1, binEnd - binStart);
      for (let b = binStart; b < binEnd; b++) sum += freqData[b];
      val = (sum / count) / 255;
    } else {
      // Idle animation: low undulating bars
      val = Math.max(0.02,
        (Math.sin(i * 0.28 + time * 1.8) * 0.08 + 0.1) *
        (0.6 + Math.sin(i * 0.05 + time * 0.4) * 0.4)
      );
    }

    const barH    = Math.max(2, val * (h - 4));
    const x       = i * barW + 1;
    const y       = h - barH - 2;

    // Grow peak array as needed
    if (peakHold[i]  === undefined) peakHold[i]  = 0;
    if (peakTimer[i] === undefined) peakTimer[i] = 0;
    if (barH > peakHold[i]) {
      peakHold[i]  = barH;
      peakTimer[i] = PEAK_HOLD;
    } else if (peakTimer[i] > 0) {
      peakTimer[i]--;
    } else {
      peakHold[i] = Math.max(2, peakHold[i] - 1.2);
    }

    // Gradient: green → yellow → red based on level
    let r, g, b;
    if (val < 0.6) {
      // green zone
      r = Math.round(val / 0.6 * 80);
      g = Math.round(180 + val * 60);
      b = 30;
    } else if (val < 0.85) {
      // yellow zone
      const t = (val - 0.6) / 0.25;
      r = Math.round(80 + t * 175);
      g = Math.round(220 - t * 20);
      b = 20;
    } else {
      // red zone
      const t = (val - 0.85) / 0.15;
      r = Math.round(255);
      g = Math.round(200 - t * 180);
      b = 20;
    }

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, barW - 2, barH);

    // Peak hold dot
    const peakY = h - peakHold[i] - 2;
    ctx.fillStyle = peakHold[i] > barH * 1.02 ? "rgba(255,255,255,.75)" : `rgb(${r},${g},${b})`;
    ctx.fillRect(x, peakY - 2, barW - 2, 2);
  }

  // Master level meter strip on right (6px wide)
  if (hasAudio) {
    try {
      analyser.getByteTimeDomainData(timeData);
    } catch (_) {}
    let rmsSum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] - 128) / 128;
      rmsSum += v * v;
    }
    const rms = Math.sqrt(rmsSum / timeData.length);
    const meterH = Math.min(h - 4, rms * 4 * (h - 4));
    ctx.fillStyle = rms > 0.5 ? "#ff3322" : rms > 0.25 ? "#ffcc00" : "#44dd66";
    ctx.fillRect(w - 5, h - meterH - 2, 4, meterH);
  }
}

