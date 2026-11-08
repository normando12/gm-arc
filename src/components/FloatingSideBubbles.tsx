import Image from "next/image";

const BUBBLES = [
  { side: "left", className: "float-bubble--l1", size: 92, rotate: -8 },
  { side: "left", className: "float-bubble--l2", size: 64, rotate: 12 },
  { side: "left", className: "float-bubble--l3", size: 78, rotate: -4 },
  { side: "right", className: "float-bubble--r1", size: 88, rotate: 10 },
  { side: "right", className: "float-bubble--r2", size: 58, rotate: -14 },
  { side: "right", className: "float-bubble--r3", size: 74, rotate: 6 },
] as const;

/** Decorative GM ARC speech-bubbles flanking the console on desktop. */
export function FloatingSideBubbles() {
  return (
    <div className="float-bubbles" aria-hidden>
      {BUBBLES.map((b) => (
        <span
          key={b.className}
          className={`float-bubble ${b.className}`}
          style={{ ["--bubble-rot" as string]: `${b.rotate}deg` }}
        >
          <Image
            src="/gm-arc-avatar.png"
            alt=""
            width={b.size}
            height={b.size}
            className="float-bubble-img"
            draggable={false}
          />
        </span>
      ))}
    </div>
  );
}
