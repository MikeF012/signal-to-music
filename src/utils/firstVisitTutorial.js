/** localStorage gate for showing the introductory tour once per browser/profile. */

/** Primary storage key — value non-null means the user finished/skipped intro at least once. */
export const HAS_SEEN_TUTORIAL_KEY = "signal-hasSeenTutorial";

/** Older / informal name — still honored for migrations and testers who set it manually. */
export const LEGACY_HAS_SEEN_TUTORIAL_KEY = "hasSeenTutorial";

function tutorialFlagPresent() {
  try {
    return (
      localStorage.getItem(HAS_SEEN_TUTORIAL_KEY) != null ||
      localStorage.getItem(LEGACY_HAS_SEEN_TUTORIAL_KEY) != null
    );
  } catch {
    return true;
  }
}

/** True once any known flag exists (user is not “first visit” anymore). */
export function hasCompletedFirstTutorial() {
  return tutorialFlagPresent();
}

export function markFirstTutorialSeen() {
  try {
    localStorage.setItem(HAS_SEEN_TUTORIAL_KEY, "1");
    localStorage.removeItem(LEGACY_HAS_SEEN_TUTORIAL_KEY);
  } catch {
    /* ignore */
  }
}

/** Clear all known flags — next load triggers auto-intro; also use Settings → “Show intro again”. */
export function resetFirstTutorialFlagForTesting() {
  try {
    localStorage.removeItem(HAS_SEEN_TUTORIAL_KEY);
    localStorage.removeItem(LEGACY_HAS_SEEN_TUTORIAL_KEY);
  } catch {
    /* ignore */
  }
}
