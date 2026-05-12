import React, { useState } from "react";
import { supabaseEnabled } from "../lib/supabase";

export default function PresetPanel({
  // Local (built-ins + localStorage)
  presets,
  onSaveLocal,
  onLoadPresetData,
  onDeleteLocal,

  // Cloud (Supabase)
  user,
  cloudPresets,
  syncing,
  syncError,
  onSaveCloud,
  onDeleteCloud,
  onMigrateToCloud,

  // Helpers
  getPresetData,
  onOpenAuth,
  onLogout,
}) {
  const [saveName, setSaveName]     = useState("");
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState("");
  const [migrating, setMigrating]   = useState(false);

  const localOnly = presets.filter((p) => !p.isBuiltIn);
  const builtIns  = presets.filter((p) =>  p.isBuiltIn);

  async function handleSave() {
    const name = saveName.trim();
    if (!name) { setSaveError("Enter a name first."); return; }
    setSaveError(""); setSaving(true);
    try {
      if (user && supabaseEnabled) {
        await onSaveCloud(name, getPresetData());
      } else {
        onSaveLocal(name);
      }
      setSaveName("");
    } catch (err) {
      setSaveError(err.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMigrate() {
    setMigrating(true);
    try { await onMigrateToCloud(presets); }
    catch (err) { setSaveError(err.message ?? "Migration failed."); }
    finally { setMigrating(false); }
  }

  function PresetList({ items, onLoad, onDelete, canDelete }) {
    return (
      <ul className="preset-list">
        {items.map((p) => (
          <li key={p.id} className="preset-list-item">
            <button
              type="button"
              className="preset-list-name"
              onClick={() => onLoad(p.data)}
              title={`Load "${p.name}"`}
            >
              {p.name}
            </button>
            {canDelete && !p.isBuiltIn && (
              <button
                type="button"
                className="preset-list-del"
                onClick={() => onDelete(p.id)}
                title="Delete"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="panel preset-panel">
      {/* Auth bar */}
      <div className="preset-auth-bar">
        <h2 className="panel-title" style={{ margin: 0 }}>Presets</h2>
        {user ? (
          <div className="preset-auth-info">
            <span className="preset-auth-email" title={user.email}>{user.email}</span>
            <button type="button" className="preset-auth-btn" onClick={onLogout}>Sign Out</button>
          </div>
        ) : (
          <button
            type="button"
            className="preset-auth-btn"
            onClick={onOpenAuth}
            title={supabaseEnabled ? "Sign in for cloud presets" : "Supabase not configured"}
          >
            {supabaseEnabled ? "☁ Sign In" : "☁ (not configured)"}
          </button>
        )}
      </div>

      {/* Save row — auto-routes to cloud or local */}
      <div className="preset-save-row">
        <input
          className="custom-formula-input"
          type="text"
          placeholder={user ? "Save to cloud…" : "Save preset name…"}
          value={saveName}
          onChange={(e) => { setSaveName(e.target.value); setSaveError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
        />
        <button
          type="button"
          className="waveform-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "…" : user ? "☁ Save" : "Save"}
        </button>
      </div>
      {saveError && <p className="custom-formula-error">{saveError}</p>}

      {/* ── Built-in presets ── */}
      <p className="preset-section-label">Built-in</p>
      <PresetList
        items={builtIns}
        onLoad={(data) => onLoadPresetData(data)}
        onDelete={() => {}}
        canDelete={false}
      />

      {/* ── Local saved presets ── */}
      {localOnly.length > 0 && (
        <>
          <p className="preset-section-label">Local</p>
          <PresetList
            items={localOnly}
            onLoad={(data) => onLoadPresetData(data)}
            onDelete={(id) => onDeleteLocal(id)}
            canDelete
          />
        </>
      )}

      {/* ── Cloud presets (logged in only) ── */}
      {user && supabaseEnabled && (
        <>
          <div className="preset-section-header">
            <p className="preset-section-label" style={{ margin: 0 }}>Cloud</p>
            {syncing && <span className="preset-sync-badge">syncing…</span>}
          </div>
          {syncError && <p className="custom-formula-error">{syncError}</p>}

          {cloudPresets.length === 0 && !syncing && (
            <p className="preset-empty">No cloud presets yet.</p>
          )}

          {cloudPresets.length > 0 && (
            <PresetList
              items={cloudPresets}
              onLoad={(data) => onLoadPresetData(data)}
              onDelete={(id) => onDeleteCloud(id)}
              canDelete
            />
          )}

          {localOnly.length > 0 && (
            <button
              type="button"
              className="waveform-button"
              style={{ marginTop: 8, width: "100%", fontSize: ".7rem" }}
              onClick={handleMigrate}
              disabled={migrating}
              title="Copy all local saved presets to your cloud account"
            >
              {migrating ? "Uploading…" : "↑ Upload local presets to cloud"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
