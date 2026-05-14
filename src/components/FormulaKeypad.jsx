import React from "react";

/** Top rows: wider macro keys — bottom grid: tighter numeric/operators. */

function MacroCell({ label, title, className = "", disabled, span = 1, ...props }) {
  return (
    <button
      type="button"
      style={span > 1 ? { gridColumn: `span ${span}` } : undefined}
      className={`formula-sci-macro-cell ${className}`.trim()}
      title={title ?? label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      {...props}
    >
      {label}
    </button>
  );
}

function CompactCell({ label, title, className = "", disabled, span = 1, ...props }) {
  return (
    <button
      type="button"
      style={span > 1 ? { gridColumn: `span ${span}` } : undefined}
      className={`formula-sci-num-cell ${className}`.trim()}
      title={title ?? label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      {...props}
    >
      {label}
    </button>
  );
}

export default function FormulaKeypad({
  onInsert,
  onBackspace,
  onClear,
  onApply,
}) {
  return (
    <div className="formula-keypad-split" role="group" aria-label="Formula keypad">
      <div className="formula-sci-macro-grid" aria-label="Functions">
        <MacroCell label="sin" span={2} onClick={() => onInsert?.("sin(")} />
        <MacroCell label="cos" span={2} onClick={() => onInsert?.("cos(")} />
        <MacroCell label="tan" onClick={() => onInsert?.("tan(")} />
        <MacroCell label="√" title="sqrt(" span={2} onClick={() => onInsert?.("sqrt(")} />
        <MacroCell label="π" title="pi" onClick={() => onInsert?.("π")} />
        <MacroCell label="e" onClick={() => onInsert?.("e")} />
        <MacroCell label="t" onClick={() => onInsert?.("t")} />
        <MacroCell label="⌫" title="Backspace" span={5} className="formula-sci-macro-cell--action" onClick={() => onBackspace?.()} />
      </div>

      <div className="formula-sci-num-grid" aria-label="Numbers and operators">
        <CompactCell label="(" onClick={() => onInsert?.("(")} />
        <CompactCell label=")" onClick={() => onInsert?.(")")} />
        <CompactCell label="7" onClick={() => onInsert?.("7")} />
        <CompactCell label="8" onClick={() => onInsert?.("8")} />
        <CompactCell label="9" onClick={() => onInsert?.("9")} />
        <CompactCell label="/" onClick={() => onInsert?.("/")} />
        <CompactCell label="*" onClick={() => onInsert?.("*")} />
        <CompactCell label="4" onClick={() => onInsert?.("4")} />
        <CompactCell label="5" onClick={() => onInsert?.("5")} />
        <CompactCell label="6" onClick={() => onInsert?.("6")} />
        <CompactCell label="+" onClick={() => onInsert?.("+")} />
        <CompactCell label="−" title="Subtract" onClick={() => onInsert?.("−")} />
        <CompactCell label="1" onClick={() => onInsert?.("1")} />
        <CompactCell label="2" onClick={() => onInsert?.("2")} />
        <CompactCell label="3" onClick={() => onInsert?.("3")} />
        <CompactCell label="." onClick={() => onInsert?.(".")} />
        <CompactCell label="Clr" title="Clear" className="formula-sci-num-cell--action" onClick={() => onClear?.()} />
        <CompactCell label="0" span={3} onClick={() => onInsert?.("0")} />
        <CompactCell
          label="Apply"
          span={5}
          className="formula-sci-num-cell--apply"
          disabled={!onApply}
          onClick={() => onApply?.()}
        />
      </div>
    </div>
  );
}
