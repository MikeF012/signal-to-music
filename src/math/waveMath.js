/*
  waveMath.js
  -----------
  Math helpers to evaluate waveform values and generate sampled points
  for drawing a preview graph.
*/

const ALLOWED_IDENTIFIER_SET = new Set([
  "t",
  "x",
  "y",
  "pi",
  "e",
  "sin",
  "cos",
  "tan",
  "abs",
  "sqrt",
  "pow",
  "exp",
  "log",
  "min",
  "max",
]);

function normalizeExpression(rawExpression) {
  const withExplicitExponent = rewriteCaretExponent(rawExpression);
  return insertImplicitMultiplication(withExplicitExponent);
}

function tokenizeExpression(expression) {
  return expression.match(/\d*\.?\d+|[A-Za-z_]\w*|\*\*|[()+\-*/,]/g) ?? [];
}

function rewriteCaretExponent(rawExpression) {
  const expression = String(rawExpression ?? "");
  let output = "";
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];
    if (char !== "^") {
      output += char;
      i += 1;
      continue;
    }

    output += "**";
    i += 1;

    while (i < expression.length && /\s/.test(expression[i])) i += 1;

    const start = i;
    let depth = 0;
    let sawSign = false;
    if (expression[i] === "+" || expression[i] === "-") {
      sawSign = true;
      i += 1;
    }

    while (i < expression.length) {
      const next = expression[i];

      if (next === "(") {
        depth += 1;
        i += 1;
        continue;
      }

      if (next === ")") {
        if (depth === 0) break;
        depth -= 1;
        i += 1;
        continue;
      }

      if (depth === 0 && (next === "+" || next === "-" || next === "*" || next === "/" || next === ",")) {
        break;
      }

      i += 1;
    }

    const exponentPart = expression.slice(start, i).trim();
    if (sawSign && exponentPart) {
      output += `(${exponentPart})`;
    } else {
      output += exponentPart;
    }
  }

  return output;
}

function isNumericToken(token) {
  return /^(\d*\.?\d+)$/.test(token);
}

function isIdentifierToken(token) {
  return /^[A-Za-z_]\w*$/.test(token);
}

function isFunctionName(token) {
  const lower = token.toLowerCase();
  return (
    lower === "sin" ||
    lower === "cos" ||
    lower === "tan" ||
    lower === "abs" ||
    lower === "sqrt" ||
    lower === "pow" ||
    lower === "exp" ||
    lower === "log" ||
    lower === "min" ||
    lower === "max"
  );
}

function shouldInsertMultiply(leftToken, rightToken) {
  if (!leftToken || !rightToken) return false;
  if (leftToken === "," || rightToken === ",") return false;
  if (rightToken === ")") return false;
  if (leftToken === "(") return false;
  if (leftToken === "**" || rightToken === "**") return false;

  const leftCanEnd =
    isNumericToken(leftToken) || isIdentifierToken(leftToken) || leftToken === ")";
  const rightCanStart =
    isNumericToken(rightToken) || isIdentifierToken(rightToken) || rightToken === "(";

  if (!leftCanEnd || !rightCanStart) return false;
  if (isFunctionName(leftToken) && rightToken === "(") return false;
  if (isIdentifierToken(leftToken) && isIdentifierToken(rightToken)) return false;
  return true;
}

function insertImplicitMultiplication(expression) {
  const tokens = tokenizeExpression(expression);
  if (tokens.length === 0) return expression;

  const withImplicitMultiply = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const previous = withImplicitMultiply[withImplicitMultiply.length - 1];
    if (shouldInsertMultiply(previous, token)) {
      withImplicitMultiply.push("*");
    }
    withImplicitMultiply.push(token);
  }
  return withImplicitMultiply.join("");
}

export function compileCustomFormula(rawExpression) {
  const expression = String(rawExpression ?? "").trim();

  if (!expression) {
    return {
      evaluator: null,
      error: "Enter a formula for custom waveform (example: sin(t) + 0.5*sin(2*t)).",
    };
  }

  if (!/^[0-9+\-*/^().,\sA-Za-z]*$/.test(expression)) {
    return {
      evaluator: null,
      error: "Formula contains unsupported characters.",
    };
  }

  const identifierMatches = expression.match(/[A-Za-z_]\w*/g) ?? [];
  const identifiers = identifierMatches.map((identifier) => identifier.toLowerCase());
  const hasUnknownIdentifiers = identifiers.some(
    (name) => !ALLOWED_IDENTIFIER_SET.has(name.toLowerCase())
  );

  if (hasUnknownIdentifiers) {
    return {
      evaluator: null,
      error:
        "Only t/x/y and math functions are allowed (sin, cos, tan, abs, sqrt, pow, exp, log, min, max, pi, e).",
    };
  }

  const normalizedExpression = normalizeExpression(expression);

  try {
    const compiled = new Function(
      "t",
      "x",
      "y",
      "sin",
      "cos",
      "tan",
      "abs",
      "sqrt",
      "pow",
      "exp",
      "log",
      "min",
      "max",
      "pi",
      "e",
      `"use strict"; return (${normalizedExpression});`
    );

    const evaluator = (t) =>
      compiled(
        t,
        t,
        t,
        Math.sin,
        Math.cos,
        Math.tan,
        Math.abs,
        Math.sqrt,
        Math.pow,
        Math.exp,
        Math.log,
        Math.min,
        Math.max,
        Math.PI,
        Math.E
      );

    const testValue = evaluator(0.123);
    if (!Number.isFinite(Number(testValue))) {
      return {
        evaluator: null,
        error: "Formula must evaluate to a finite number.",
      };
    }

    return { evaluator, error: "" };
  } catch {
    return {
      evaluator: null,
      error: "Invalid formula syntax. Check parentheses and operators.",
    };
  }
}

export function evaluateWave({
  waveform,
  t,
  frequency,
  amplitude,
  phase,
  customEvaluator = null,
}) {
  const angle = 2 * Math.PI * frequency * t + phase;

  if (waveform === "sine") {
    return amplitude * Math.sin(angle);
  }

  if (waveform === "cosine") {
    return amplitude * Math.cos(angle);
  }

  if (waveform === "square") {
    return amplitude * (Math.sin(angle) >= 0 ? 1 : -1);
  }

  if (waveform === "custom" && customEvaluator) {
    try {
      const normalizedT = angle;
      const value = Number(customEvaluator(normalizedT));
      return Number.isFinite(value) ? amplitude * value : 0;
    } catch {
      return 0;
    }
  }

  // fallback
  return 0;
}

export function generateWaveSamples({
  waveform,
  frequency,
  amplitude,
  phase,
  customEvaluator = null,
  sampleCount = 200,
  duration = 0.02, // seconds shown in preview window
}) {
  const points = [];

  for (let i = 0; i < sampleCount; i += 1) {
    const t = (i / (sampleCount - 1)) * duration;
    const y = evaluateWave({
      waveform,
      t,
      frequency,
      amplitude,
      phase,
      customEvaluator,
    });
    points.push({ t, y });
  }

  return points;
}