// ── Project file (.signal JSON) — save and open ──────────────────────────

export const PROJECT_FILE_VERSION = 1;
export const PROJECT_FILE_EXT     = "signal";

export function projectFromState(state, extras = {}) {
  return {
    type:    "signal-project",
    version: PROJECT_FILE_VERSION,
    name:    state.projectName ?? "untitled",
    decade:  extras.decade ?? "2010s",
    bpm:     state.bpm,
    masterVolume: state.masterVolume,
    duration: getProjectDuration(state),
    createdAt: new Date().toISOString(),
    tracks: state.tracks.map((t) => ({
      ...t,
      blocks: t.blocks.map((b) => ({ ...b })),
      // Note: recordedSamples are dropped — too large for JSON. Custom-sound
      // blocks reference a sound id that lives in customSounds.
      recordedSamples:    undefined,
      recordedSampleRate: undefined,
      customEvaluator:    undefined,
      formulaError:       undefined,
    })),
  };
}

export function getProjectDuration(state) {
  let end = 0;
  for (const t of state.tracks) {
    for (const b of t.blocks) {
      const e = (b.startTime ?? 0) + (b.duration ?? 0);
      if (e > end) end = e;
    }
  }
  return end;
}

export function downloadProjectFile(state, extras = {}) {
  const proj = projectFromState(state, extras);
  const blob = new Blob([JSON.stringify(proj, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const safe = (proj.name || "untitled").replace(/[^a-z0-9_-]+/gi, "-");
  a.href     = url;
  a.download = `${safe}.${PROJECT_FILE_EXT}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return proj;
}

export function readProjectFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error("No file selected.")); return; }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("File too large (max 8 MB)."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data?.type !== "signal-project") throw new Error("Not a Signal project file.");
        if (!Array.isArray(data.tracks))    throw new Error("Invalid project (missing tracks).");
        resolve(data);
      } catch (err) {
        reject(new Error("Could not read file: " + err.message));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

// Approximate JSON byte size for storage tracking
export function estimateProjectSizeBytes(project) {
  try { return new Blob([JSON.stringify(project)]).size; } catch { return 0; }
}
