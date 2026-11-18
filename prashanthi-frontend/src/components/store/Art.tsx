import { useId } from "react";
import type { ArtKind } from "@/lib/catalog";

/* Hand-drawn vector sweets. Used for the hero and as tasteful placeholders until real photos are uploaded. */

// deterministic "random" so server/client and re-renders agree
const rnd = (i: number, k = 1) => { const x = Math.sin(i * 12.9898 * k + 78.233) * 43758.5453; return x - Math.floor(x); };

const Pak = ({ x, y, s, rot = 0 }: { x: number; y: number; s: number; rot?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <rect x={-s / 2 + 2} y={-s / 2 + 5} width={s} height={s} rx={s * 0.14} fill="#7a4a10" opacity=".28" />
    <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.14} fill="#b9791f" />
    <rect x={-s / 2} y={-s / 2} width={s} height={s * 0.78} rx={s * 0.14} fill="#dca03a" />
    <rect x={-s / 2 + 3} y={-s / 2 + 3} width={s - 6} height={s * 0.4} rx={s * 0.1} fill="#efc563" opacity=".7" />
    {Array.from({ length: 16 }, (_, i) => (
      <circle key={i} cx={-s / 2 + 5 + rnd(i, 1.3) * (s - 10)} cy={-s / 2 + 5 + rnd(i, 2.1) * (s * 0.7)} r={s * 0.032 + rnd(i, 3) * 1.2} fill="#a8691a" opacity=".55" />
    ))}
  </g>
);

const Laddu = ({ x, y, r }: { x: number; y: number; r: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx={3} cy={r * 0.9} rx={r * 0.9} ry={r * 0.28} fill="#6b3f0c" opacity=".3" />
    <circle r={r} fill="#d8952c" />
    {Array.from({ length: 34 }, (_, i) => {
      const a = rnd(i, 1.7) * Math.PI * 2, d = Math.sqrt(rnd(i, 2.9)) * r * 0.92;
      return <circle key={i} cx={Math.cos(a) * d} cy={Math.sin(a) * d} r={r * 0.11} fill={i % 3 ? "#efc15a" : "#b97d1f"} opacity=".9" />;
    })}
    <ellipse cx={-r * 0.35} cy={-r * 0.4} rx={r * 0.32} ry={r * 0.18} fill="#fff3c4" opacity=".45" transform={`rotate(-30 ${-r * 0.35} ${-r * 0.4})`} />
  </g>
);

const Murukku = ({ x, y, r }: { x: number; y: number; r: number }) => {
  const turns = 3.4, pts: string[] = [];
  for (let t = 0.15; t <= turns; t += 0.04) {
    const a = t * Math.PI * 2, d = (t / turns) * r;
    pts.push(`${(Math.cos(a) * d).toFixed(1)},${(Math.sin(a) * d).toFixed(1)}`);
  }
  const d = "M" + pts.join(" L");
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r * 1.02} fill="#6b3f0c" opacity=".16" transform="translate(2 4)" />
      <path d={d} fill="none" stroke="#b9791f" strokeWidth={r * 0.2} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#e8b84f" strokeWidth={r * 0.1} strokeLinecap="round" transform="translate(-.6 -.8)" />
    </g>
  );
};

const Badusha = ({ x, y, r }: { x: number; y: number; r: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx={2} cy={r * 0.8} rx={r} ry={r * 0.3} fill="#6b3f0c" opacity=".28" />
    <circle r={r} fill="#b9742a" />
    <circle r={r * 0.9} fill="#d79a45" />
    <circle r={r * 0.42} fill="#b4702a" />
    <circle r={r * 0.3} fill="#c4833a" />
    <path d={`M${-r * 0.7} ${-r * 0.35} A ${r * 0.8} ${r * 0.8} 0 0 1 ${r * 0.1} ${-r * 0.78}`} stroke="#fff3c4" strokeWidth={r * 0.14} strokeLinecap="round" fill="none" opacity=".55" />
  </g>
);

const Burfi = ({ x, y, s }: { x: number; y: number; s: number }) => (
  <g transform={`translate(${x} ${y}) rotate(45)`}>
    <rect x={-s / 2 + 2} y={-s / 2 + 5} width={s} height={s} rx={s * 0.1} fill="#6b3f0c" opacity=".25" />
    <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.1} fill="#e9d6a6" />
    <rect x={-s / 2} y={-s / 2} width={s} height={s * 0.62} rx={s * 0.1} fill="#f6ebc8" />
    <rect x={-s * 0.33} y={-s * 0.33} width={s * 0.66} height={s * 0.66} rx={s * 0.06} fill="none" stroke="#c8962c" strokeWidth="1.2" opacity=".7" />
    {[[-.12, -.1], [.14, .04], [-.02, .17], [.12, -.18]].map(([a, b], i) => <circle key={i} cx={a * s} cy={b * s} r={s * 0.04} fill="#6f8f3c" />)}
  </g>
);

