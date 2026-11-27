/** Isotipo "A" de FIRPLAK en SVG (nítido a cualquier tamaño; toma el color de `currentColor`). */
export default function FirplakMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 142 152" className={className} fill="currentColor" aria-hidden="true">
      <path d="M48 0H94L142 152H111L71 34L31 152H0Z" />
      <path d="M71 102L86 152H56Z" />
    </svg>
  );
}
