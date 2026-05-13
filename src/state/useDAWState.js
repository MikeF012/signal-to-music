import { useState } from "react";
import { TRACK_COLORS, MAX_TRACKS, createTrack, createBlock } from "../utils/ranges";

const PRESET_KEY = "signal-synth-daw-presets-v1";

const BUILT_IN_PRESETS = [
  {
    id: "builtin-sine-bass",
    name: "Sine Bass",
    isBuiltIn: true,
    data: {
      tracks: [
        {
          id: "t-bp1", name: "Track 1", color: TRACK_COLORS[0],
          waveform: "sine", customFormula: "",
          amplitude: 0.8, frequency: 110, phase: 0,
          volume: 0.8, muted: false, soloed: false,
          blocks: [
            { id: "b-bp1a", startTime: 0, duration: 4 },
            { id: "b-bp1b", startTime: 6, duration: 4 },
          ],
        },
      ],
      bpm: 120, masterVolume: 0.8,
    },
  },
  {
    id: "builtin-bass-lead",
    name: "Bass + Lead",
    isBuiltIn: true,
    data: {
      tracks: [
        {
          id: "t-bp2a", name: "Track 1", color: TRACK_COLORS[0],
          waveform: "sine", customFormula: "",
          amplitude: 0.7, frequency: 110, phase: 0,
          volume: 0.8, muted: false, soloed: false,
          blocks: [{ id: "b-bp2a", startTime: 0, duration: 8 }],
        },
        {
          id: "t-bp2b", name: "Track 2", color: TRACK_COLORS[1],
          waveform: "square", customFormula: "",
          amplitude: 0.4, frequency: 440, phase: 0,
          volume: 0.65, muted: false, soloed: false,
          blocks: [
            { id: "b-bp2b", startTime: 0, duration: 4 },
            { id: "b-bp2c", startTime: 5, duration: 3 },
          ],
        },
      ],
      bpm: 120, masterVolume: 0.8,
    },
  },
  {
    id: "builtin-damped",
    name: "Damped Pluck",
    isBuiltIn: true,
    data: {
      tracks: [
        {
          id: "t-bp3", name: "Track 1", color: TRACK_COLORS[2],
          waveform: "custom", customFormula: "sin(t)e^-4t",
          amplitude: 0.9, frequency: 220, phase: 0,
          volume: 0.8, muted: false, soloed: false,
          blocks: [
            { id: "b-bp3a", startTime: 0, duration: 3 },
            { id: "b-bp3b", startTime: 4, duration: 3 },
            { id: "b-bp3c", startTime: 8, duration: 3 },
          ],
        },
      ],
      bpm: 120, masterVolume: 0.8,
    },
  },
];

function readSavedPresets() {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(p => p.id && p.name) : [];
  } catch {
    return [];
  }
}

function writeSavedPresets(presets) {
  const userOnly = presets.filter(p => !p.isBuiltIn);
  localStorage.setItem(PRESET_KEY, JSON.stringify(userOnly));
}

function blockKey(trackId, blockId) {
  return `${trackId}:${blockId}`;
}

function uniqSelectedBlocks(entries) {
  const seen = new Set();
  const out  = [];
  for (const e of entries) {
    const id = blockKey(e.trackId, e.blockId);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ trackId: e.trackId, blockId: e.blockId });
  }
  return out;
}

function normalizeBlock(b) {
  const out = {
    id:        b.id        ?? `b-n-${Math.random().toString(36).slice(2, 8)}`,
    startTime: Number(b.startTime ?? 0),
    duration:  Math.max(0.01, Number(b.duration ?? 4)),
  };
  if (b.recordedSamples != null && b.recordedSampleRate && (b.recordedSamples.length ?? 0) > 0) {
    out.recordedSampleRate = Number(b.recordedSampleRate);
    out.recordedSamples = b.recordedSamples instanceof Float32Array
      ? b.recordedSamples
      : Float32Array.from(b.recordedSamples);
  }
  return out;
}

