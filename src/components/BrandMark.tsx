import Image from "next/image";

/** Compact nav mark — keeps speech-bubble identity without covering the banner. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span className="nav-brand">
      <Image
        src="/gm-arc-avatar.png"
        alt=""
        width={size}
        height={size}
        className="nav-brand-img"
        priority
      />
      <span className="nav-brand-text">
        <span className="nav-brand-gm">GM</span>
        <span className="nav-brand-arc">ARC</span>
      </span>
    </span>
  );
}
