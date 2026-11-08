"use client";

type Kind = "gm" | "gmPlus";

type Props = {
  kind: Kind;
  active: boolean;
};

/** Light comic speech-bubble celebration for a successful GM / GM+. */
export function GmSuccessBurst({ kind, active }: Props) {
  if (!active) return null;

  const label = kind === "gmPlus" ? "GM+" : "GM";

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
