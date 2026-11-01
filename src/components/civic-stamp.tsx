/** A rubber stamp: the mark that closes a file, in English and Kannada. */
export default function CivicStamp({
  english,
  kannada,
  className = "",
}: {
  english: string;
  kannada: string;
  className?: string;
}) {
  return (
    <span className={"civic-stamp " + className} aria-hidden="true">
      <b>{english}</b>
      <span lang="kn">{kannada}</span>
    </span>
  );
}
export function StampTexture() {
  return (
    <svg width="0" height="0" className="stamp-texture" aria-hidden="true">
      <filter id="stamp-rough">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75"
          result="speckle"
        />
        <feComposite in="SourceGraphic" in2="speckle" operator="in" />
      </filter>
    </svg>
  );
}
