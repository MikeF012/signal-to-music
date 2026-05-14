import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";

const FULL_STEPS = [
  {
    selector: '[data-tour="visualizer"]',
    title:    "Master Visualizer",
    body:     "This shows your real stereo mix metered from the master output. Change the app look anytime with Appearances in the transport bar.",
    place:    "below",
  },
  {
    selector: '[data-tour="transport"]',
    title:    "Transport Bar",
    body:     "Play, BPM, zoom, microphone, appearances, and project name. Projects, presets, JSON backup, and Cloud save live under your Profile (avatar).",
    place:    "below",
  },
  {
    selector: '[data-tour="appearances"]',
    title:    "Appearances",
    body:     "Hop between the 80s, 90s–2000s, and 2010s skins without digging through Settings.",
    place:    "below",
  },
  {
    selector: '[data-tour="signal-panel"]',
    title:    "Signal Panel",
    body:     "Shape the waveform, formula, amplitude, and tone of the highlighted track.",
    place:    "below",
  },
  {
    selector: '[data-tour="sidebar"]',
    title:    "Tracks",
    body:     "Stack up lanes, mute, solo, and balance volumes. Tap + Track whenever you want another synth lane.",
    place:    "right",
  },
  {
    selector: '[data-tour="timeline"]',
    title:    "Timeline",
    body:     "Lay clips on the grid. Drag waveform chips from the Signal panel onto a lane when you want a new synth block, and drag clips between lanes. Right-click blocks to duplicate, split, paste, or delete.",
    place:    "left",
  },
  {
    selector: '[data-tour="avatar"]',
    title:    "Your Account",
    body:     "Your Profile menu holds Export/Import JSON, Save to Cloud, presets library, account, and preferences.",
    place:    "below-left",
  },
];

const QUICK_STEPS = [
  {
    selector: '[data-tour="sidebar"]',
    title:    "Add more lanes",
    body:     "Use + Track whenever you want another melodic lane stacked in the mixer.",
    place:    "right",
  },
  {
    selector: '[data-tour="timeline"]',
    title:    "Place a synth block",
    body:     "Pick a waveform chip in the Signal panel and drag it onto a timeline lane—that’s how new synthesized blocks arrive. Tap empty space on a lane to scrub the playhead.",
    place:    "left",
  },
  {
    selector: '[data-tour="signal-panel"]',
    title:    "Shape its sound",
    body:     "Swap waveforms or write a literal formula—the panel always follows the highlighted track.",
    place:    "below",
  },
  {
    selector: '[data-tour="transport"]',
    title:    "Press Play",
    body:     "Playback animates instantly. Use Record to capture a performance export (MP4 when the browser supports it).",
    place:    "below",
  },
  {
    selector: '[data-tour="visualizer"]',
    title:    "Watch the stereo field",
    body:     "Particles and spectrum arcs mirror whatever is summed at the master bus after your mix moves.",
    place:    "below",
  },
];

export default function TutorialTour({
  open,
  variant = "choose",       // choose | quick | full
  onClose,
}) {
  const [mode, setMode]               = useState(variant === "choose" ? "choose" : variant); // choose | quick | full
  const [step, setStep]               = useState(0);
  const [rect, setRect]               = useState(null);

  const STEPS = useMemo(() => (mode === "quick" ? QUICK_STEPS : FULL_STEPS), [mode]);

  useEffect(() => {
    if (!open) return;
    setMode(variant === "choose" ? "choose" : variant);
    setStep(0);
  }, [open, variant]);

  useLayoutEffect(() => {
    if (!open || mode === "choose") { setRect(null); return; }
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
  }, [open, step, mode, STEPS]);

  useEffect(() => {
    if (!open || mode === "choose") return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, mode]);

  function next() {
    if (mode === "choose") return;
    if (step >= STEPS.length - 1) onClose();
    else setStep((s) => s + 1);
  }
  function prev() { setStep((s) => Math.max(0, s - 1)); }

  if (!open) return null;

  // ── Chooser ───────────────────────────────────────────────────────────
  if (mode === "choose") {
    return (
      <div className="tour-overlay tour-overlay--chooser">
        <div className="tour-chooser-card" role="dialog" aria-labelledby="tour-choose-title">
          <h2 id="tour-choose-title" className="tour-chooser-title">Welcome to Signal Synth</h2>
          <p className="tour-chooser-sub">Pick how you want to explore the workspace.</p>
          <p className="tour-chooser-note">
            Work is not auto-saved. Manually &apos;Export&apos; to JSON or &apos;Save to Cloud&apos; via your Profile. Recording generates an MP4 file.
          </p>
          <div className="tour-chooser-grid">
            <button
              type="button"
              className="tour-chooser-option"
              onClick={() => { setMode("quick"); setStep(0); }}
            >
              <span className="tour-chooser-option-kicker">≈2 min</span>
              <span className="tour-chooser-option-title">Quick Start</span>
              <span className="tour-chooser-option-body">Five giant steps: tracks, clips, signal shaping, play, visualizer.</span>
            </button>
            <button
              type="button"
              className="tour-chooser-option tour-chooser-option--full"
              onClick={() => { setMode("full"); setStep(0); }}
            >
              <span className="tour-chooser-option-kicker">Full studio</span>
              <span className="tour-chooser-option-title">Full Tour</span>
              <span className="tour-chooser-option-body">Everything: themes, mic workflow, cloud saves, master bus monitoring, and advanced lane tools.</span>
            </button>
          </div>
          <div className="tour-chooser-footer">
            <button type="button" className="hw-btn hw-btn-sm" onClick={onClose}>Skip intro</button>
          </div>
        </div>
      </div>
    );
  }

  const cur    = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const padding = 12;
  let style = { top: 100, left: 100 };
  if (rect && !rect.missing) {
    const tooltipW = mode === "quick" ? 360 : 320;
    const tooltipH = 160;
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

      <div
        className={`tour-tooltip${mode === "quick" ? " tour-tooltip--quick" : ""}`}
        style={style}
        role="dialog"
        aria-live="polite"
      >
        <div className="tour-step-counter">
          {mode === "quick" ? "Quick Start · " : "Full Tour · "}
          {step + 1} / {STEPS.length}
        </div>
        <h3 className="tour-title">{cur.title}</h3>
        <p className="tour-body">{cur.body}</p>
        <div className="tour-buttons">
          <button type="button" className="hw-btn hw-btn-sm" onClick={onClose}>Skip</button>
          <button type="button" className="hw-btn hw-btn-sm" onClick={prev} disabled={step === 0}>Back</button>
          <button type="button" className="hw-btn hw-btn-sm active" onClick={next}>
            {isLast ? "Done" : "Next →"}
          </button>
        </div>
      </div>
    </>
  );
}
