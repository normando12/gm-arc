export function DawnBackground() {
  return (
    <div className="cockpit-bg" aria-hidden>
      <div className="cockpit-stars" />
      <div className="cockpit-nebula" />
      <div className="cockpit-glow" />
      <div className="cockpit-planet" role="img" aria-label="Planet Earth" />
      <div className="cockpit-horizon" />
      <div className="cockpit-rail cockpit-rail--left" />
      <div className="cockpit-rail cockpit-rail--right" />
      <div className="cockpit-floor" />
      <div className="cockpit-vignette" />
    </div>
  );
}
