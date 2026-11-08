/** One-shot GM+ success sting. Unlocked by the Send GM+ click (user gesture). */

const SRC = "/profits-rain-gmplus.mp3";

let audio: HTMLAudioElement | null = null;
let unlocked = false;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio(SRC);
    audio.preload = "auto";
  }
  return audio;
}

/** Call from the GM+ button click so later play() is allowed after async success. */
export function unlockGmPlusSound(): void {
  const el = getAudio();
  if (!el || unlocked) return;
  const prevMuted = el.muted;
  el.muted = true;
  const p = el.play();
  if (p && typeof p.then === "function") {
    void p
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = prevMuted;
        unlocked = true;
      })
      .catch(() => {
        el.muted = prevMuted;
      });
  } else {
    el.muted = prevMuted;
  }
}

/** Play once on successful GM+ (not GM). Safe no-op if autoplay is blocked. */
export function playGmPlusSoundOnce(): void {
  const el = getAudio();
  if (!el) return;
  try {
    el.pause();
    el.currentTime = 0;
    el.muted = false;
    void el.play().catch(() => {
      /* autoplay policy — ignore */
    });
  } catch {
    /* ignore */
  }
}
