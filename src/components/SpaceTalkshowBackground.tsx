/**
 * Page atmosphere below the talk-show cast strip:
 * starfield + nebula + Earth horizon (no stretched faces).
 */
export function SpaceTalkshowBackground() {
  return (
    <div className="space-bg" aria-hidden>
      <div className="space-stars" />
      <div className="space-nebula" />
      <div className="space-planet" />
      <div className="space-horizon-glow" />
      <div className="space-wash" />
      <div className="space-vignette" />
      <div className="space-grain" />
    </div>
  );
}
