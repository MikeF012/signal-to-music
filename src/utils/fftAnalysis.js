// ── FFT-based wave analysis utilities ────────────────────────────────────
//
// Given a buffer of recorded float32 samples, identify:
//   1. dominant fundamental frequency
//   2. probable wave shape (sine / square / triangle / sawtooth)
//   3. amplitude envelope (peak rms)
//   4. a human-readable approximate math function
//
// We use a real FFT (Cooley–Tukey, radix-2) on a power-of-two slice. The
// implementation favours correctness and readability over raw speed since
// analysis runs once per recording, not per frame.

// ── Minimal in-place radix-2 FFT (real → complex) ────────────────────────

function fftRadix2(real, imag) {
  const n = real.length;
  if ((n & (n - 1)) !== 0) throw new Error("FFT length must be a power of 2");

  // Bit reversal
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wlenC = Math.cos(ang);
    const wlenS = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wC = 1, wS = 0;
      for (let k = 0; k < len / 2; k++) {
        const uR = real[i + k];
        const uI = imag[i + k];
        const vR = real[i + k + len / 2] * wC - imag[i + k + len / 2] * wS;
        const vI = real[i + k + len / 2] * wS + imag[i + k + len / 2] * wC;
        real[i + k] = uR + vR;
        imag[i + k] = uI + vI;
        real[i + k + len / 2] = uR - vR;
        imag[i + k + len / 2] = uI - vI;
        const tC = wC * wlenC - wS * wlenS;
        wS = wC * wlenS + wS * wlenC;
        wC = tC;
      }
    }
  }
}

function nextPow2BelowOrEqual(n) {
  let p = 1;
  while ((p << 1) <= n) p <<= 1;
  return p;
}

// Hann window — reduces spectral leakage
function hann(n) {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

// ── Main analysis function ───────────────────────────────────────────────

export function analyzeRecording(samples, sampleRate) {
  if (!samples || samples.length < 64) return emptyResult();

  // 1. Pick a window centred on the loudest part
  const winLen = Math.min(8192, nextPow2BelowOrEqual(samples.length));
  const start  = findLoudestWindowStart(samples, winLen);
  const slice  = samples.slice(start, start + winLen);
  const w      = hann(winLen);

  const real = new Float32Array(winLen);
  const imag = new Float32Array(winLen);
  for (let i = 0; i < winLen; i++) real[i] = slice[i] * w[i];

  fftRadix2(real, imag);

  // Magnitude spectrum (only first half)
  const mags  = new Float32Array(winLen / 2);
  let maxMag  = 0;
  for (let i = 0; i < mags.length; i++) {
    const m = Math.hypot(real[i], imag[i]);
    mags[i] = m;
    if (m > maxMag) maxMag = m;
  }

  if (maxMag < 1e-6) return emptyResult();

  // 2. Find dominant peak above 30 Hz to ignore DC / hum
  const minBin = Math.max(2, Math.floor((30 * winLen) / sampleRate));
  let fundBin = minBin;
  let fundMag = 0;
  for (let i = minBin; i < mags.length; i++) {
    if (mags[i] > fundMag) { fundMag = mags[i]; fundBin = i; }
  }
  const fundamentalHz = (fundBin * sampleRate) / winLen;

  // 3. Sample harmonics 1..6 (at fundBin, 2·fundBin, …)
  const harmonics = [];
  for (let n = 1; n <= 6; n++) {
    const bin = fundBin * n;
    if (bin >= mags.length) break;
    harmonics.push({
      n,
      amp:  mags[bin] / fundMag,
      freq: (bin * sampleRate) / winLen,
    });
  }

  // 4. Classify shape from harmonic ratios
  const shape = classifyShape(harmonics);

  // 5. Amplitude envelope = peak abs sample value over whole buffer
  let envelope = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > envelope) envelope = a;
  }

  // 6. Build a human-readable math function (terms ranked by amplitude)
  const terms = harmonics
    .filter((h) => h.amp >= 0.08)
    .slice(0, 4)
    .map((h) => ({
      coefficient: parseFloat((h.amp * envelope).toFixed(3)),
      frequency:   parseFloat(h.freq.toFixed(2)),
      n:           h.n,
    }));

  if (terms.length === 0) {
    terms.push({ coefficient: parseFloat(envelope.toFixed(3)), frequency: parseFloat(fundamentalHz.toFixed(2)), n: 1 });
  }

  const formula = formatFormula(terms);

  return {
    fundamentalHz: parseFloat(fundamentalHz.toFixed(2)),
    shape,
    envelope: parseFloat(envelope.toFixed(3)),
    terms,
    formula,
  };
}

function emptyResult() {
  return {
    fundamentalHz: 0,
    shape: "silence",
    envelope: 0,
    terms: [],
    formula: "f(t) = 0",
  };
}

function findLoudestWindowStart(samples, winLen) {
  if (samples.length <= winLen) return 0;
  const stride = Math.max(1, Math.floor(winLen / 4));
  let best = 0;
  let bestEnergy = 0;
  for (let s = 0; s + winLen <= samples.length; s += stride) {
    let e = 0;
    for (let i = 0; i < winLen; i++) e += samples[s + i] * samples[s + i];
    if (e > bestEnergy) { bestEnergy = e; best = s; }
  }
  return best;
}

function classifyShape(harmonics) {
  if (harmonics.length === 0) return "silence";
  const h2 = harmonics[1]?.amp ?? 0;
  const h3 = harmonics[2]?.amp ?? 0;
  const h4 = harmonics[3]?.amp ?? 0;
  const h5 = harmonics[4]?.amp ?? 0;

  // Sine: only fundamental, almost no harmonics
  if (h2 < 0.10 && h3 < 0.10) return "sine";

  // Square: strong odd harmonics, weak even harmonics
  if (h3 > 0.20 && h2 < 0.20 && h5 > 0.10) return "square";

  // Triangle: weak odd harmonics, decreasing as 1/n²
  if (h3 > 0.05 && h3 < 0.20 && h2 < 0.10) return "triangle";

  // Sawtooth: all harmonics present, decreasing as 1/n
  if (h2 > 0.20 && h3 > 0.15 && h4 > 0.10) return "sawtooth";

  return "complex";
}

function formatFormula(terms) {
  // f(t) = c1·sin(2π·f1·t) + c2·sin(2π·f2·t) + …
  const parts = terms.map((t, i) => {
    const sign = i === 0 ? "" : (t.coefficient < 0 ? " - " : " + ");
    const c    = Math.abs(t.coefficient).toFixed(2);
    return `${sign}${c}·sin(2π·${t.frequency.toFixed(1)}·t)`;
  });
  return `f(t) = ${parts.join("")}`;
}

// Stepwise reveal: returns an array of partial formulas, one term at a time
export function buildProgressiveFormula(terms) {
  const out = [];
  for (let i = 0; i < terms.length; i++) {
    out.push(formatFormula(terms.slice(0, i + 1)));
  }
  return out;
}
