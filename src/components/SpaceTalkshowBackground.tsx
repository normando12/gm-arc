/**
 * Full-viewport talk-show / space art — fixed behind the page.
 * Console and chrome sit above a dark wash for contrast.
 */
export function SpaceTalkshowBackground() {
  return (
    <div className="space-bg" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative full-page atmosphere */}
      <img
        className="space-bg-art"
        src="/talkshow-banner-clean.jpg"
        alt=""
        decoding="async"
      />
      <div className="space-bg-wash" />
      <div className="space-stars" />
      <div className="space-nebula" />
      <div className="space-vignette" />
      <div className="space-grain" />
    </div>
  );
}
