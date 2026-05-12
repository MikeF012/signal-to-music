/* This is a helper function that clamps a value between 
a minimum and maximum value. */

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }