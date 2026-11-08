import Image from "next/image";

export function BrandMark() {
  return (
    <div className="brand-block">
      <div className="brand-mark">
        <Image
          src="/gm-arc-avatar.png"
          alt="GM ARC"
          width={168}
          height={168}
          priority
          className="brand-mark-img"
        />
        <span className="brand-spark brand-spark--a" aria-hidden />
        <span className="brand-spark brand-spark--b" aria-hidden />
        <span className="brand-spark brand-spark--c" aria-hidden />
      </div>
      <h1 className="brand-title">
        <span className="brand-title-gm">GM</span>
        <span className="brand-title-arc">ARC</span>
      </h1>
    </div>
  );
}
