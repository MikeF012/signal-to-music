/** Tutorial gate: show on every cold start until the user signs in or skips (localStorage). */

export const TUTORIAL_SKIPPED_KEY = "tutorialSkipped";

/** Primary legacy key — still honored so existing users are not forced through the tour again. */
export const HAS_SEEN_TUTORIAL_KEY = "signal-hasSeenTutorial";

/** Older / informal name — still honored for migrations. */
export const LEGACY_HAS_SEEN_TUTORIAL_KEY = "hasSeenTutorial";

function readBool(key) {
  try {
    return localStorage.getItem(key) === "true" || localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** True if any “do not auto-show tutorial” local flag is set. */
export function isTutorialPermanentlySkippedLocally() {
  try {
    return (
      readBool(TUTORIAL_SKIPPED_KEY) ||
      localStorage.getItem(HAS_SEEN_TUTORIAL_KEY) != null ||
      localStorage.getItem(LEGACY_HAS_SEEN_TUTORIAL_KEY) != null
    );
  } catch {
    return true;
  }
}

/**
 * After account step or any final dismiss — tour should not auto-open on next boot.
 */
export function markTutorialSkipped() {
  try {
    localStorage.setItem(TUTORIAL_SKIPPED_KEY, "true");
    localStorage.setItem(HAS_SEEN_TUTORIAL_KEY, "1");
    localStorage.removeItem(LEGACY_HAS_SEEN_TUTORIAL_KEY);
  } catch {
    /* ignore */
  }
}

/** Testing / settings: clear flags so the introduction can run again immediately. */
export function resetTutorialFlagsForTesting() {
  try {
    localStorage.removeItem(TUTORIAL_SKIPPED_KEY);
    localStorage.removeItem(HAS_SEEN_TUTORIAL_KEY);
    localStorage.removeItem(LEGACY_HAS_SEEN_TUTORIAL_KEY);
  } catch {
    /* ignore */
  }
}

/** @deprecated Use isTutorialPermanentlySkippedLocally */
export function hasCompletedFirstTutorial() {
  return isTutorialPermanentlySkippedLocally();
}

/** @deprecated Use markTutorialSkipped */
export function markFirstTutorialSeen() {
  markTutorialSkipped();
}

/** @deprecated Use resetTutorialFlagsForTesting */
export function resetFirstTutorialFlagForTesting() {
  resetTutorialFlagsForTesting();
}

/**
 * Show the guided tour on boot when the user is anonymous and has not skipped.
 * `client` should be the Supabase client or null when auth is disabled.
 */
export async function shouldAutoPlayTutorialOnBoot(client) {
  if (isTutorialPermanentlySkippedLocally()) return false;
  if (!client) return true;
  try {
    const { data } = await client.auth.getSession();
    if (data?.session) return false;
  } catch {
    /* if session check fails, still allow intro */
  }
  return true;
}
