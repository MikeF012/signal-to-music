import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useDAWState }       from "./state/useDAWState";
import { useAuth }           from "./hooks/useAuth";
import { useCloudPresets }   from "./hooks/useCloudPresets";
import { useCloudSongs }     from "./hooks/useCloudSongs";
import { usePreferences }    from "./hooks/usePreferences";
import { useOnlineStatus }   from "./hooks/useOnlineStatus";
import { compileCustomFormula } from "./math/waveMath";
import {
  initAudio, startPlayback, stopPlayback, seekTo,
  startRecording, stopRecording,
  updateEngine, disposeAudio, getAnalyser,
  setEngineLoop, setMetronome, scheduleCountIn,
  getPlayheadTime,
} from "./audio/toneEngine";
import {
  downloadProjectFile, projectFromState, readProjectFile,
  estimateProjectSizeBytes, getProjectDuration,
} from "./utils/projectFile";

import { hasCompletedFirstTutorial, markFirstTutorialSeen, resetFirstTutorialFlagForTesting } from "./utils/firstVisitTutorial";
import { supabaseEnabled } from "./lib/supabase";

// ── Always-visible core UI (eager) ────────────────────────────────────────
import MasterVisualizer  from "./components/MasterVisualizer";
import TransportBar      from "./components/TransportBar";
import Timeline          from "./components/Timeline";
import TrackEditor       from "./components/TrackEditor";
import AvatarMenu        from "./components/AvatarMenu";
import OfflineBadge      from "./components/OfflineBadge";
import PortraitGate      from "./components/PortraitGate";
import BlockSelectionHint from "./components/BlockSelectionHint";

// ── Modals and panels — lazy loaded so they don't bloat the initial bundle ─
const AuthModal           = React.lazy(() => import("./components/AuthModal"));
const PresetPanel         = React.lazy(() => import("./components/PresetPanel"));
const SettingsModal       = React.lazy(() => import("./components/SettingsModal"));
const SongsModal          = React.lazy(() => import("./components/SongsModal"));
const OnboardingModal     = React.lazy(() => import("./components/OnboardingModal"));
const MicRecorderModal    = React.lazy(() => import("./components/MicRecorderModal"));
const PlaybackReviewModal = React.lazy(() => import("./components/PlaybackReviewModal"));
const TutorialTour           = React.lazy(() => import("./components/TutorialTour"));

import { MAX_TRACKS }    from "./utils/ranges";
import { beatDurationSeconds } from "./utils/gridSnap";
import { useTouchUi } from "./context/TouchUiContext";
import SynthChipTouchPreview from "./components/SynthChipTouchPreview";
import { hapticLight, hapticMedium, hapticSuccess } from "./utils/haptics";
import "./styles/app.css";