const Snack = ({ x, y, r }: { x: number; y: number; r: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx={2} cy={r * 0.85} rx={r} ry={r * 0.26} fill="#6b3f0c" opacity=".22" />
    {[[-.45, .2, 0], [.4, .25, 40], [0, -.4, 80], [-.15, .45, 20]].map(([a, b, rot], i) => (
      <g key={i} transform={`translate(${a * r} ${b * r}) rotate(${rot})`}>
        <circle r={r * 0.46} fill="#c98a2a" /><circle r={r * 0.4} fill="#e2ac45" />
        {Array.from({ length: 6 }, (_, k) => <circle key={k} cx={(rnd(k + i * 7, 1.1) - .5) * r * .5} cy={(rnd(k + i * 7, 2.2) - .5) * r * .5} r={r * 0.05} fill="#9a6118" opacity=".7" />)}
      </g>
    ))}
  </g>
);

/** The hero: a brass thali heaped with sweets, ringed by a faint mandala (echoing the logo). */
export function Thali({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 420 420" role="img" aria-label="A brass thali with Mysore Pak, laddu, murukku, badusha and burfi" className={className}>
      <defs>
        <radialGradient id={`${id}b`} cx="38%" cy="32%" r="80%">
          <stop offset="0" stopColor="#f6dd90" /><stop offset=".5" stopColor="#d9a83f" /><stop offset="1" stopColor="#9c6b16" />
        </radialGradient>
        <radialGradient id={`${id}i`} cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="#f0cf78" /><stop offset="1" stopColor="#c9962c" />
        </radialGradient>
      </defs>
      <g transform="translate(210 210)" fill="none" stroke="#f2e1a2" strokeOpacity=".4" strokeWidth="1.6">
        {Array.from({ length: 18 }, (_, i) => (
          <path key={i} transform={`rotate(${i * 20})`} d="M0 -207 C 24 -192, 24 -170, 0 -152 C -24 -170, -24 -192, 0 -207Z" />
        ))}
        {Array.from({ length: 18 }, (_, i) => <circle key={i} transform={`rotate(${i * 20 + 10}) translate(0 -196)`} r="2.4" fill="#f2e1a2" stroke="none" opacity=".6" />)}
      </g>
      <ellipse cx="214" cy="232" rx="170" ry="168" fill="#1d0504" opacity=".35" />
      <circle cx="210" cy="210" r="168" fill={`url(#${id}b)`} />
      <circle cx="210" cy="210" r="158" fill="none" stroke="#fbeab0" strokeOpacity=".7" strokeWidth="2" />
      <circle cx="210" cy="210" r="146" fill={`url(#${id}i)`} />
      <circle cx="210" cy="210" r="146" fill="none" stroke="#8a5f12" strokeOpacity=".4" strokeWidth="1.5" />
      <circle cx="210" cy="210" r="132" fill="none" stroke="#8a5f12" strokeOpacity=".25" strokeDasharray="2 6" strokeWidth="2.5" strokeLinecap="round" />
      <Pak x={132} y={150} s={58} rot={-9} />
      <Pak x={198} y={132} s={54} rot={7} />
      <Pak x={156} y={206} s={54} rot={3} />
      <Laddu x={284} y={146} r={30} />
      <Laddu x={316} y={214} r={28} />
      <Laddu x={262} y={206} r={26} />
      <Murukku x={206} y={290} r={38} />
      <Badusha x={112} y={276} r={29} />
      <Burfi x={290} y={292} s={40} />
      <Snack x={236} y={244} r={22} />
    </svg>
  );
}

const TINTS = ["#f6e8b8", "#f1e5cb", "#f5e3df", "#efe6c9"];

/** One sweet on a tinted tile. Placeholder for items that have no photo yet. */
export function SweetArt({ kind, seed = 0, className = "" }: { kind: ArtKind; seed?: number; className?: string }) {
  const tint = TINTS[seed % TINTS.length];
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className} preserveAspectRatio="xMidYMid slice">
      <rect width="100" height="100" fill={tint} />
      {Array.from({ length: 25 }, (_, i) => <circle key={i} cx={10 + (i % 5) * 20} cy={10 + Math.floor(i / 5) * 20} r="1.2" fill="#c8962c" opacity=".4" />)}
      <ellipse cx="50" cy="50" rx="38" ry="38" fill="#fffdf7" opacity=".7" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#c8962c" strokeOpacity=".55" strokeDasharray="1.5 3" />
      <g transform="translate(50 50) scale(.78) translate(-50 -50)">
        {kind === "laddu" && <><Laddu x={34} y={58} r={18} /><Laddu x={66} y={56} r={17} /><Laddu x={50} y={36} r={16} /></>}
        {kind === "pak" && <><Pak x={36} y={56} s={34} rot={-6} /><Pak x={66} y={52} s={32} rot={5} /><Pak x={50} y={34} s={30} rot={-2} /></>}
        {kind === "murukku" && <><Murukku x={50} y={50} r={30} /></>}
        {kind === "badusha" && <><Badusha x={36} y={52} r={19} /><Badusha x={66} y={50} r={18} /><Badusha x={50} y={32} r={16} /></>}
        {kind === "burfi" && <><Burfi x={36} y={56} s={26} /><Burfi x={66} y={54} s={26} /><Burfi x={50} y={34} s={24} /></>}
        {kind === "snack" && <><Snack x={50} y={52} r={34} /></>}
      </g>
    </svg>
  );
}

/** The mandala ring from the logo, as a reusable ornament. */
export function Mandala({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="-100 -100 200 200" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
      {Array.from({ length: 16 }, (_, i) => (
        <path key={i} transform={`rotate(${i * 22.5})`} d="M0 -96 C 16 -86, 16 -68, 0 -56 C -16 -68, -16 -86, 0 -96Z" />
      ))}
      {Array.from({ length: 16 }, (_, i) => <circle key={i} transform={`rotate(${i * 22.5 + 11.25}) translate(0 -88)`} r="1.8" fill="currentColor" stroke="none" />)}
      <circle r="48" /><circle r="40" strokeDasharray="2 4" />
    </svg>
  );
}
