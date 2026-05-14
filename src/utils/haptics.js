/**
 * Haptics: prefers @capacitor/haptics when available (native shells),
 * falls back to navigator.vibrate on the web/PWA.
 */
export async function hapticImpact(style /* "Light" | "Medium" | "Heavy" */) {
  try {
    const cap = await import("@capacitor/haptics");
    const { ImpactStyle } = cap;
    const map = {
      Light:  ImpactStyle.Light,
      Medium: ImpactStyle.Medium,
      Heavy:  ImpactStyle.Heavy,
    };
    await cap.Haptics.impact({ style: map[style] ?? ImpactStyle.Light });
  } catch {
    const ms = style === "Medium" ? 22 : style === "Heavy" ? [18, 30, 18] : 12;
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
  }
}

export function hapticLight() { return hapticImpact("Light"); }
export function hapticMedium() { return hapticImpact("Medium"); }
export async function hapticSuccess() {
  try {
    const cap = await import("@capacitor/haptics");
    await cap.Haptics.notification({ type: cap.NotificationType.Success });
  } catch {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([12, 40, 12]);
  }
}
