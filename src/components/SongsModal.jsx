import React, { useMemo, useState } from "react";
import Modal from "./Modal";
import { FREE_MAX_DURATION_SEC, FREE_MAX_SONGS } from "../hooks/useCloudSongs";
import { readLocalSongs, writeLocalSongs } from "../utils/localSongs";

function fmtDuration(sec) {
  if (!sec || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtBytes(n) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDate(ts) {
  try { return new Date(ts).toLocaleDateString(); } catch { return "—"; }
}

export default function SongsModal({
  open,
  onClose,
  user,
  cloudSongs = [],
  cloudTotalDuration = 0,
  cloudSyncing = false,
  onDeleteCloud,
  onLoadProject,            // (projectData) => void
  onPreviewProject,         // (projectData) => void  — show in PlaybackReview
  onBackUpToCloud,          // (localSong) => Promise — copy to cloud
  isPremium = false,
  onOpenAuth,
}) {
  const [tab,    setTab]    = useState(user ? "cloud" : "device");
  const [query,  setQuery]  = useState("");
  const [sortBy, setSortBy] = useState("date"); // "date" | "name"
  const [busy,   setBusy]   = useState("");
  const [errMsg, setErrMsg] = useState("");

  const localSongs = readLocalSongs();

  const filtered = useMemo(() => {
    const list = tab === "cloud" ? cloudSongs : localSongs;
    const q    = query.trim().toLowerCase();
    const f    = q ? list.filter((s) => (s.name ?? "").toLowerCase().includes(q)) : list.slice();
    if (sortBy === "name") f.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    else f.sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));
    return f;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, query, sortBy, cloudSongs, localSongs.length]);

  function handleDeleteLocal(id) {
    if (!confirm("Delete this song from this device?")) return;
    writeLocalSongs(readLocalSongs().filter((s) => s.id !== id));
    setErrMsg("");
    setBusy(""); // force re-render via tab change trick:
    setTab((t) => t);
  }

  async function handleDeleteCloud(id) {
    if (!confirm("Delete this cloud song?")) return;
    setBusy("del-" + id);
    try { await onDeleteCloud?.(id); } catch (e) { setErrMsg(e.message ?? "Delete failed."); }
    setBusy("");
  }

  async function handleBackUp(localSong) {
    setBusy("up-" + localSong.id);
    setErrMsg("");
    try { await onBackUpToCloud?.(localSong); }
    catch (e) { setErrMsg(e.message ?? "Backup failed."); }
    setBusy("");
  }

  return (
    <Modal open={open} onClose={onClose} title="My Saved Songs" size="xl">
      <div className="songs-tabs">
        <button
          type="button"
          className={`auth-tab${tab === "device" ? " active" : ""}`}
          onClick={() => setTab("device")}
        >
          On Device ({localSongs.length})
        </button>
        <button
          type="button"
          className={`auth-tab${tab === "cloud" ? " active" : ""}`}
          onClick={() => setTab("cloud")}
        >
          Cloud {user ? `(${cloudSongs.length})` : "(sign in)"}
        </button>
      </div>

      <div className="songs-toolbar">
        <input
          className="auth-input songs-search"
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="songs-sort">
          Sort by:
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="auth-input">
            <option value="date">Date</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      {errMsg && <p className="auth-modal-msg error">{errMsg}</p>}

      {/* Tab body */}
      {tab === "cloud" && !user && (
        <div className="songs-empty">
          <p>Sign in to view your cloud library.</p>
          <button className="hw-btn hw-btn-md active" onClick={onOpenAuth}>Sign In</button>
        </div>
      )}

      {tab === "cloud" && user && (
        <>
          {!isPremium && (
            <p className="songs-quota">
              {cloudSongs.length} / {FREE_MAX_SONGS} songs · {(cloudTotalDuration / 60).toFixed(1)} / {(FREE_MAX_DURATION_SEC / 60).toFixed(0)} min total
            </p>
          )}
          {cloudSyncing && <p className="settings-fine">Syncing…</p>}
          {filtered.length === 0
            ? <p className="songs-empty">No cloud saves yet.</p>
            : <SongList items={filtered} kind="cloud" busy={busy} onLoad={onLoadProject} onPreview={onPreviewProject} onDelete={handleDeleteCloud} />}
        </>
      )}

      {tab === "device" && (
        <>
          <p className="songs-fine">
            Local saves stay on this device only. Back up to the cloud to access them anywhere.
          </p>
          {filtered.length === 0
            ? <p className="songs-empty">No songs saved on this device yet.</p>
            : <SongList
                items={filtered}
                kind="device"
                busy={busy}
                onLoad={onLoadProject}
                onPreview={onPreviewProject}
                onDelete={handleDeleteLocal}
                onBackUp={user ? handleBackUp : null}
              />}
        </>
      )}
    </Modal>
  );
}

// ── Inline SongList ───────────────────────────────────────────────────────
function SongList({ items, kind, busy, onLoad, onPreview, onDelete, onBackUp }) {
  return (
    <ul className="songs-list">
      {items.map((s) => (
        <li key={s.id} className="songs-item">
          <div className="songs-item-main">
            <div className="songs-item-title">{s.name ?? "untitled"}</div>
            <div className="songs-item-meta">
              <span>{fmtDate(s.createdAt)}</span>
              <span>{fmtDuration(s.duration)}</span>
              {s.decade && <span className="songs-item-decade">{s.decade}</span>}
              {kind === "cloud" && s.sizeBytes != null && <span>{fmtBytes(s.sizeBytes)}</span>}
            </div>
          </div>
          <div className="songs-item-actions">
            <button className="hw-btn hw-btn-sm" title="Preview" onClick={() => onPreview?.(s.data)}>▶</button>
            <button className="hw-btn hw-btn-sm" title="Open in DAW" onClick={() => onLoad?.(s.data)}>Open</button>
            {onBackUp && (
              <button
                className="hw-btn hw-btn-sm"
                title="Back up to cloud"
                onClick={() => onBackUp(s)}
                disabled={busy === "up-" + s.id}
              >☁</button>
            )}
            <button
              className="hw-btn hw-btn-sm danger"
              title="Delete"
              onClick={() => onDelete?.(s.id)}
              disabled={busy === "del-" + s.id}
            >×</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
