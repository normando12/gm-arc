/**
 * GM+ success sting via Web Audio (survives the ~2s loading delay after click).
 * Unlock on the Send GM+ user gesture; play once on success.
 */

const SRC = "/profits-rain-gmplus.mp3";
const LOG = "[gm+ audio]";

let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let loadPromise: Promise<AudioBuffer> | null = null;
let unlocked = false;
let playing = false;

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
    // Fire resume in the click turn — do not await before returning to the handler.
    const resume =
      c.state === "suspended"
        ? c.resume().then(() => {
            console.info(LOG, "AudioContext resumed", c.state);
          })
        : Promise.resolve().then(() => {
            console.info(LOG, "AudioContext ready", c.state);
          });
    void resume
      .then(() => ensureBuffer())
      .then(() => {
        unlocked = true;
        console.info(LOG, "unlocked + buffer ready");
      })
      .catch((err) => {
        console.error(LOG, "unlock failed", err);
      });
  } catch (err) {
    console.error(LOG, "unlock threw", err);
  }
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
    src.onended = () => {
      playing = false;
      console.info(LOG, "playback ended");
    };
    src.start(0);
    console.info(LOG, "playback started", { duration: buf.duration, ctx: c.state });
  } catch (err) {
    playing = false;
    console.error(LOG, "play failed", err);
  }
}
