import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";

const TOOLTIP_W = 300;
const TOOLTIP_H = 148;

/** Base steps — copy trimmed ≥40%; placement may switch to vertical on narrow screens. */
const STEP_BLUEPRINT = [
  {
    id: "viz",
    selector: '[data-tour="visualizer"]',
    title: "Mix meters",
    body: "Live readout from the master bus.",
    place: "below",
  },
  {
    id: "transport",
    selector: '[data-tour="transport"]',
    title: "Transport",
    body: "Play pauses without rewinding; Stop freezes the playhead. Record exports a clip.",
    place: "below",
  },
  {
    id: "appearances",
    selector: '[data-tour="appearances"]',
    title: "Skins",
    body: "Switch decades without opening Settings.",
    place: "below",
  },
  {
    id: "settingsgear",
    selector: '[data-tour="settings-btn"]',
    title: "Settings",
    body: "Audio defaults, visuals, replay this tour anytime.",
    place: "below",
  },
  {
    id: "signal",
    selector: '[data-tour="signal-panel"]',
    title: "Signal panel",
    body: "Edits whichever track header is highlighted.",
    place: "below",
  },
  {
    id: "sidebar",
    selector: '[data-tour="sidebar"]',
    title: "Lanes",
    body: "+ Track adds stacks. Muting, solo, and trims live here.",
    place: "below",
    widePlace: "right",
  },
  {
    id: "timeline",
    selector: '[data-tour="timeline"]',
    title: "Timeline",
    body: "Drop wave chips onto the grid from the formula lane. Blocks drag between tracks.",
    place: "below",
    widePlace: "left",
  },
  {
    id: "avatar",
    selector: '[data-tour="avatar"]',
    title: "Account menu",
    body: "Presets, My Songs when signed in, and cloud sync from here.",
    place: "below",
    widePlace: "below-left",
  },
];

const ACCOUNT_STEP_BLUEPRINT = {
  id: "account",
  selector: '[data-tour="transport"]',
  title: "Save in the cloud",
  body: "Create an account to keep sessions backed up remotely. Projects still export as JSON anytime.",
  place: "below",
};

const DOUBLE_TAP_STEP_BLUEPRINT = {
  id: "blocks-touch",
  selector: '[data-tour="timeline"]',
  title: "Quick tip",
  body: "Double-tap any block to jump straight into its richer context strip.",
  place: "above",
};

function useNarrowPortraitStack() {
  const [narrow, setNarrow] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)").matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return narrow;
}

export default function TutorialTour({
  open,
  onClose,
  touchUi,
  onOpenAuth,
}) {
  const narrow = useNarrowPortraitStack();
  const verticalOnly = narrow || !!touchUi;

  const STEPS = useMemo(() => {
    const core = STEP_BLUEPRINT.map((s) => {
      let place = verticalOnly ? "below" : (s.widePlace || s.place || "below");
      if (
        verticalOnly &&
        (
          place === "left" ||
          place === "right" ||
          place === "below-left"
        )
      ) {
        place = "below";
      }
      return { ...s, place };
    });
    let out = [...core];

    const ins = out.findIndex((s) => s.id === "timeline");
    const insertIdx = ins >= 0 ? ins + 1 : out.length;

    if (touchUi || narrow) {
      out.splice(insertIdx, 0, {
        ...DOUBLE_TAP_STEP_BLUEPRINT,
        place: narrow ? "above" : DOUBLE_TAP_STEP_BLUEPRINT.place,
      });
    }

    out.push({ ...ACCOUNT_STEP_BLUEPRINT });
    return out;
  }, [verticalOnly, touchUi, narrow]);

  const [step, setStep]             = useState(0);
  const [rect, setRect]             = useState(null);

  const accountIndex = STEPS.findIndex((s) => s.id === "account");

  useLayoutEffect(() => {
    if (!open) return;

    function update() {
      const cur = STEPS[step];
      if (!cur) { setRect(null); return; }
      const el = document.querySelector(cur.selector);
      if (!el) { setRect({ missing: true }); return; }
      const r = el.getBoundingClientRect();
      setRect({ left: r.left, top: r.top, width: r.width, height: r.bottom - r.top });
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step, STEPS]);

  const next = useCallback(() => {
    if (step >= STEPS.length - 1) onClose?.();
    else setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }, [STEPS.length, step, onClose]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
      else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      }
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev, onClose]);

  function handleSkip() {
    if (accountIndex < 0) {
      onClose?.();
      return;
    }
    if (step < accountIndex) setStep(accountIndex);
    else onClose?.();
  }

  if (!open) return null;

  const cur    = STEPS[step];
  const isAccount = cur?.id === "account";

  const padding = 10;
  let style = { top: 96, left: 16 };
  if (rect && !rect.missing) {
    const place = verticalOnly ? (cur?.place === "above" ? "above" : "below") : (cur.place || "below");
    if (place === "below") {
      style = {
        top: rect.top + rect.height + padding,
        left: rect.left + rect.width / 2 - TOOLTIP_W / 2,
      };
    } else if (place === "above") {
      style = {
        top: rect.top - TOOLTIP_H - padding,
        left: rect.left + rect.width / 2 - TOOLTIP_W / 2,
      };
    } else if (place === "left") {
      style = {
        top: rect.top + rect.height / 2 - TOOLTIP_H / 2,
        left: rect.left - TOOLTIP_W - padding,
      };
    } else if (place === "right") {
      style = {
        top: rect.top + rect.height / 2 - TOOLTIP_H / 2,
        left: rect.left + rect.width + padding,
      };
    } else if (place === "below-left") {
      style = {
        top: rect.top + rect.height + padding,
        left: Math.min(rect.left + rect.width - TOOLTIP_W, rect.left),
      };
    }
    style.left = Math.max(12, Math.min(window.innerWidth - TOOLTIP_W - 12, style.left));
    style.top = Math.max(12, Math.min(window.innerHeight - TOOLTIP_H - 14, style.top));
  }

  return (
    <>
      <div className="tour-overlay">
        {rect && !rect.missing && (
          <div
            className="tour-spotlight"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
            }}
          />
        )}
      </div>

      <div
        className="tour-tooltip"
        style={{ ...style, width: TOOLTIP_W, maxWidth: TOOLTIP_W }}
        role="dialog"
        aria-live="polite"
      >
        <div className="tour-step-counter">
          {step + 1} / {STEPS.length}
        </div>
        <h3 className="tour-title">{cur?.title}</h3>
        <p className="tour-body">{cur?.body}</p>
        <div className="tour-buttons">
          {!isAccount && (
            <button type="button" className="hw-btn hw-btn-sm" onClick={handleSkip}>Skip</button>
          )}
          <button type="button" className="hw-btn hw-btn-sm" onClick={prev} disabled={step === 0}>Back</button>
          {!isAccount && (
            <button type="button" className="hw-btn hw-btn-sm active" onClick={next}>
              Next
            </button>
          )}
          {isAccount && (
            <>
              <button
                type="button"
                className="hw-btn hw-btn-sm active"
                onClick={() => {
                  onOpenAuth?.();
                  onClose?.();
                }}
              >
                Create account
              </button>
              <button type="button" className="hw-btn hw-btn-sm" onClick={() => onClose?.()}>
                Skip
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
