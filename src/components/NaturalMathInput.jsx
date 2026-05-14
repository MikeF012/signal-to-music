import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compileCustomFormula } from "../math/waveMath";
import FormulaKeypad from "./FormulaKeypad";

const MOBILE_FORMULA_MQ = "(max-width: 768px)";

function useNarrowViewport768() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(MOBILE_FORMULA_MQ).matches);

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
  const blurTimer = useRef(null);
  const narrowVp = useNarrowViewport768();
  const [keypadVisible, setKeypadVisible] = useState(false);

  const liveEval = useMemo(() => compileCustomFormula(value.trim() || ""), [value]);
  const combinedError = error || liveEval.error;
  const isValidFormula = Boolean(value.trim() && !combinedError);

  const moveCursor = useRef(null);

  function cancelBlurHide() {
    if (blurTimer.current != null) {
      window.clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  }

  function scheduleBlurHide() {
    cancelBlurHide();
    blurTimer.current = window.setTimeout(() => setKeypadVisible(false), 180);
  }

  useEffect(() => () => cancelBlurHide(), []);

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
      } catch { /* noop */ }
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

  const handleApply = useCallback(() => {
    if (onCommit) onCommit(inputRef.current?.value ?? "");
    inputRef.current?.blur();
    setKeypadVisible(false);
  }, [onCommit]);

  return (
    <div className="natural-math-editor">
      <input
        ref={inputRef}
        className="formula-input formula-input--touch formula-input--no-os-kb"
        readOnly
        inputMode="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        type="text"
        value={value}
        onChange={undefined}
        onKeyDown={(e) => e.preventDefault()}
        onFocus={() => {
          cancelBlurHide();
          setKeypadVisible(true);
          if (narrowVp) inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          try {
            const el = inputRef.current;
            if (!el) return;
            const len = value.length;
            el.setSelectionRange(len, len);
          } catch { /* noop */ }
        }}
        onBlur={() => scheduleBlurHide()}
        placeholder="sin(t) + 0.5sin(2t)  or  sin(t)e^-4t"
        title="Use the on-screen keypad (OS keyboard stays off for a stable viewport)."
      />



      <div className={`formula-live-status ${isValidFormula ? "ok" : "bad"}`} aria-live="polite">
        {isValidFormula ? (
          <span className="formula-ok-mark" title="Valid formula">✓</span>
        ) : (
          <span className="formula-live-err">{combinedError || (value.trim() ? "Invalid formula" : "\u00a0")}</span>
        )}
      </div>

      {keypadVisible && (
        <div
          className="formula-keypad-shell"
          role="region"
          aria-label="Scientific keypad"
          onMouseDown={(e) => {
            cancelBlurHide();
            if (!e.target.closest(".formula-input")) e.preventDefault();
          }}
        >
          <FormulaKeypad
            onInsert={(tok) => insertAtCursor(tok)}
            onBackspace={handleBackspaceAtCursor}
            onClear={handleClear}
            onApply={onCommit ? handleApply : undefined}
          />
        </div>
      )}

      {error && <p className="formula-error">{error}</p>}
    </div>
  );
}
