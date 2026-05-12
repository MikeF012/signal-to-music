const KEY = "signal-local-songs-v1";

export function readLocalSongs() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? []; } catch { return []; }
}

export function writeLocalSongs(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch {}
}
