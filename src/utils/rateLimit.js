// ── Account-creation rate limit (UX gate, not a security boundary) ──────
//
// Real protection MUST live on the server. Supabase already provides
// per-IP rate limits in its Auth settings. This file adds a friendly
// client-side cap (max 3 signups per hour from this browser) so users
// don't accidentally trigger the server limit and get a confusing 429.

const KEY    = "signup-attempts-v1";
const WINDOW = 60 * 60 * 1000; // 1 hour
const LIMIT  = 3;

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? []; } catch { return []; }
}

function write(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {}
}

export function canSignUp() {
  const now = Date.now();
  return read().filter((t) => now - t < WINDOW).length < LIMIT;
}

export function recordSignupAttempt() {
  const now = Date.now();
  const fresh = read().filter((t) => now - t < WINDOW);
  fresh.push(now);
  write(fresh);
}

export function timeUntilNextSignup() {
  const now    = Date.now();
  const fresh  = read().filter((t) => now - t < WINDOW);
  if (fresh.length < LIMIT) return 0;
  const oldest = Math.min(...fresh);
  return Math.max(0, WINDOW - (now - oldest));
}
