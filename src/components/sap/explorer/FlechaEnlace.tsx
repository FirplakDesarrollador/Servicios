import React from 'react';
import { ArrowRight } from 'lucide-react';

/** Flecha de enlace de SAP: abre encima el dato maestro del valor que tiene al lado. */
export function FlechaEnlace({ titulo, onClick }: { titulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-amber-600 hover:bg-amber-100 hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-brand-light transition-colors cursor-pointer"
    >
      <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} aria-hidden />
    </button>
  );
}