function normalizeTrack(t, index) {
  return {
    id:            t.id            ?? `t-n-${Date.now()}-${index}`,
    name:          t.name          ?? `Track ${index + 1}`,
    color:         t.color         ?? TRACK_COLORS[index % TRACK_COLORS.length],
    waveform:      t.waveform      ?? "sine",
    customFormula: t.customFormula ?? "",
    amplitude:     Number(t.amplitude  ?? 0.8),
    frequency:     Number(t.frequency  ?? 440),
    phase:         Number(t.phase      ?? 0),
    volume:        Number(t.volume     ?? 0.8),
    muted:         Boolean(t.muted),
    soloed:        Boolean(t.soloed),
    blocks:        Array.isArray(t.blocks) ? t.blocks.map(normalizeBlock) : [],
  };
}

function normalizePresetData(data) {
  const tracks = Array.isArray(data?.tracks)
    ? data.tracks.map(normalizeTrack)
    : [createTrack(0)];
  return {
    tracks,
    bpm:          Math.max(40, Math.min(240, Number(data?.bpm ?? 120))),
    masterVolume: Math.max(0,  Math.min(1,   Number(data?.masterVolume ?? 0.8))),
  };
}

function buildInitialState() {
  const tracks = [createTrack(0), createTrack(1)];
  return {
    tracks,
    selectedTrackId: tracks[0].id,
    selectedBlocks: [],   // [{ trackId, blockId }]
    bpm:             120,
    masterVolume:    0.8,
    isPlaying:       false,
    isRecording:     false,
    currentTime:     0,
    zoom:            80,
    loopActive:      false,
    metronomActive:  false,
    projectName:     "untitled",
    decade:          "2010s",
    presets:         [...BUILT_IN_PRESETS, ...readSavedPresets()],
    clipboard:       null,   // { block } — copied block ready to paste
  };
}

