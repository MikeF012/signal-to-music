import React from "react";

const DIGIT_ROWS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
];

const FUNC_KEYS = [
  { label: "sin", value: "sin(" },
  { label: "cos", value: "cos(" },
  { label: "tan", value: "tan(" },
  { label: "(", value: "(" },
  { label: ")", value: ")" },
  { label: "π", value: "π" },
  { label: "√", value: "sqrt(" },
  { label: "exp", value: "exp(" },
  { label: "log", value: "log(" },
  { label: "|x|", value: "abs(" },
  { label: "pow", value: "pow(" },
  { label: "min", value: "min(" },
  { label: "max", value: "max(" },
  { label: "^", value: "^" },
  { label: "+", value: "+" },
  { label: "−", value: "-" },
  { label: "×", value: "*" },
  { label: "÷", value: "/" },
];

export default function FormulaKeypad({
  onInsert,
  onBackspace,
  compact = false,
  className = "",
}) {
  const wrapClass = ["formula-custom-keypad", compact ? "formula-custom-keypad--compact" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapClass} role="group" aria-label="Formula keypad">
      <div className="formula-keypad-digits">
        {DIGIT_ROWS.map((row) => (
          <div key={row.join("")} className="formula-keypad-row">
            {row.map((d) => (
              <button
                key={d}
                type="button"
                className="formula-keypad-btn formula-keypad-btn--digit"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onInsert(d)}
              >
                {d}
              </button>
            ))}
          </div>
        ))}
        <div className="formula-keypad-row formula-keypad-row--bottom">
          <button
            type="button"
            className="formula-keypad-btn"
            title="Variable t"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert("t")}
          >
            t
          </button>
          <button
            type="button"
            className="formula-keypad-btn formula-keypad-btn--digit"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(".")}
          >
            .
          </button>
          <button
            type="button"
            className="formula-keypad-btn formula-keypad-btn--digit"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert("0")}
          >
            0
          </button>
          <button
            type="button"
            className="formula-keypad-btn formula-keypad-btn--wide"
            title="Delete"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onBackspace}
          >
            ⌫
          </button>
        </div>
      </div>
      <div className="formula-keypad-functions">
        {FUNC_KEYS.map((btn) => (
          <button
            key={btn.label}
            type="button"
            className="formula-keypad-btn formula-keypad-btn--fn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(btn.value)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
