// ── Singletons ────────────────────────────────────────────────────────────
let audioCtx       = null;
let scriptNode     = null;
let analyserNode   = null;
let masterGainNode = null;

// ── Playback state ────────────────────────────────────────────────────────
let playing         = false;
let recording       = false;
let sampleCursor    = 0;       // absolute sample index from position 0
let playStartOffset = 0;       // timeline seconds when play was pressed
let playStartClock  = 0;       // audioCtx.currentTime when play was pressed
let recordBuffer    = [];

// ── Loop ─────────────────────────────────────────────────────────────────
let engineLoop    = false;
let engineLoopEnd = 0;        // seconds; 0 = no loop end

// ── Live engine data (updated via updateEngine) ───────────────────────────
let engineTracks       = [];
let engineMasterVolume = 0.8;

// ── Metronome ─────────────────────────────────────────────────────────────
let metronomActive    = false;
let metronomBpm       = 120;
let metronomNextBeat  = 0;    // audioCtx time of next scheduled click
let metronomBeatIdx   = 0;
let metronomInterval  = null;

// ─────────────────────────────────────────────────────────────────────────

export function getAnalyser() { return analyserNode; }

/** True while the script processor is actively advancing the playhead. */
export function enginePlaybackActive() {
  return playing && !!audioCtx;
}

export function getPlayheadTime() {
  if (!audioCtx || !playing) return playStartOffset;
  return playStartOffset + (audioCtx.currentTime - playStartClock);
}

function connectGraph() {
  if (!audioCtx || !scriptNode || !masterGainNode || !analyserNode) return;
  try {
    scriptNode.disconnect();
    masterGainNode.disconnect();
    analyserNode.disconnect();
  } catch { /* first connect */ }

  scriptNode.connect(masterGainNode);
  masterGainNode.connect(audioCtx.destination);
  masterGainNode.connect(analyserNode);
}

// ─────────────────────────────────────────────────────────────────────────

export async function initAudio() {
  if (audioCtx) {
    if (audioCtx.state === "suspended") await audioCtx.resume();
    return;
  }

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 2048;
  analyserNode.smoothingTimeConstant = 0.25;

  masterGainNode = audioCtx.createGain();
  masterGainNode.gain.value = engineMasterVolume;

  scriptNode = audioCtx.createScriptProcessor(2048, 0, 1);
  scriptNode.onaudioprocess = onProcess;

  connectGraph();
}

// ── Audio processing ──────────────────────────────────────────────────────

function onProcess(e) {
  const out = e.outputBuffer.getChannelData(0);
  if (!playing) { out.fill(0); return; }

  const sampleRate = audioCtx.sampleRate;
  const anySoloed  = engineTracks.some(t => t.soloed && !t.muted);

  for (let i = 0; i < out.length; i++) {
    // Loop detection: wrap sampleCursor if past loop end
    if (engineLoop && engineLoopEnd > 0) {
      const absTime = sampleCursor / sampleRate;
      if (absTime >= engineLoopEnd) {
        sampleCursor = 0;
        playStartOffset = 0;
        playStartClock  = audioCtx.currentTime - (i / sampleRate);
      }
    }

    const absTime = sampleCursor / sampleRate;
    let mix = 0;

    for (const track of engineTracks) {
      if (track.muted) continue;
      if (anySoloed && !track.soloed) continue;

      for (const block of track.blocks) {
        const blockEnd = block.startTime + block.duration;
        if (absTime >= block.startTime && absTime < blockEnd) {
          const localTime = absTime - block.startTime;

          const clipSamples = block.recordedSamples?.length ? block.recordedSamples : null;
          const clipRate    = clipSamples ? (block.recordedSampleRate ?? 44100) : null;
          // Per-clip PCM, else legacy whole-track buffer (one shared recording for every block).
          const pcm    = clipSamples ?? (track.recordedSamples?.length ? track.recordedSamples : null);
          const pcmSr  = clipRate ?? (pcm ? (track.recordedSampleRate ?? 44100) : null);

          if (pcm?.length && pcmSr) {
            const idx = Math.floor(localTime * pcmSr);
            if (idx < pcm.length && idx >= 0) {
              mix += pcm[idx] * track.amplitude * track.volume;
            }
          } else {
            const angle = 2 * Math.PI * track.frequency * localTime + track.phase;
            mix += sampleWave(track, angle) * track.amplitude * track.volume;
          }
          break;
        }
      }
    }

    const clamped = Math.max(-1, Math.min(1, mix));
    out[i] = clamped;
    if (recording) recordBuffer.push(clamped);
    sampleCursor++;
  }
}

function sampleWave(track, t) {
  switch (track.waveform) {
    case "cosine": return Math.cos(t);
    case "square": return Math.sign(Math.sin(t));
    case "custom":
      if (track.customEvaluator) {
        try { const v = Number(track.customEvaluator(t)); return Number.isFinite(v) ? v : 0; }
        catch { return 0; }
      }
      return Math.sin(t);
    default: return Math.sin(t);
  }
}

