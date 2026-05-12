import React, { useState } from "react";
import Modal from "./Modal";
import { validateDisplayName } from "../utils/validation";

const DECADES = [
  { id: "80s",        label: "80s",       blurb: "Cassette deck, neon, warm tape" },
  { id: "90s-2000s",  label: "90s-2000s", blurb: "iPod mini, click wheel, MP3 era" },
  { id: "2010s",      label: "2010s",     blurb: "Smartphone, streaming, glass UI" },
];

export default function OnboardingModal({
  open,
  initialName = "",
  initialDecade = "80s",
  onComplete,
  onSkip,
}) {
  const [name,   setName]   = useState(initialName);
  const [decade, setDecade] = useState(initialDecade);
  const [err,    setErr]    = useState("");
  const [busy,   setBusy]   = useState(false);

  async function submit(e) {
    e.preventDefault();
    const ne = validateDisplayName(name);
    if (ne) { setErr(ne); return; }
    setErr(""); setBusy(true);
    try { await onComplete({ displayName: name.trim(), decade }); }
    catch (ex) { setErr(ex.message ?? "Couldn’t save profile."); }
    finally    { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onSkip} title="Welcome to Signal Synth" size="md" hideClose>
      <form onSubmit={submit} className="onboard-form">
        <p className="onboard-intro">
          Let’s set up your profile. You can change these any time in Settings.
        </p>

        <label className="auth-label">
          Display name
          <input
            className="auth-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Synth Wave Cat"
            autoFocus
            disabled={busy}
            maxLength={40}
          />
        </label>

        <p className="onboard-section-label">Pick a decade theme</p>
        <div className="decade-grid">
          {DECADES.map((d) => (
            <button
              type="button"
              key={d.id}
              className={`decade-card decade-${d.id}${decade === d.id ? " selected" : ""}`}
              onClick={() => setDecade(d.id)}
              disabled={busy}
            >
              <div className="decade-card-thumb" data-decade={d.id} />
              <div className="decade-card-label">{d.label}</div>
              <div className="decade-card-blurb">{d.blurb}</div>
            </button>
          ))}
        </div>

        {err && <p className="auth-modal-msg error">{err}</p>}

        <div className="onboard-buttons">
          <button type="button" className="hw-btn hw-btn-md" onClick={onSkip} disabled={busy}>
            Skip
          </button>
          <button type="submit" className="hw-btn hw-btn-md active" disabled={busy}>
            {busy ? "Saving…" : "Get Started"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
