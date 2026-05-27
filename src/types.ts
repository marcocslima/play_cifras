export interface LrcLine {
  id: string;
  lineNumber: number;
  timestamp: number | null; // seconds
  rawTimestamp: string | null; // "[mm:ss.xx]"
  text: string; // text content (with spacing preserved)
  isChord: boolean;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  tone: string;
  bpm?: number;
  rawLrc: string; // Full song text in LRC format (with chords)
  ownerId?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number; // in seconds
  speed: number; // multiplier, default 1.0
  transpose: number; // semitones to shift, e.g. -2, 0, +3
}

export interface FaceScrollSettings {
  isEnabled: boolean;
  sensitivity: number; // 1 to 10
  scrollSpeed: number; // pixels per frame
  thresholdPercent: number; // percentage of chin tilt before scroll triggers
  calibratedValue: number | null;
  updateIntervalSeconds: number; // Interval in seconds to check/verify face and eye markers
}
