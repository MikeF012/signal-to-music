/*
  ParamControl.jsx
  ----------------
  Reusable control row for one numeric parameter.
  It shows:
  - a label
  - a slider
  - a number input

  Both inputs stay in sync and call onChange(value).
*/

import React from "react";

export default function ParamControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}) {
  function handleChange(event) {
    onChange(event.target.value);
  }

  return (
    <div className="param-control">
      <label className="param-label">{label}</label>

      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={handleChange}
      />

      <input
        className="param-number"
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={handleChange}
      />
    </div>
  );
}