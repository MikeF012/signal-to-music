import React, { useEffect, useLayoutEffect, useState } from "react";

const STEPS = [
  {
    selector: '[data-tour="visualizer"]',
    title:    "Master Visualizer",
    body:     "All your tracks combined live up here, reacting to the mix in real time. Tip: you can change the entire look of the app anytime with Appearances in the transport bar.",
    place:    "below",
  },
  {
    selector: '[data-tour="transport"]',
    title:    "Transport Bar",
    body:     "Play, stop, record, BPM, volume, and more. The palette button opens Appearances — switch between 80s, 90s–2000s, and 2010s themes without opening Settings.",
    place:    "below",
  },
  {
    selector: '[data-tour="appearances"]',
    title:    "Appearances",
    body:     "Click here to preview and apply a theme in one tap. Your choice is saved on this device and to the cloud when you’re signed in.",
    place:    "below",
  },
  {
    selector: '[data-tour="signal-panel"]',
    title:    "Signal Panel",
    body:     "Edit the math behind the selected track — wave type, amplitude, frequency, phase, or a fully custom formula.",
    place:    "below",
  },
  {
    selector: '[data-tour="sidebar"]',
    title:    "Tracks",
    body:     "Add up to 8 tracks. Mute, solo, set volume per track. Click a track row to select it.",
    place:    "right",
  },
  {
    selector: '[data-tour="timeline"]',
    title:    "Timeline",
    body:     "Click a lane to drop a signal block. Drag blocks between lanes, or right-click a block for split, copy, and more.",
    place:    "left",
  },
  {
    selector: '[data-tour="avatar"]',
    title:    "Your Account",
    body:     "Sign in here to save your songs to the cloud, manage settings, and sync preferences across devices.",
    place:    "below-left",
  },
];

export default function TutorialTour({ open, onClose }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);

  useEffect(() => { if (open) setStep(0); }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    function update() {
      const cur = STEPS[step];
      if (!cur) { setRect(null); return; }
      const el = document.querySelector(cur.selector);
      if (!el) { setRect({ missing: true }); return; }
      const r = el.getBoundingClientRect();
      setRect({
        x: r.left, y: r.top, width: r.width, height: r.height,
      });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  function next() {
    if (step >= STEPS.length - 1) onClose();
    else setStep((s) => s + 1);
  }
  function prev() { setStep((s) => Math.max(0, s - 1)); }

  if (!open) return null;
  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Tooltip placement
  const padding = 12;
  let style = { top: 100, left: 100 };
  if (rect && !rect.missing) {
    const tooltipW = 320;
    const tooltipH = 140;
    const place = cur.place ?? "below";
    if (place === "below") {
      style = { top: rect.y + rect.height + padding, left: rect.x + rect.width / 2 - tooltipW / 2 };
    } else if (place === "below-left") {
      style = { top: rect.y + rect.height + padding, left: Math.max(20, rect.x + rect.width - tooltipW) };
    } else if (place === "right") {
      style = { top: rect.y + rect.height / 2 - tooltipH / 2, left: rect.x + rect.width + padding };
    } else if (place === "left") {
      style = { top: rect.y + rect.height / 2 - tooltipH / 2, left: rect.x - tooltipW - padding };
    } else if (place === "above") {
      style = { top: rect.y - tooltipH - padding, left: rect.x + rect.width / 2 - tooltipW / 2 };
    }
    style.left = Math.max(16, Math.min(window.innerWidth - tooltipW - 16, style.left));
    style.top  = Math.max(16, Math.min(window.innerHeight - tooltipH - 16, style.top));
  }

  return (
    <>
      {/* Spotlight */}
      <div className="tour-overlay">
        {rect && !rect.missing && (
          <div
            className="tour-spotlight"
            style={{
              top:    rect.y - 6,
              left:   rect.x - 6,
              width:  rect.width + 12,
              height: rect.height + 12,
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div className="tour-tooltip" style={style} role="dialog" aria-live="polite">
        <div className="tour-step-counter">{step + 1} / {STEPS.length}</div>
        <h3 className="tour-title">{cur.title}</h3>
        <p className="tour-body">{cur.body}</p>
        <div className="tour-buttons">
          <button className="hw-btn hw-btn-sm" onClick={onClose}>Skip</button>
          <button className="hw-btn hw-btn-sm" onClick={prev} disabled={step === 0}>Back</button>
          <button className="hw-btn hw-btn-sm active" onClick={next}>
            {isLast ? "Done" : "Next →"}
          </button>
        </div>
      </div>
    </>
  );
}