export function useDAWState() {
  const [state, setState] = useState(buildInitialState);

  // ── Track actions ────────────────────────────────────────────────────────

  function addTrack() {
    setState(prev => {
      if (prev.tracks.length >= MAX_TRACKS) return prev;
      const track = createTrack(prev.tracks.length);
      return { ...prev, tracks: [...prev.tracks, track], selectedTrackId: track.id };
    });
  }

  function deleteTrack(trackId) {
    setState(prev => {
      if (prev.tracks.length <= 1) return prev;
      const tracks = prev.tracks.filter(t => t.id !== trackId);
      const selectedTrackId = prev.selectedTrackId === trackId
        ? tracks[0]?.id ?? null
        : prev.selectedTrackId;
      return { ...prev, tracks, selectedTrackId };
    });
  }

  function updateTrack(trackId, updates) {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => t.id === trackId ? { ...t, ...updates } : t),
    }));
  }

  function selectTrack(trackId) {
    setState(prev => ({ ...prev, selectedTrackId: trackId, selectedBlocks: [] }));
  }

  function duplicateTrack(trackId) {
    setState(prev => {
      if (prev.tracks.length >= MAX_TRACKS) return prev;
      const src = prev.tracks.find(t => t.id === trackId);
      if (!src) return prev;
      const dup = {
        ...src,
        id: `t-dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `${src.name} copy`,
        blocks: src.blocks.map((b, i) => ({
          ...b,
          id: `b-dup-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          recordedSamples: b.recordedSamples?.length ? Float32Array.from(b.recordedSamples) : undefined,
        })),
      };
      return { ...prev, tracks: [...prev.tracks, dup], selectedTrackId: dup.id };
    });
  }

  // ── Block actions ────────────────────────────────────────────────────────

  function addBlock(trackId, rawTime) {
    setState(prev => {
      const block = createBlock(rawTime, prev.bpm);
      return {
        ...prev,
        tracks: prev.tracks.map(t =>
          t.id === trackId ? { ...t, blocks: [...t.blocks, block] } : t
        ),
      };
    });
  }

  function moveBlock(trackId, blockId, newStartTime) {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(t =>
        t.id === trackId
          ? { ...t, blocks: t.blocks.map(b =>
              b.id === blockId ? { ...b, startTime: Math.max(0, newStartTime) } : b
            )}
          : t
      ),
    }));
  }

  function moveBlockToTrack(sourceTrackId, blockId, targetTrackId, newStartTime) {
    setState(prev => {
      const src = prev.tracks.find(t => t.id === sourceTrackId);
      if (!src) return prev;
      const block = src.blocks.find(b => b.id === blockId);
      if (!block) return prev;
      const updatedBlock = { ...block, startTime: Math.max(0, newStartTime) };
      const nextSel = prev.selectedBlocks.map((k) =>
        k.trackId === sourceTrackId && k.blockId === blockId
          ? { trackId: targetTrackId, blockId }
          : k
      );
      return {
        ...prev,
        selectedTrackId: targetTrackId,
        selectedBlocks: nextSel,
        tracks: prev.tracks.map(t => {
          if (t.id === sourceTrackId) return { ...t, blocks: t.blocks.filter(b => b.id !== blockId) };
          if (t.id === targetTrackId) return { ...t, blocks: [...t.blocks, updatedBlock] };
          return t;
        }),
      };
    });
  }

  function resizeBlock(trackId, blockId, newDuration) {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(t =>
        t.id === trackId
          ? { ...t, blocks: t.blocks.map(b =>
              b.id === blockId ? { ...b, duration: Math.max(0.01, newDuration) } : b
            )}
          : t
      ),
    }));
  }

  function splitBlock(trackId, blockId, splitTime) {
    setState(prev => ({
      ...prev,
      selectedBlocks: prev.selectedBlocks.filter(
        k => !(k.trackId === trackId && k.blockId === blockId)
      ),
      tracks: prev.tracks.map(t => {
        if (t.id !== trackId) return t;
        const block = t.blocks.find(b => b.id === blockId);
        if (!block) return t;
        // Clamp split to at least 0.01s from each end
        const clampedSplit = Math.max(block.startTime + 0.01,
          Math.min(block.startTime + block.duration - 0.01, splitTime));
        const durA = clampedSplit - block.startTime;
        const durB = (block.startTime + block.duration) - clampedSplit;

        let blockA = { ...block, duration: durA };
        let blockB = {
          ...block,
          id: `b-split-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          startTime: clampedSplit,
          duration: durB,
        };

        if (block.recordedSamples?.length && block.recordedSampleRate) {
          const sr  = block.recordedSampleRate;
          const buf = block.recordedSamples;
          const nSplit = Math.max(1, Math.min(buf.length - 1, Math.round((durA / block.duration) * buf.length)));
          blockA = {
            ...blockA,
            recordedSamples: Float32Array.from(buf.subarray(0, nSplit)),
            recordedSampleRate: sr,
            duration: Math.max(0.01, nSplit / sr),
          };
          const rest = buf.subarray(nSplit);
          blockB = {
            ...blockB,
            recordedSamples: Float32Array.from(rest),
            recordedSampleRate: sr,
            duration: Math.max(0.01, rest.length / sr),
          };
        }

        return { ...t, blocks: t.blocks.filter(b => b.id !== blockId).concat([blockA, blockB]) };
      }),
    }));
  }

  function copyBlock(trackId, blockId) {
    setState(prev => {
      const track = prev.tracks.find(t => t.id === trackId);
      const block = track?.blocks.find(b => b.id === blockId);
      if (!block) return prev;
      return { ...prev, clipboard: { block: { ...block } } };
    });
  }

  function pasteBlock(trackId, startTime) {
    setState(prev => {
      if (!prev.clipboard?.block) return prev;
      const src = prev.clipboard.block;
      const newBlock = {
        ...src,
        id: `b-paste-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        startTime: Math.max(0, startTime),
        recordedSamples: src.recordedSamples?.length ? Float32Array.from(src.recordedSamples) : undefined,
      };
      return {
        ...prev,
        tracks: prev.tracks.map(t =>
          t.id === trackId ? { ...t, blocks: [...t.blocks, newBlock] } : t
        ),
      };
    });
  }

  function deleteBlock(trackId, blockId) {
    setState(prev => ({
      ...prev,
      selectedBlocks: prev.selectedBlocks.filter(
        k => !(k.trackId === trackId && k.blockId === blockId)
      ),
      tracks: prev.tracks.map(t =>
        t.id === trackId
          ? { ...t, blocks: t.blocks.filter(b => b.id !== blockId) }
          : t
      ),
    }));
  }

  function deleteSelectedBlocks() {
    setState(prev => {
      if (!prev.selectedBlocks.length) return prev;
      let tracks = prev.tracks;
      for (const { trackId, blockId } of prev.selectedBlocks) {
        tracks = tracks.map(t =>
          t.id === trackId ? { ...t, blocks: t.blocks.filter(b => b.id !== blockId) } : t
        );
      }
      return { ...prev, tracks, selectedBlocks: [] };
    });
  }

  function duplicateBlock(trackId, blockId) {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => {
        if (t.id !== trackId) return t;
        const block = t.blocks.find(b => b.id === blockId);
        if (!block) return t;
        const dup = {
          ...block,
          id: `b-dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          startTime: block.startTime + block.duration + 0.1,
          recordedSamples: block.recordedSamples?.length
            ? Float32Array.from(block.recordedSamples)
            : undefined,
        };
        return { ...t, blocks: [...t.blocks, dup] };
      }),
    }));
  }

  function selectBlock(trackId, blockId, additive = false) {
    setState(prev => {
      const next = additive ? [...prev.selectedBlocks] : [];
      const k    = { trackId, blockId };
      const id   = blockKey(trackId, blockId);

      if (additive) {
        const had = prev.selectedBlocks.some(x => blockKey(x.trackId, x.blockId) === id);
        if (had) {
          return {
            ...prev,
            selectedTrackId: trackId,
            selectedBlocks: prev.selectedBlocks.filter(
              x => blockKey(x.trackId, x.blockId) !== id
            ),
          };
        }
        next.push(k);
      } else next.push(k);

      return {
        ...prev,
        selectedTrackId: trackId,
        selectedBlocks: uniqSelectedBlocks(next),
      };
    });
  }

  function clearBlockSelection() {
    setState(prev => ({ ...prev, selectedBlocks: [] }));
  }

  // ── Playback ─────────────────────────────────────────────────────────────

  function setIsPlaying(v)    { setState(p => ({ ...p, isPlaying: Boolean(v) })); }
  function setIsRecording(v)  { setState(p => ({ ...p, isRecording: Boolean(v) })); }
  function setCurrentTime(t)  { setState(p => ({ ...p, currentTime: Math.max(0, Number(t)) })); }

  // ── Global ───────────────────────────────────────────────────────────────

  function setBpm(v)           { setState(p => ({ ...p, bpm: Math.max(40, Math.min(240, Number(v))) })); }
  function setMasterVolume(v)  { setState(p => ({ ...p, masterVolume: Math.max(0, Math.min(1, Number(v))) })); }
  function setZoom(v)          { setState(p => ({ ...p, zoom: Math.max(20, Math.min(320, Number(v))) })); }
  function setLoopActive(v)    { setState(p => ({ ...p, loopActive: Boolean(v) })); }
  function setMetronomActive(v){ setState(p => ({ ...p, metronomActive: Boolean(v) })); }
  function setProjectName(v)   { setState(p => ({ ...p, projectName: String(v) })); }
  function setDecade(v)        { setState(p => ({ ...p, decade: String(v) })); }

  // Recorded PCM → one clip on an existing synth lane (not a new track).
  function addRecordedBlockToTrack(trackId, sound, startTime = 0) {
    setState(prev => {
      const track = prev.tracks.find((t) => t.id === trackId);
      if (!track || !sound?.samples) return prev;

      let raw;
      try {
        raw = sound.samples instanceof Float32Array ? sound.samples : Float32Array.from(sound.samples);
      } catch {
        return prev;
      }
      if (!raw.length) return prev;

      const srNum = Number(sound.sampleRate);
      const sr = srNum > 0 && Number.isFinite(srNum) ? srNum : 44100;

      let dur = Number(sound.duration);
      if (!Number.isFinite(dur) || dur <= 0) dur = raw.length / sr;
      dur = Math.max(0.01, Math.min(86400, dur));

      let t0 = Number(startTime);
      if (!Number.isFinite(t0) || t0 < 0) t0 = 0;

      const samples = Float32Array.from(raw);

      const blockId = `b-mic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const block = {
        id: blockId,
        startTime: t0,
        duration: dur,
        recordedSamples: samples,
        recordedSampleRate: sr,
      };

      let nextTrack = track;
      if (nextTrack.recordedSamples?.length || nextTrack.isMic) {
        nextTrack = {
          ...track,
          recordedSamples: undefined,
          recordedSampleRate: undefined,
          isMic: false,
        };
      }

      const nextTracks = prev.tracks.map((t) =>
        t.id === trackId ? { ...nextTrack, blocks: [...t.blocks, block] } : t
      );

      return {
        ...prev,
        tracks: nextTracks,
        selectedTrackId: trackId,
        selectedBlocks: [{ trackId, blockId }],
      };
    });
  }

  // Replace entire DAW state from a project file (.signal JSON)
  function loadProject(project) {
    if (!project || !Array.isArray(project.tracks)) return;
    setState(prev => ({
      ...prev,
      tracks:          project.tracks.map((t, i) => ({
        ...createTrack(i),
        ...t,
        blocks: (t.blocks ?? []).map(normalizeBlock),
      })),
      selectedTrackId: project.tracks[0]?.id ?? prev.selectedTrackId,
      selectedBlocks: [],
      bpm:             Number(project.bpm)          || prev.bpm,
      masterVolume:    Number(project.masterVolume) || prev.masterVolume,
      decade:          project.decade ?? prev.decade,
      projectName:     project.name   ?? "untitled",
      isPlaying:       false,
      currentTime:     0,
    }));
  }

  // ── Presets ──────────────────────────────────────────────────────────────

  function savePreset(name) {
    const trimmed = String(name ?? "").trim();
    if (!trimmed) return;
    setState(prev => {
      const preset = {
        id:        `user-${Date.now()}`,
        name:      trimmed,
        isBuiltIn: false,
        data: {
          tracks:       prev.tracks.map(t => ({ ...t, blocks: t.blocks.map(b => ({ ...b })) })),
          bpm:          prev.bpm,
          masterVolume: prev.masterVolume,
        },
      };
      const presets = [...prev.presets, preset];
      writeSavedPresets(presets);
      return { ...prev, presets };
    });
  }

  function loadPresetData(data) {
    const n = normalizePresetData(data);
    setState(prev => ({
      ...prev,
      tracks:          n.tracks,
      selectedTrackId: n.tracks[0]?.id ?? prev.selectedTrackId,
      selectedBlocks: [],
      bpm:             n.bpm,
      masterVolume:    n.masterVolume,
      isPlaying:       false,
      currentTime:     0,
    }));
  }

  function deletePreset(presetId) {
    setState(prev => {
      const preset = prev.presets.find(p => p.id === presetId);
      if (!preset || preset.isBuiltIn) return prev;
      const presets = prev.presets.filter(p => p.id !== presetId);
      writeSavedPresets(presets);
      return { ...prev, presets };
    });
  }

  return {
    state,
    actions: {
      addTrack, deleteTrack, updateTrack, selectTrack, duplicateTrack,
      addBlock, moveBlock, moveBlockToTrack, resizeBlock, deleteBlock,
      duplicateBlock, splitBlock, copyBlock, pasteBlock, selectBlock, clearBlockSelection,
      deleteSelectedBlocks,
      setIsPlaying, setIsRecording, setCurrentTime,
      setBpm, setMasterVolume, setZoom,
      setLoopActive, setMetronomActive, setProjectName, setDecade,
      addRecordedBlockToTrack, loadProject,
      savePreset, loadPresetData, deletePreset,
    },
  };
}
