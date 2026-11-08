"use client";

type Kind = "gm" | "gmPlus";
type Phase = "loading" | "success";

type Props = {
  kind: Kind;
  phase: Phase | null;
};

/** Loading circle (~2s) then comic speech-bubble success for GM / GM+. */
export function GmActionOverlay({ kind, phase }: Props) {
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
    <div className="gm-success" role="status" aria-live="polite">
      <div className="gm-success-bubble" data-kind={kind}>
        <span className="gm-success-sun" aria-hidden>
          ☀
        </span>
        <span className="gm-success-label">{label}!</span>
        <span className="gm-success-sub">
          {kind === "gmPlus" ? "sent on Arc" : "recorded on Arc"}
        </span>
      </div>
      <span className="gm-success-spark gm-success-spark--a" aria-hidden />
      <span className="gm-success-spark gm-success-spark--b" aria-hidden />
      <span className="gm-success-spark gm-success-spark--c" aria-hidden />
      <span className="gm-success-spark gm-success-spark--d" aria-hidden />
    </div>
  );
}
