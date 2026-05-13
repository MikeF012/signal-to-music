import React, { useRef, useState } from "react";

export default function NaturalMathInput({ value, onChange, error, onCommit }) {
  const inputRef = useRef(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const closeTimeoutRef = useRef(null);

  function clearPendingClose() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  function openKeyboard() {
    clearPendingClose();
    setIsKeyboardOpen(true);
  }

  function scheduleClose() {
    clearPendingClose();
    closeTimeoutRef.current = setTimeout(() => {
      setIsKeyboardOpen(false);
    }, 120);
  }

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

  const keyButtons = [
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

  return (
    <div className="natural-math-editor">
      <input
        ref={inputRef}
        className="formula-input"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onCommit) {
            e.preventDefault();
            onCommit(e.currentTarget.value);
          }
        }}
        onFocus={openKeyboard}
        onBlur={scheduleClose}
        placeholder="sin(t) + 0.5sin(2t)  or  sin(t)e^-4t"
        title="Custom formula — use t as the variable. Press Enter to apply to the selected track."
      />

      {isKeyboardOpen && (
        <div
          className="math-input-panel"
          onMouseDown={(event) => {
            event.preventDefault();
            openKeyboard();
          }}
        >
          <p className="math-input-panel-title">Essentials</p>
          <div className="math-input-grid">
            {keyButtons.map((button) => (
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

      {error && <p className="formula-error">{error}</p>}
    </div>
  );
}
