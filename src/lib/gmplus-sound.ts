/**
 * GM+ success sting via Web Audio (survives the ~2s loading delay after click).
 * Unlock on the Send GM+ user gesture; play once on success.
 *
 * Note: Chrome can mute the *tab/site* (speaker ✕ on the tab). That mute cannot
 * be cleared from JS — show a Play/unmute cue so the user can fix it.
 */

const SRC = "/profits-rain-gmplus.mp3";
const LOG = "[gm+ audio]";

let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let loadPromise: Promise<AudioBuffer> | null = null;
let unlocked = false;
let playing = false;
let activeSource: AudioBufferSourceNode | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

/** Short audible blip inside the click turn (proves gesture audio; no fetch). */
function playGestureBlip(c: AudioContext): void {
  try {
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.12);
    console.info(LOG, "gesture blip started", { ctx: c.state });
  } catch (err) {
    console.error(LOG, "gesture blip failed", err);
  }
}

async function ensureBuffer(): Promise<AudioBuffer> {
  if (buffer) return buffer;
  if (!loadPromise) {
    loadPromise = (async () => {
      console.info(LOG, "fetching", SRC);
      const res = await fetch(SRC, { cache: "force-cache" });
      if (!res.ok) {
        throw new Error(`Failed to fetch ${SRC}: ${res.status} ${res.statusText}`);
      }
      const raw = await res.arrayBuffer();
      const decoded = await getCtx().decodeAudioData(raw.slice(0));
      buffer = decoded;
      console.info(LOG, "decoded", {
        duration: decoded.duration,
        channels: decoded.numberOfChannels,
        bytes: raw.byteLength,
      });
      return decoded;
    })().catch((err) => {
      loadPromise = null;
      console.error(LOG, "load/decode failed", err);
      throw err;
    });
  }
  return loadPromise;
}

/**
 * Call synchronously from the Send GM+ click handler (before any await)
 * so the browser treats AudioContext.resume as a user gesture.
 */
export function unlockGmPlusSound(): void {
  try {
    const c = getCtx();
    const resume =
      c.state === "suspended"
        ? c.resume().then(() => {
            console.info(LOG, "AudioContext resumed", c.state);
          })
        : Promise.resolve().then(() => {
            console.info(LOG, "AudioContext ready", c.state);
          });

    // Audible output in the same turn as the click (before awaits).
    playGestureBlip(c);
    unlocked = true;

    void resume
      .then(() => ensureBuffer())
      .then(() => {
        console.info(LOG, "unlocked + buffer ready");
      })
      .catch((err) => {
        console.error(LOG, "unlock failed", err);
      });
  } catch (err) {
    console.error(LOG, "unlock threw", err);
  }
}

function stopActive(): void {
  if (!activeSource) return;
  try {
    activeSource.stop();
  } catch {
    /* already stopped */
  }
  activeSource = null;
  playing = false;
}

/** Play once on successful GM+ (not GM). */
export async function playGmPlusSoundOnce(): Promise<void> {
  if (playing) {
    console.info(LOG, "already playing — skip");
    return;
  }
  try {
    const c = getCtx();
    if (c.state === "suspended") {
      await c.resume();
      console.info(LOG, "AudioContext resumed on play", c.state);
    }
    if (!unlocked) {
      console.warn(LOG, "playing without prior unlock — may be blocked");
    }
    const buf = await ensureBuffer();
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.value = 1;
    src.connect(gain);
    gain.connect(c.destination);
    playing = true;
    activeSource = src;
    src.onended = () => {
      playing = false;
      activeSource = null;
      console.info(LOG, "playback ended");
    };
    src.start(0);
    console.info(LOG, "playback started", {
      duration: buf.duration,
      ctx: c.state,
      tip: "If silent, unmute this Chrome tab (speaker icon), then use Play sound",
    });
  } catch (err) {
    playing = false;
    activeSource = null;
    console.error(LOG, "play failed", err);
  }
}

/**
 * Explicit user tap — re-unlock + replay (helps after Chrome tab mute unmute).
 */
export function replayGmPlusSoundFromGesture(): void {
  console.info(LOG, "replay from user gesture");
  stopActive();
  unlockGmPlusSound();
  void playGmPlusSoundOnce();
}

export function gmPlusSoundSrc(): string {
  return SRC;
}
