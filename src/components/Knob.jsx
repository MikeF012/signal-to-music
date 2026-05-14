import React, { useCallback, useRef } from "react";

const SWEEP_DEG = 270;
const START_DEG = 135;

function polarToXY(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startDeg, endDeg) {
  const s    = polarToXY(cx, cy, r, startDeg);
  const e    = polarToXY(cx, cy, r, endDeg);
  const span = ((endDeg - startDeg) % 360 + 360) % 360;
  const la   = span > 180 ? 1 : 0;
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${la} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
}

export default function Knob({
  value, min = 0, max = 1, step = 0.01, onChange, label, size = 56, touchUi = false,
}) {
  const dragStartY   = useRef(null);
  const dragStartVal = useRef(null);

  const svgH = size + 4;
  const cx   = size / 2;
  const cy   = svgH / 2;
  const r    = size * 0.36;     // arc radius
  const ir   = size * 0.22;     // inner knob radius
  const tickR1 = ir * 0.42;     // tick inner end
  const tickR2 = r - size * 0.08; // tick outer end

  const normalized = (value - min) / (max - min);
  const valueDeg   = START_DEG + normalized * SWEEP_DEG;

  const trackPath = describeArc(cx, cy, r, START_DEG, START_DEG + SWEEP_DEG);
  const valuePath = normalized > 0.001
    ? describeArc(cx, cy, r, START_DEG, Math.min(valueDeg, START_DEG + SWEEP_DEG - 0.01))
    : null;

  const tickOuter = polarToXY(cx, cy, tickR2, valueDeg);
  const tickInner = polarToXY(cx, cy, tickR1, valueDeg);

  const gradId  = `knob-metal-${label ?? "k"}`.replace(/\s/g, "-");
  const decade  = document.documentElement.dataset.decade ?? "";
  const is80s   = decade === "80s";
  const is90s   = decade === "90s-2000s";
  const is2000s = decade === "2010s";

  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartY.current   = e.clientY;
    dragStartVal.current = value;
  }, [value]);

  const onPointerMove = useCallback((e) => {
    if (dragStartY.current === null) return;
    const dy    = dragStartY.current - e.clientY;
    const divisor = touchUi ? 54 : 100;
    const delta = (dy / divisor) * (max - min);
    const raw   = Math.max(min, Math.min(max, dragStartVal.current + delta));
    onChange(parseFloat((Math.round(raw / step) * step).toFixed(10)));
  }, [min, max, step, onChange, touchUi]);

  const onPointerUp = useCallback(() => {
    dragStartY.current   = null;
    dragStartVal.current = null;
  }, []);

  return (
    <div className="knob-wrap" title={label ? `${label}: ${value.toFixed(2)}` : undefined}>
      <svg
        width={size}
        height={svgH}
        className="knob-svg"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ touchAction: "none", userSelect: "none" }}
      >
        <defs>
          {/* Knob body gradient — theme-aware */}
          <radialGradient id={gradId} cx="35%" cy="28%" r="70%">
            {is80s ? (
              /* Dark grey plastic */
              <>
                <stop offset="0%"   stopColor="#3a3630" />
                <stop offset="45%"  stopColor="#1e1c18" />
                <stop offset="100%" stopColor="#0e0c0a" />
              </>
            ) : is90s ? (
              /* Chrome brushed metal — silver specular */
              <>
                <stop offset="0%"   stopColor="#dce8f8" />
                <stop offset="25%"  stopColor="#9ab8d8" />
                <stop offset="60%"  stopColor="#4a6888" />
                <stop offset="100%" stopColor="#1a2e48" />
              </>
            ) : is2000s ? (
              /* Matte dark grey — FL Studio mixer knob */
              <>
                <stop offset="0%"   stopColor="#3a3a3a" />
                <stop offset="40%"  stopColor="#262626" />
                <stop offset="100%" stopColor="#141414" />
              </>
            ) : (
              /* Default warm brushed-metal */
              <>
                <stop offset="0%"   stopColor="#5a3a28" />
                <stop offset="45%"  stopColor="#2a1818" />
                <stop offset="100%" stopColor="#0e0808" />
              </>
            )}
          </radialGradient>
        </defs>

        {/* Arc track */}
        <path d={trackPath} fill="none" className="knob-track" />

        {/* Arc value */}
        {valuePath && <path d={valuePath} fill="none" className="knob-value-arc" />}

        {/* Knob body */}
        <circle
          cx={cx} cy={cy} r={ir}
          fill={`url(#${gradId})`}
          stroke={is80s ? "#181614" : is90s ? "rgba(180,210,240,.35)" : is2000s ? "#1a1a1a" : "#3a2010"}
          strokeWidth="1"
        />

        {/* Highlight rim */}
        <circle
          cx={cx} cy={cy} r={ir}
          fill="none"
          stroke={is80s ? "rgba(200,168,120,.06)" : is90s ? "rgba(255,255,255,.25)" : is2000s ? "rgba(255,255,255,.08)" : "rgba(255,220,160,.07)"}
          strokeWidth="1"
        />

        {/* Pointer tick */}
        <line
          x1={tickInner.x.toFixed(3)} y1={tickInner.y.toFixed(3)}
          x2={tickOuter.x.toFixed(3)} y2={tickOuter.y.toFixed(3)}
          className="knob-tick"
        />
      </svg>
      {label && <span className="knob-label">{label}</span>}
      <span className="knob-readout">{value.toFixed(2)}</span>
    </div>
  );
}
