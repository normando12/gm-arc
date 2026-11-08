"use client";

type Kind = "gm" | "gmPlus";
type Phase = "loading" | "success";

type Props = {
  kind: Kind;
  phase: Phase | null;
  onPlaySound?: () => void;
};

/** Loading circle (~2s) then comic speech-bubble success for GM / GM+. */
export function GmActionOverlay({ kind, phase, onPlaySound }: Props) {
  if (!phase) return null;

  const label = kind === "gmPlus" ? "GM+" : "GM";

  if (phase === "loading") {
    return (
      <div className="gm-action-overlay" role="status" aria-live="polite">
        <div className="gm-loading">
          <span className="gm-loading-ring" aria-hidden />
          <span className="gm-loading-label">
            {kind === "gmPlus" ? "Sending GM+" : "Recording GM"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`gm-success${kind === "gmPlus" ? " gm-success--sound" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="gm-success-bubble" data-kind={kind}>
        <span className="gm-success-sun" aria-hidden>
          ☀
        </span>
        <span className="gm-success-label">{label}!</span>
        {kind === "gmPlus" && onPlaySound ? (
          <button
            type="button"
            className="gm-sound-cue"
            onClick={(e) => {
              e.stopPropagation();
              onPlaySound();
            }}
          >
            <span aria-hidden>♪</span> Play sound
          </button>
        ) : null}
      </div>
      <span className="gm-success-spark gm-success-spark--a" aria-hidden />
      <span className="gm-success-spark gm-success-spark--b" aria-hidden />
      <span className="gm-success-spark gm-success-spark--c" aria-hidden />
      <span className="gm-success-spark gm-success-spark--d" aria-hidden />
    </div>
  );
}
