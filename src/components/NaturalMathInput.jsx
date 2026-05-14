import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compileCustomFormula } from "../math/waveMath";
import FormulaKeypad from "./FormulaKeypad";

const INLINE_EXAMPLES = ["sin(t)", "cos(2t)", "sin(t)+cos(2t)"];
const MOBILE_FORMULA_MQ = "(max-width: 768px)";

/** Narrow viewports match compact mobile CSS; avoids OS keyboard jank — same breakpoint as TrackEditor/mobile layout. */
function useFormulaMobileViewport() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(MOBILE_FORMULA_MQ).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_FORMULA_MQ);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return narrow;
}

export default function NaturalMathInput({ value, onChange, error, onCommit }) {
  const inputRef = useRef(null);
  const narrowVp = useFormulaMobileViewport();

  const liveEval = useMemo(() => compileCustomFormula(value.trim() || ""),
    [value]);

  const combinedError = error || liveEval.error;
  const isValidFormula = Boolean(value.trim() && !combinedError);

  /** Keep synthetic caret position after controlled updates. */
  const moveCursor = useRef(null);

  function insertAtCursor(rawToken) {
    const element = inputRef.current;
    if (!element) return;

    const token = rawToken === "π" ? "pi" : rawToken === "−" ? "-" : rawToken;
    const current = element.value;
    const start = element.selectionStart ?? current.length;
    const end = element.selectionEnd ?? current.length;
    let nextValue = current;
    let nextCursor = start + token.length;

    if (token === "(") {
      nextValue = `${current.slice(0, start)}()${current.slice(end)}`;
      nextCursor = start + 1;
    } else {
      nextValue = `${current.slice(0, start)}${token}${current.slice(end)}`;
    }

    onChange(nextValue);
    moveCursor.current = nextCursor;
  }

  function handleBackspaceAtCursor() {
    const element = inputRef.current;
    if (!element) return;
    const current = element.value;
    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    let next = current;
    let nextCursor = start;

    if (end > start) {
      next = current.slice(0, start) + current.slice(end);
      nextCursor = start;
    } else if (start > 0) {
      next = current.slice(0, start - 1) + current.slice(end);
      nextCursor = start - 1;
    }

    if (next !== current) {
      onChange(next);
      moveCursor.current = nextCursor;
    }
  }

  useEffect(() => {
    if (moveCursor.current === null) return;
    const element = inputRef.current;
    const pos = moveCursor.current;
    moveCursor.current = null;
    if (!element) return;
    requestAnimationFrame(() => {
      try {
        element.focus({ preventScroll: true });
        element.setSelectionRange(pos, pos);
      } catch {
        /* noop */
      }
    });
  }, [value]);

  const handleClear = useCallback(() => {
    onChange("");
    moveCursor.current = 0;
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        try {
          el.focus({ preventScroll: true });
          el.setSelectionRange(0, 0);
        } catch { /* noop */ }
      }
    });
  }, [onChange]);

  const handleDoneTouch = useCallback(() => {
    if (onCommit) onCommit(inputRef.current?.value ?? "");
    inputRef.current?.blur();
  }, [onCommit]);

  const InputTag = narrowVp ? "textarea" : "input";
  const editorClass = [
    "formula-input",
    narrowVp ? "formula-input--touch" : "",
    narrowVp ? "formula-input--no-os-kb" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="natural-math-editor">
      <InputTag
        ref={inputRef}
        className={editorClass}
        readOnly={narrowVp}
        inputMode={narrowVp ? "none" : undefined}
        enterKeyHint={narrowVp ? "done" : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        type={narrowVp ? undefined : "text"}
        rows={narrowVp ? 2 : undefined}
        value={value}
        onChange={narrowVp ? undefined : (e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (narrowVp) {
            e.preventDefault();
            return;
          }
          if (e.key === "Enter" && onCommit && !e.shiftKey) {
            e.preventDefault();
            onCommit(e.currentTarget.value);
          }
        }}
        onFocus={(e) => {
          if (narrowVp) {
            e.target.scrollIntoView({ behavior: "smooth", block: "center" });
            try {
              const len = value.length;
              e.target.setSelectionRange(len, len);
            } catch { /* noop */ }
          }
        }}
        placeholder="sin(t) + 0.5sin(2t)  or  sin(t)e^-4t"
        title={
          narrowVp
            ? "Use the on-screen keypad — system keyboard is disabled to keep the layout stable."
            : "Custom formula — type or use the keypad. Use t as the variable."
        }
      />

      {narrowVp && (
        <p className="formula-kb-hint">Use the keypad below — no OS keyboard</p>
      )}

      {narrowVp && (
        <div className="formula-syntax-muted touch-only-formula-examples">
          <span className="formula-syntax-muted-label">Examples — tap</span>
          <div className="formula-quick-row">
            {INLINE_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="formula-quick-chip"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(ex);
                  moveCursor.current = ex.length;
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`formula-live-status ${isValidFormula ? "ok" : "bad"}`} aria-live="polite">
        {isValidFormula ? (
          <span className="formula-ok-mark" title="Valid formula">✓</span>
        ) : (
          <span className="formula-live-err">{combinedError || (value.trim() ? "Invalid formula" : "\u00a0")}</span>
        )}
      </div>

      <div
        className="formula-keypad-shell"
        onMouseDown={(e) => {
          if (!narrowVp) return;
          if (e.target.closest("button,input,textarea")) return;
          e.preventDefault();
        }}
      >
        <FormulaKeypad
          compact={narrowVp}
          onInsert={(tok) => insertAtCursor(tok)}
          onBackspace={handleBackspaceAtCursor}
        />
        <div className="formula-keypad-actions">
          <button
            type="button"
            className="formula-keypad-action formula-keypad-action--muted"
            onMouseDown={(e) => { e.preventDefault(); }}
            onClick={handleClear}
          >
            Clear
          </button>
          {narrowVp ? (
            <button
              type="button"
              className="formula-keypad-action formula-keypad-action--primary"
              onMouseDown={(e) => { e.preventDefault(); }}
              onClick={handleDoneTouch}
            >
              Done
            </button>
          ) : (
            onCommit && (
              <button
                type="button"
                className="formula-keypad-action formula-keypad-action--primary"
                onMouseDown={(e) => { e.preventDefault(); }}
                onClick={() => onCommit(inputRef.current?.value ?? "")}
              >
                Apply
              </button>
            )
          )}
        </div>
      </div>

      {!narrowVp && error && <p className="formula-error">{error}</p>}
    </div>
  );
}
