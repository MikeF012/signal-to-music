import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compileCustomFormula } from "../math/waveMath";

const DESKTOP_PANEL_KEYS = [
  { label: "(", value: "(" },
  { label: ")", value: ")" },
  { label: "^", value: "^" },
  { label: "π", value: "π" },
  { label: "+", value: "+" },
  { label: "-", value: "-" },
  { label: "×", value: "*" },
  { label: "÷", value: "/" },
  { label: "sin", value: "sin(" },
  { label: "cos", value: "cos(" },
  { label: "tan", value: "tan(" },
];

const MOBILE_SYMBOLS_ROW1 = [
  { label: "sin(", value: "sin(" },
  { label: "cos(", value: "cos(" },
  { label: "tan(", value: "tan(" },
  { label: "π", value: "π" },
  { label: "×", value: "*" },
  { label: "÷", value: "/" },
  { label: "+", value: "+" },
  { label: "-", value: "-" },
  { label: "(", value: "(" },
  { label: ")", value: ")" },
];

const INLINE_EXAMPLES = ["sin(t)", "cos(2t)", "sin(t)+cos(2t)"];

export default function NaturalMathInput({ value, onChange, error, onCommit, touchUi = false }) {
  const inputRef = useRef(null);
  const toolbarRef = useRef(null);

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const closeTimeoutRef = useRef(null);
  const [toolbarBottomPx, setToolbarBottomPx] = useState(0);

  const liveEval = useMemo(() => compileCustomFormula(value.trim() || ""),
    [value]);

  const combinedError = error || liveEval.error;
  const isValidFormula = Boolean(value.trim() && !combinedError);

  function clearPendingClose() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  function openKeyboard() {
    clearPendingClose();
    setIsKeyboardOpen(true);
    if (!touchUi) return;
    requestAnimationFrame(() => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function scheduleClose() {
    if (touchUi) return;
    clearPendingClose();
    closeTimeoutRef.current = setTimeout(() => {
      setIsKeyboardOpen(false);
    }, 120);
  }

  const positionMobileToolbar = useCallback(() => {
    if (!touchUi || !toolbarRef.current) return;
    const vv = window.visualViewport;
    if (!vv) {
      setToolbarBottomPx(0);
      return;
    }
    const gap = 8;
    const inset = Math.max(0, window.innerHeight - (vv.offsetTop + vv.height));
    setToolbarBottomPx(Math.max(inset + gap, 8));
  }, [touchUi]);

  useEffect(() => {
    if (!touchUi || !isKeyboardOpen) return undefined;
    const vv = window.visualViewport;
    if (!vv) return undefined;
    positionMobileToolbar();
    vv.addEventListener("resize", positionMobileToolbar);
    vv.addEventListener("scroll", positionMobileToolbar);
    return () => {
      vv.removeEventListener("resize", positionMobileToolbar);
      vv.removeEventListener("scroll", positionMobileToolbar);
    };
  }, [touchUi, isKeyboardOpen, positionMobileToolbar]);

  function insertAtCursor(rawToken) {
    const element = inputRef.current;
    if (!element) return;

    const token = rawToken === "π" ? "pi" : rawToken;
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

    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handleClearTouch() {
    onChange("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleDoneTouch() {
    if (onCommit) onCommit(inputRef.current?.value ?? "");
    inputRef.current?.blur();
    setIsKeyboardOpen(false);
  }

  const InputTag = touchUi ? "textarea" : "input";
  const editorClass = touchUi ? "formula-input formula-input--touch" : "formula-input";

  return (
    <div className="natural-math-editor">
      <InputTag
        ref={inputRef}
        className={editorClass}
        type={touchUi ? undefined : "text"}
        rows={touchUi ? 2 : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={touchUi ? "text" : undefined}
        autoCapitalize={touchUi ? "off" : undefined}
        spellCheck={false}
        autoCorrect={touchUi ? "off" : undefined}
        onKeyDown={(e) => {
          if (!touchUi && e.key === "Enter" && onCommit && !e.shiftKey) {
            e.preventDefault();
            onCommit(e.currentTarget.value);
          }
        }}
        onFocus={(e) => {
          openKeyboard();
          if (touchUi)
            requestAnimationFrame(() =>
              e.target.scrollIntoView({ behavior: "smooth", block: "center" }));
        }}
        onBlur={scheduleClose}
        placeholder="sin(t) + 0.5sin(2t)  or  sin(t)e^-4t"
        title="Custom formula — use t as the variable."
      />

      {touchUi && (
        <div className="formula-syntax-muted touch-only-formula-examples">
          <span className="formula-syntax-muted-label">Examples — tap to insert</span>
          <div className="formula-quick-row">
            {INLINE_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="formula-quick-chip"
                onClick={() => onChange(ex)}
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

      {!touchUi && isKeyboardOpen && (
        <div
          className="math-input-panel"
          onMouseDown={(event) => {
            event.preventDefault();
            openKeyboard();
          }}
        >
          <p className="math-input-panel-title">Essentials</p>
          <div className="math-input-grid">
            {DESKTOP_PANEL_KEYS.map((button) => (
              <button
                key={button.label}
                type="button"
                className="math-input-key"
                onClick={() => insertAtCursor(button.value)}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {touchUi && isKeyboardOpen && (
        <div
          ref={toolbarRef}
          className="formula-keyboard-toolbar"
          style={{ bottom: toolbarBottomPx }}
          data-formula-touch-toolbar="1"
        >
          <div className="formula-toolbar-chip-wrap">
            {MOBILE_SYMBOLS_ROW1.map((btn) => (
              <button
                key={btn.label}
                type="button"
                className="formula-toolbar-key"
                onMouseDown={(e) => { e.preventDefault(); }}
                onClick={() => insertAtCursor(btn.value)}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <div className="formula-toolbar-actions">
            <button
              type="button"
              className="formula-toolbar-clear"
              onMouseDown={(e) => { e.preventDefault(); }}
              onClick={handleClearTouch}
            >
              Clear
            </button>
            <button
              type="button"
              className="formula-toolbar-done"
              onMouseDown={(e) => { e.preventDefault(); }}
              onClick={handleDoneTouch}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {!touchUi && error && <p className="formula-error">{error}</p>}
    </div>
  );
}