export default function App() {
  const { state, actions } = useDAWState();
  const { user, loading: authLoading, login, signup, logout, resetPassword, updatePassword, updateProfile, deleteAccount } = useAuth();
  const { prefs, setPrefs } = usePreferences(user);
  const online              = useOnlineStatus();

  const {
    cloudPresets, syncing: presetsSyncing, syncError: presetsErr,
    saveCloudPreset, deleteCloudPreset, migrateLocalPresets,
  } = useCloudPresets(user);

  const {
    songs: cloudSongs, syncing: songsSyncing,
    totalDuration: cloudTotalDuration,
    saveSong: saveCloudSong, deleteSong: deleteCloudSong, checkLimits: checkCloudLimits,
  } = useCloudSongs(user, prefs.isPremium);

  const touchUi = useTouchUi();
  const timelineRef = useRef(null);
  const synthTouchPayloadRef = useRef(null); // { waveType, customFormula }
  const [synthTouchOverlay, setSynthTouchOverlay] = useState(null); // floating chip while dragging from panel

  // ── UI state ─────────────────────────────────────────────────────────
  const [showAuth,        setShowAuth]        = useState(false);
  const [showPresets,     setShowPresets]     = useState(false);
  const [showSettings,    setShowSettings]    = useState(false);
  const [showSongs,       setShowSongs]       = useState(false);
  const [showMic,         setShowMic]         = useState(false);
  const [showOnboard,     setShowOnboard]     = useState(false);
  const [showTour,        setShowTour]        = useState(false);
  const [analyser,        setAnalyser]        = useState(null);
  const [countIn,         setCountIn]         = useState(null);
  const [recordedReview,  setRecordedReview]  = useState(null); // { blob, duration, extension?, mime? }
  const [tourVariant,     setTourVariant]      = useState("choose"); // choose | quick | full

  const sidebarScrollRef = useRef(null);
  const countInTimer     = useRef(null);
  const fileInputRef     = useRef(null);

  // ── Compile track formulas ──────────────────────────────────────────
  const compiledTracks = useMemo(
    () => state.tracks.map((t) => {
      if (t.waveform === "custom") {
        const { evaluator, error } = compileCustomFormula(t.customFormula);
        return { ...t, customEvaluator: evaluator, formulaError: error };
      }
      return { ...t, customEvaluator: null, formulaError: "" };
    }),
    [state.tracks]
  );

  const selectedTrack = compiledTracks.find((t) => t.id === state.selectedTrackId) ?? null;

  // ── Push to engine + sync decade theme on load ──────────────────────
  useEffect(() => {
    updateEngine({ tracks: compiledTracks, masterVolume: state.masterVolume });
  }, [compiledTracks, state.masterVolume]);

  useEffect(() => {
    if (state.decade !== prefs.decadeTheme) actions.setDecade(prefs.decadeTheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.decadeTheme]);

  // ── Loop sync ────────────────────────────────────────────────────────
  useEffect(() => {
    let loopEnd = 0;
    if (state.loopActive) {
      for (const track of state.tracks)
        for (const block of track.blocks)
          loopEnd = Math.max(loopEnd, block.startTime + block.duration);
    }
    setEngineLoop(state.loopActive, loopEnd);
  }, [state.loopActive, state.tracks]);

  // ── Metronome sync ───────────────────────────────────────────────────
  useEffect(() => {
    if (state.isPlaying) setMetronome(state.metronomActive, state.bpm);
    else                 setMetronome(false, state.bpm);
  }, [state.metronomActive, state.bpm, state.isPlaying]);

  // ── First-run tutorial (localStorage; see utils/firstVisitTutorial)
  useEffect(() => {
    if (hasCompletedFirstTutorial()) return;
    const t = setTimeout(() => {
      setTourVariant("choose");
      setShowTour(true);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function warmup() {
      await initAudio();
      if (!cancelled) setAnalyser(getAnalyser());
    }
    function onOnce() {
      warmup();
      window.removeEventListener("pointerdown", onOnce);
      window.removeEventListener("keydown", onOnce);
    }
    window.addEventListener("pointerdown", onOnce, { passive: true });
    window.addEventListener("keydown", onOnce);
    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onOnce);
      window.removeEventListener("keydown", onOnce);
    };
  }, []);

  // ── First-time onboarding for newly-logged-in users ─────────────────
  useEffect(() => {
    if (!user) return;
    const needsOnboard = !prefs.displayName;
    if (needsOnboard) queueMicrotask(() => setShowOnboard(true));
  }, [user, prefs.displayName]);

  // ── Dismiss loading screen once React has painted ────────────────────
  useEffect(() => {
    const el = document.getElementById("loading-screen");
    if (!el) return;
    el.classList.add("fade-out");
    const t = setTimeout(() => el.remove(), 300);
    return () => clearTimeout(t);
  }, []);

  // ── Cleanup ──────────────────────────────────────────────────────────
  useEffect(() => () => {
    disposeAudio();
    if (countInTimer.current) clearTimeout(countInTimer.current);
  }, []);

  // ── Keyboard shortcut: Space ─────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        state.isPlaying ? handleStop() : handlePlay();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (!state.selectedBlocks?.length) return;
      e.preventDefault();
      actions.deleteSelectedBlocks();
      void hapticMedium();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.selectedBlocks, actions]);

  useEffect(() => {
    if (!synthTouchOverlay?.active) return undefined;

    function move(ev) {
      const dp = timelineRef.current?.resolveDrop(ev.clientX, ev.clientY);
      setSynthTouchOverlay((prev) =>
        prev?.active ? { ...prev, x: ev.clientX, y: ev.clientY, dropPreview: dp } : prev,
      );
    }

    function end(ev) {
      const stash = synthTouchPayloadRef.current;
      synthTouchPayloadRef.current = null;
      setSynthTouchOverlay(null);
      if (!stash) return;
      const drop = timelineRef.current?.resolveDrop(ev.clientX, ev.clientY);
      if (!drop) return;
      actions.addBlock(drop.trackId, drop.time);
      const formulaPatch =
        stash.waveType === "custom" && stash.customFormula
          ? { waveform: "custom", customFormula: stash.customFormula }
          : { waveform: stash.waveType };
      actions.updateTrack(drop.trackId, formulaPatch);
      actions.clearBlockSelection();
      actions.selectTrack(drop.trackId);
      timelineRef.current?.flashLane(drop.trackId);
      void hapticLight();
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [synthTouchOverlay?.active]); // eslint-disable-line react-hooks/exhaustive-deps

  function beginSynthTouchDrag(payload) {
    synthTouchPayloadRef.current = {
      waveType: payload.waveType,
      customFormula: payload.customFormula || "",
    };
    const { clientX: x, clientY: y } = payload;
    const dp = timelineRef.current?.resolveDrop(x, y);
    setSynthTouchOverlay({
      active: true,
      x,
      y,
      previewTrack: payload.previewTrack,
      waveTypeLabel: payload.waveTypeLabel ?? payload.waveType?.toUpperCase?.(),
      waveType: payload.waveType,
      dropPreview: dp,
    });
  }

  function focusSignalPanel(trackId) {
    actions.selectTrack(trackId);
    window.requestAnimationFrame(() => {
      document.querySelector('[data-tour="signal-panel"]')?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }

  function handleDeleteBlock(trackId, blockId) {
    void hapticMedium();
    actions.deleteBlock(trackId, blockId);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Transport
  // ──────────────────────────────────────────────────────────────────────

  async function handlePlay() {
    await initAudio();
    setAnalyser(getAnalyser());
    startPlayback(state.currentTime);
    flushSync(() => {
      actions.setIsPlaying(true);
    });
    if (state.metronomActive) setMetronome(true, state.bpm);
  }

  function handleStop() {
    const savedTime = getPlayheadTime(); // capture engine position before halting
    stopPlayback();
    setMetronome(false, state.bpm);
    actions.setIsPlaying(false);
    actions.setCurrentTime(savedTime);  // persist so Play resumes from here
    if (countInTimer.current) { clearTimeout(countInTimer.current); countInTimer.current = null; }
    setCountIn(null);
  }

  function handleSeek(time) {
    seekTo(time);
    actions.setCurrentTime(time);
  }

  function handleSkipToStart() { handleStop(); handleSeek(0); }
  function handleSkipToEnd() {
    let endTime = 0;
    for (const track of state.tracks)
      for (const block of track.blocks)
        endTime = Math.max(endTime, block.startTime + block.duration);
    handleStop();
    handleSeek(Math.max(0, endTime));
  }

  // ── Record with count-in → review modal on stop ─────────────────────
  async function handleRecord() {
    if (state.isRecording) {
      const result = await stopRecording();
      actions.setIsRecording(false);
      if (result?.blob?.size) {
        setRecordedReview({
          blob: result.blob,
          extension: result.extension,
          mime: result.mime,
          duration: getProjectDuration(state),
        });
      }
      return;
    }

    await initAudio();
    setAnalyser(getAnalyser());
    const dur = scheduleCountIn(state.bpm, 4, (count) => setCountIn(count));
    countInTimer.current = setTimeout(async () => {
      setCountIn(null); countInTimer.current = null;
      if (!state.isPlaying) {
        startPlayback(state.currentTime);
        actions.setIsPlaying(true);
        if (state.metronomActive) setMetronome(true, state.bpm);
      }
      startRecording();
      actions.setIsRecording(true);
    }, dur);
  }

  function handleLoopToggle()      { actions.setLoopActive(!state.loopActive); }
  function handleMetronomToggle()  { actions.setMetronomActive(!state.metronomActive); }

  // ──────────────────────────────────────────────────────────────────────
  // Project save / open
  // ──────────────────────────────────────────────────────────────────────

  /** Export-only — no silent local library mutations. */
  function handleExportProjectJson() {
    downloadProjectFile(state, { decade: prefs.decadeTheme });
    void hapticSuccess();
  }

  async function handleSaveCloudProject() {
    if (!user) {
      alert("Sign in from the account menu to save sessions to Supabase Cloud.");
      return;
    }
    const proj       = projectFromState(state, { decade: prefs.decadeTheme });
    const sizeBytes  = estimateProjectSizeBytes(proj);
    const limit      = checkCloudLimits(proj.duration ?? 0);
    if (!limit.ok) {
      alert(limit.reason ?? "Cannot save — cloud quota.");
      return;
    }
    try {
      await saveCloudSong({
        name:      proj.name,
        data:      proj,
        duration:  proj.duration,
        decade:    proj.decade,
        sizeBytes,
      });
      void hapticSuccess();
    } catch (e) {
      alert(e.message ?? "Cloud save failed.");
    }
  }

  async function handleOpenProjectFile(file) {
    if (!file) return;
    try {
      const project = await readProjectFile(file);
      if (state.isPlaying) handleStop();
      actions.loadProject(project);
      if (project.decade && project.decade !== prefs.decadeTheme) {
        setPrefs({ decadeTheme: project.decade });
      }
    } catch (err) {
      alert(err.message ?? "Could not open project.");
    }
  }

  function pickProjectFile() { fileInputRef.current?.click(); }

  // ──────────────────────────────────────────────────────────────────────
  // Recorded PCM → clips on tracks (never auto-new-track)
  // ──────────────────────────────────────────────────────────────────────

  function handleRecordedClipOnTrack(trackId, sound, atTime) {
    if (!trackId || !sound?.samples?.length) return;
    try {
      const samplesF32 = sound.samples instanceof Float32Array
        ? sound.samples
        : Float32Array.from(sound.samples);
      actions.addRecordedBlockToTrack(
        trackId,
        { ...sound, samples: samplesF32 },
        Math.max(
          0,
          typeof atTime === "number" && Number.isFinite(atTime) ? atTime : (state.currentTime ?? 0)
        )
      );
    } catch (err) {
      console.error("[Signal] Failed to place recorded clip", err);
    }
  }

  function handleMicAddRecordedClip(sound, playheadTime) {
    const trackId = state.selectedTrackId || state.tracks[0]?.id;
    if (!trackId) return;
    handleRecordedClipOnTrack(trackId, sound, playheadTime);
    actions.selectTrack(trackId);
  }
  // ──────────────────────────────────────────────────────────────────────
  // Recorded WAV review → save to device or cloud
  // ──────────────────────────────────────────────────────────────────────

  function handleReviewSaveDevice() {
    if (!recordedReview?.blob) return;
    const date = new Date().toISOString().slice(0, 10);
    const name = (state.projectName || "untitled").replace(/\s+/g, "-");
    const ext  = recordedReview.extension ?? ".wav";
    const url  = URL.createObjectURL(recordedReview.blob);
    const a    = document.createElement("a");
    a.href     = url; a.download = `${name}-${date}${ext}`;
    a.click();
    URL.revokeObjectURL(url);

    setRecordedReview(null);
    void hapticSuccess();
  }

  async function handleReviewSaveCloud() {
    if (!user) throw new Error("Sign in to save to the cloud.");
    const proj      = projectFromState(state, { decade: prefs.decadeTheme });
    const sizeBytes = estimateProjectSizeBytes(proj);
    const limit     = checkCloudLimits(proj.duration ?? 0);
    if (!limit.ok) throw new Error(limit.reason);
    await saveCloudSong({
      name:      proj.name,
      data:      proj,
      duration:  proj.duration,
      decade:    proj.decade,
      sizeBytes,
    });
    setRecordedReview(null);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Preset helpers
  // ──────────────────────────────────────────────────────────────────────
  function getPresetData() {
    return {
      tracks:       state.tracks.map((t) => ({ ...t, blocks: t.blocks.map((b) => ({ ...b })) })),
      bpm:          state.bpm,
      masterVolume: state.masterVolume,
    };
  }
  function handleLoadPresetData(data) {
    if (state.isPlaying) handleStop();
    actions.loadPresetData(data);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Songs modal helpers
  // ──────────────────────────────────────────────────────────────────────
  function handleLoadProject(projectData) {
    if (state.isPlaying) handleStop();
    actions.loadProject(projectData);
    setShowSongs(false);
  }

  async function handleBackUpToCloud(localSong) {
    if (!user) throw new Error("Sign in first.");
    const dur   = localSong.duration ?? 0;
    const limit = checkCloudLimits(dur);
    if (!limit.ok) throw new Error(limit.reason);
    await saveCloudSong({
      name:      localSong.name,
      data:      localSong.data,
      duration:  dur,
      decade:    localSong.decade ?? prefs.decadeTheme,
      sizeBytes: localSong.sizeBytes ?? 0,
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Onboarding completion
  // ──────────────────────────────────────────────────────────────────────
  async function completeOnboarding({ displayName, decade }) {
    setPrefs({ displayName, decadeTheme: decade });
    if (user) { try { await updateProfile({ displayName }); } catch { /* ignore */ } }
    setShowOnboard(false);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Track delete
  // ──────────────────────────────────────────────────────────────────────
  function handleDeleteTrack(trackId, e) {
    e.stopPropagation();
    if (state.isPlaying) handleStop();
    actions.deleteTrack(trackId);
  }

  function clearLocalCache() {
    if (!confirm("Clear local presets saved on this device?")) return;
    try {
      localStorage.removeItem("signal-synth-daw-presets-v1");
      localStorage.removeItem("signal-local-songs-v1");
      window.location.reload();
    } catch { /* ignore */ }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────

  return (
    <div className={`daw decade-${prefs.decadeTheme} daw-shell`} data-decade={prefs.decadeTheme}>
      {/* Hidden file input for Open Project */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.signal,application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          handleOpenProjectFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <OfflineBadge online={online} supabaseEnabled={supabaseEnabled} />
      <PortraitGate decade={prefs.decadeTheme} />

      {synthTouchOverlay?.active && (
        <SynthChipTouchPreview
          waveTypeLabel={synthTouchOverlay.waveTypeLabel}
          waveType={synthTouchOverlay.waveType}
          customFormula=""
          previewTrackStub={synthTouchOverlay.previewTrack}
          x={synthTouchOverlay.x}
          y={synthTouchOverlay.y}
          snappedTimeDisplay={
            synthTouchOverlay.dropPreview
              ? (() => {
                const bd = beatDurationSeconds(state.bpm);
                const t = synthTouchOverlay.dropPreview.time;
                const bn = Math.max(1, Math.round(t / bd) + 1);
                return `Beat ${bn} @ ${t.toFixed(2)}s`;
              })()
              : ""
          }
        />
      )}

      {/* ── Master Visualizer ── */}
      <div className="visualizer-wrap" data-tour="visualizer">
        <MasterVisualizer analyser={analyser} />
      </div>

      {/* ── Transport Bar ── */}
      <TransportBar
        isPlaying={state.isPlaying}
        isRecording={state.isRecording}
        bpm={state.bpm}
        masterVolume={state.masterVolume}
        currentTime={state.currentTime}
        loopActive={state.loopActive}
        metronomActive={state.metronomActive}
        projectName={state.projectName}
        onPlay={handlePlay}
        onStop={handleStop}
        onRecord={handleRecord}
        onSkipToStart={handleSkipToStart}
        onSkipToEnd={handleSkipToEnd}
        onBpmChange={actions.setBpm}
        onVolumeChange={actions.setMasterVolume}
        onZoomIn={() => actions.setZoom(Math.min(320, state.zoom + 20))}
        onZoomOut={() => actions.setZoom(Math.max(20, state.zoom - 20))}
        onLoopToggle={handleLoopToggle}
        onMetronomToggle={handleMetronomToggle}
        onProjectNameChange={actions.setProjectName}
        onOpenMic={() => setShowMic(true)}
        currentDecade={prefs.decadeTheme}
        onDecadeChange={(id) => setPrefs({ decadeTheme: id })}
        rightSlot={
          authLoading ? null : (
            <AvatarMenu
              user={user}
              displayName={prefs.displayName}
              userSignedIn={Boolean(user)}
              onSignIn={() => setShowAuth(true)}
              onSignOut={logout}
              onOpenAccount={() => { setShowSettings(true); }}
              onOpenSettings={() => setShowSettings(true)}
              onOpenSongs={() => setShowSongs(true)}
              onOpenPresets={() => setShowPresets(true)}
              onExportProjectJson={handleExportProjectJson}
              onImportProject={pickProjectFile}
              onSaveCloudProject={handleSaveCloudProject}
            />
          )
        }
      />

      {/* ── Signal Panel ── */}
      <div data-tour="signal-panel">
        <TrackEditor
          track={selectedTrack}
          onUpdate={actions.updateTrack}
          touchUi={touchUi}
          onSynthTouchDragStart={beginSynthTouchDrag}
        />
      </div>

      {/* ── Main: sidebar + timeline ── */}
      <div className="daw-main daw-tracks-area">
        <div className="track-sidebar" data-tour="sidebar">
          <div className="sidebar-ruler-placeholder">
            <button
              className="sidebar-add-btn"
              onClick={actions.addTrack}
              disabled={state.tracks.length >= MAX_TRACKS}
              title={state.tracks.length >= MAX_TRACKS ? "Maximum tracks reached" : "Add a new track"}
            >
              + Track
            </button>
          </div>

          <div className="sidebar-tracks" ref={sidebarScrollRef}>
            {compiledTracks.map((track) => (
              <div
                key={track.id}
                className={[
                  "track-header-row",
                  track.id === state.selectedTrackId ? "selected" : "",
                  track.muted ? "muted" : "",
                ].join(" ").trim()}
                style={{ borderLeftColor: track.id === state.selectedTrackId ? track.color : "transparent" }}
                onClick={() => actions.selectTrack(track.id)}
                title={`Select ${track.name}`}
              >
                {state.tracks.length > 1 && (
                  <button
                    className="track-del-btn"
                    type="button"
                    onClick={(e) => handleDeleteTrack(track.id, e)}
                    title="Delete track"
                  >×</button>
                )}

                <div className="track-name-row">
                  <div className="track-color-dot" style={{ background: track.color, color: track.color }} />
                  <span className="track-name" style={{ color: track.color }}>
                    {track.isMic ? "🎙 " : ""}{track.name}
                  </span>
                  <div className="track-ms-row">
                    <button
                      className={`ms-btn${track.muted ? " muted" : ""}`}
                      onClick={(e) => { e.stopPropagation(); actions.updateTrack(track.id, { muted: !track.muted }); }}
                      title={track.muted ? "Unmute" : "Mute track"}
                    >M</button>
                    <button
                      className={`ms-btn${track.soloed ? " soloed" : ""}`}
                      onClick={(e) => { e.stopPropagation(); actions.updateTrack(track.id, { soloed: !track.soloed }); }}
                      title={track.soloed ? "Un-solo" : "Solo track"}
                    >S</button>
                  </div>
                </div>

                <div className="track-vol-row">
                  <span className="track-vol-label">Vol</span>
                  <input
                    type="range"
                    className="track-vol-fader"
                    min={0} max={1} step={0.01}
                    value={track.volume}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      actions.updateTrack(track.id, { volume: parseFloat(e.target.value) });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Timeline ── */}
        <div className="timeline-root" data-tour="timeline" style={{ flex: 1, display: "flex", position: "relative" }}>
          <BlockSelectionHint />
          <Timeline
            ref={timelineRef}
            tracks={compiledTracks}
            bpm={state.bpm}
            zoom={state.zoom}
            isPlaying={state.isPlaying}
            currentTime={state.currentTime}
            selectedTrackId={state.selectedTrackId}
            selectedBlocks={state.selectedBlocks}
            touchUi={touchUi}
            onClearBlockSelection={actions.clearBlockSelection}
            onSelectTrack={actions.selectTrack}
            onAddBlock={actions.addBlock}
            onMoveBlock={actions.moveBlock}
            onMoveBlockToTrack={actions.moveBlockToTrack}
            onResizeBlock={actions.resizeBlock}
            onDeleteBlock={handleDeleteBlock}
            onDuplicateBlock={actions.duplicateBlock}
            clipboard={state.clipboard}
            onSelectBlock={actions.selectBlock}
            onSplitBlock={actions.splitBlock}
            onCopyBlock={actions.copyBlock}
            onCutBlock={actions.cutBlock}
            onPasteBlock={actions.pasteBlock}
            onSeek={handleSeek}
            onUpdateTrack={actions.updateTrack}
            sidebarScrollRef={sidebarScrollRef}
            onFocusSignalPanel={focusSignalPanel}
          />
        </div>
      </div>

      {/* ── Count-in overlay ── */}
      {countIn !== null && (
        <div className="countdown-overlay" aria-live="assertive">
          <span className="countdown-number" key={countIn}>{countIn}</span>
        </div>
      )}

      {/* ── Modals (lazy-loaded — JS chunks fetched only when first opened) ── */}
      <Suspense fallback={null}>
        {showAuth && (
          <AuthModal
            onLogin={login}
            onSignup={signup}
            onResetPassword={resetPassword}
            onClose={() => setShowAuth(false)}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showOnboard && (
          <OnboardingModal
            open
            initialName={prefs.displayName}
            initialDecade={prefs.decadeTheme}
            onComplete={completeOnboarding}
            onSkip={() => setShowOnboard(false)}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showSettings && (
          <SettingsModal
            open
            onClose={() => setShowSettings(false)}
            user={user}
            prefs={prefs}
            onUpdatePrefs={setPrefs}
            onUpdateProfile={updateProfile}
            onUpdatePassword={updatePassword}
            onDeleteAccount={deleteAccount}
            cloudSongs={cloudSongs}
            cloudTotalDuration={cloudTotalDuration}
            cloudSyncing={songsSyncing}
            onClearLocalCache={clearLocalCache}
            onReplayTutorialQuick={() => {
              setShowSettings(false);
              setTourVariant("quick");
              setShowTour(true);
            }}
            onReplayTutorialFull={() => {
              setShowSettings(false);
              setTourVariant("full");
              setShowTour(true);
            }}
            onResetFirstTutorialFlag={() => {
              resetFirstTutorialFlagForTesting();
              setShowSettings(false);
              setTourVariant("choose");
              setShowTour(true);
            }}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showSongs && (
          <SongsModal
            open
            onClose={() => setShowSongs(false)}
            user={user}
            cloudSongs={cloudSongs}
            cloudTotalDuration={cloudTotalDuration}
            cloudSyncing={songsSyncing}
            onDeleteCloud={deleteCloudSong}
            onLoadProject={handleLoadProject}
            onPreviewProject={(data) => {
              handleLoadProject(data);
            }}
            onBackUpToCloud={handleBackUpToCloud}
            isPremium={prefs.isPremium}
            onOpenAuth={() => { setShowSongs(false); setShowAuth(true); }}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showMic && (
          <MicRecorderModal
            open
            themeDecade={prefs.decadeTheme}
            selectedTrackId={state.selectedTrackId || state.tracks[0]?.id}
            currentTime={state.currentTime}
            onClose={() => setShowMic(false)}
            onAddRecordedToTimeline={handleMicAddRecordedClip}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {recordedReview && (
          <PlaybackReviewModal
            open
            onClose={() => setRecordedReview(null)}
            title={state.projectName || "untitled"}
            decade={prefs.decadeTheme}
            audioBlob={recordedReview.blob}
            duration={recordedReview.duration}
            recordingExtension={recordedReview.extension}
            recordingMime={recordedReview.mime}
            user={user}
            onSaveDevice={handleReviewSaveDevice}
            onSaveCloud={handleReviewSaveCloud}
            onDiscard={() => setRecordedReview(null)}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showPresets && (
          <div className="preset-drawer-overlay" onClick={() => setShowPresets(false)}>
            <div className="preset-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-header">
                <span className="drawer-title">Presets</span>
                <button className="drawer-close" onClick={() => setShowPresets(false)} title="Close">×</button>
              </div>
              <PresetPanel
                presets={state.presets}
                onSaveLocal={actions.savePreset}
                onLoadPresetData={(data) => { handleLoadPresetData(data); setShowPresets(false); }}
                onDeleteLocal={actions.deletePreset}
                user={user}
                cloudPresets={cloudPresets}
                syncing={presetsSyncing}
                syncError={presetsErr}
                onSaveCloud={saveCloudPreset}
                onDeleteCloud={deleteCloudPreset}
                onMigrateToCloud={migrateLocalPresets}
                getPresetData={getPresetData}
                onOpenAuth={() => { setShowPresets(false); setShowAuth(true); }}
                onLogout={logout}
              />
            </div>
          </div>
        )}
      </Suspense>

      {/* ── Tutorial ── */}
      <Suspense fallback={null}>
        {showTour && (
          <TutorialTour
            open
            variant={tourVariant}
            onClose={() => {
              markFirstTutorialSeen();
              setShowTour(false);
              setTourVariant("choose");
              setPrefs({ showTutorial: false });
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
