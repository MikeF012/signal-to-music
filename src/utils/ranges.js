export const TRACK_COLORS = [
  "#00c896",   // mint
  "#e8a030",   // amber
  "#c840a0",   // magenta
  "#e85830",   // coral
  "#8060d8",   // violet
  "#60b840",   // lime
  "#30a8e8",   // sky
  "#e8d030",   // gold
  "#58c8c8",   // teal
  "#e070b8",   // rose
];

export const MAX_TRACKS = 10;
export const DEFAULT_BPM = 120;
export const DEFAULT_ZOOM = 80;           // px per second
export const TIMELINE_DURATION = 64;      // seconds shown on timeline
export const DEFAULT_BLOCK_DURATION = 4;  // seconds (2 bars at 120 BPM)
export const TRACK_HEIGHT = 78;           // px per track row
export const RULER_HEIGHT = 32;           // px

export const PARAM_RANGES = {
  frequency:    { min: 20,  max: 2000, step: 1,     default: 440 },
  phase:        { min: 0,   max: 6.28, step: 0.01,  default: 0   },
  amplitude:    { min: 0,   max: 1,    step: 0.01,  default: 0.8 },
  volume:       { min: 0,   max: 1,    step: 0.01,  default: 0.8 },
  masterVolume: { min: 0,   max: 1,    step: 0.01,  default: 0.8 },
  bpm:          { min: 40,  max: 240,  step: 1,     default: 120 },
  zoom:         { min: 20,  max: 320,  step: 10,    default: 80  },
};

let _tn = 0;
let _bn = 0;

export function createTrack(index) {
  _tn++;
  return {
    id:            `t${_tn}-${Math.random().toString(36).slice(2, 6)}`,
    name:          `Track ${index + 1}`,
    color:         TRACK_COLORS[index % TRACK_COLORS.length],
    waveform:      "sine",
    customFormula: "",
    amplitude:     0.8,
    frequency:     440,
    phase:         0,
    volume:        0.8,
    muted:         false,
    soloed:        false,
    blocks:        [],
  };
}

export function createBlock(startTime, bpm = 120) {
  _bn++;
  const barDuration = (60 / bpm) * 4;
  const snapped = Math.round(startTime / barDuration) * barDuration;
  return {
    id:        `b${_bn}-${Math.random().toString(36).slice(2, 6)}`,
    startTime: Math.max(0, snapped),
    duration:  DEFAULT_BLOCK_DURATION,
  };
}