// ── Transport ─────────────────────────────────────────────────────────────

export function startPlayback(offset = 0) {
  if (!audioCtx) return;
  sampleCursor    = Math.floor(offset * audioCtx.sampleRate);
  playStartOffset = offset;
  playStartClock  = audioCtx.currentTime;
  playing         = true;
}

export function stopPlayback() {
  if (!playing) return;
  playStartOffset = getPlayheadTime();
  playing         = false;
}

export function seekTo(time) {
  playStartOffset = Math.max(0, time);
  if (audioCtx && playing) {
    sampleCursor   = Math.floor(time * audioCtx.sampleRate);
    playStartClock = audioCtx.currentTime;
  }
}

// ── Loop ─────────────────────────────────────────────────────────────────

export function setEngineLoop(active, loopEndSeconds = 0) {
  engineLoop    = active;
  engineLoopEnd = loopEndSeconds;
}

// ── Metronome ─────────────────────────────────────────────────────────────

function scheduleMetronomClick(time, isDownbeat) {
  if (!audioCtx) return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = "sine";
  osc.frequency.value = isDownbeat ? 880 : 660;
  gain.gain.setValueAtTime(0.35, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
  osc.start(time);
  osc.stop(time + 0.07);
}

function runMetronomLookahead() {
  if (!audioCtx || !metronomActive) return;
  const now       = audioCtx.currentTime;
  const lookahead = 0.12;
  const beatDur   = 60 / metronomBpm;

  while (metronomNextBeat < now + lookahead) {
    scheduleMetronomClick(metronomNextBeat, metronomBeatIdx % 4 === 0);
    metronomBeatIdx++;
    metronomNextBeat += beatDur;
  }
}

export function setMetronome(active, bpm = 120) {
  metronomActive = active;
  metronomBpm    = bpm;

  if (metronomInterval) { clearInterval(metronomInterval); metronomInterval = null; }

  if (active && audioCtx) {
    metronomBeatIdx  = 0;
    metronomNextBeat = audioCtx.currentTime;
    metronomInterval = setInterval(runMetronomLookahead, 25);
  }
}

// ── Count-in (schedule N clicks and return total duration ms) ─────────────

export function scheduleCountIn(bpm, beats = 4, onBeat) {
  if (!audioCtx) { onBeat && onBeat(0); return 0; }
  const beatDur   = 60 / bpm;
  const beatDurMs = beatDur * 1000;

  for (let i = 0; i < beats; i++) {
    const time = audioCtx.currentTime + i * beatDur;
    scheduleMetronomClick(time, true);
    if (onBeat) {
      const count = beats - i;
      setTimeout(() => onBeat(count), i * beatDurMs);
    }
  }

  return beats * beatDurMs;
}

// ── Recording ────────────────────────────────────────────────────────────

export function startRecording() {
  recordBuffer = [];
  recording    = true;
}

export function stopRecording() {
  recording = false;
  if (recordBuffer.length === 0) return null;
  const samples = trimSilence(new Float32Array(recordBuffer));
  return encodeWav(samples, audioCtx?.sampleRate ?? 44100);
}

function trimSilence(samples, threshold = 0.0008) {
  let start = 0;
  let end   = samples.length - 1;
  while (start < end && Math.abs(samples[start]) < threshold) start++;
  while (end > start && Math.abs(samples[end]) < threshold) end--;
  return samples.slice(start, end + 1);
}

// ── Engine update ─────────────────────────────────────────────────────────

export function updateEngine({ tracks = [], masterVolume = 0.8 }) {
  engineTracks       = tracks;
  engineMasterVolume = masterVolume;
  if (masterGainNode) masterGainNode.gain.value = masterVolume;
}

export function disposeAudio() {
  playing   = false;
  recording = false;
  if (metronomInterval) { clearInterval(metronomInterval); metronomInterval = null; }
  try { audioCtx?.close(); } catch {}
  audioCtx       = null;
  scriptNode     = null;
  analyserNode   = null;
  masterGainNode = null;
}

// ── WAV encoding ──────────────────────────────────────────────────────────

export function encodeWav(samples, sampleRate) {
  const len  = samples.length;
  const buf  = new ArrayBuffer(44 + len * 2);
  const view = new DataView(buf);
  const ws   = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };

  ws(0,  "RIFF");
  view.setUint32(4,  36 + len * 2, true);
  ws(8,  "WAVE");
  ws(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1,  true);
  view.setUint16(22, 1,  true);
  view.setUint32(24, sampleRate,     true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2,  true);
  view.setUint16(34, 16, true);
  ws(36, "data");
  view.setUint32(40, len * 2, true);

  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buf], { type: "audio/wav" });
}

/** Float PCM → WAV Blob (for previews / `<audio>`). */
export function float32SamplesToWavBlob(samples, sampleRate) {
  const arr = samples instanceof Float32Array ? samples : Float32Array.from(samples);
  return encodeWav(arr, sampleRate);
}
