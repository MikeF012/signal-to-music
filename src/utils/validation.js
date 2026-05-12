// ── Form validation helpers ──────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value) {
  const v = (value ?? "").trim();
  if (!v)                return "Email is required.";
  if (v.length > 254)    return "Email is too long.";
  if (!EMAIL_RE.test(v)) return "Enter a valid email address.";
  return "";
}

export function validatePassword(value, opts = { minLength: 8 }) {
  const v = value ?? "";
  if (!v)                          return "Password is required.";
  if (v.length < opts.minLength)   return `Password must be at least ${opts.minLength} characters.`;
  if (v.length > 200)              return "Password is too long.";
  return "";
}

export function validateDisplayName(value) {
  const v = (value ?? "").trim();
  if (!v)             return "Display name is required.";
  if (v.length < 2)   return "Name must be at least 2 characters.";
  if (v.length > 40)  return "Name must be 40 characters or less.";
  if (!/^[\w\s'-]+$/u.test(v)) return "Name has invalid characters.";
  return "";
}

export function validateSongName(value) {
  const v = (value ?? "").trim();
  if (!v)            return "Name is required.";
  if (v.length > 80) return "Name must be 80 characters or less.";
  return "";
}
