'use client';
import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, ChevronRight, FileSearch, Loader2, Mail, MapPin, Phone, Search, Star, Users } from 'lucide-react';
import type { CampoSocio, SocioNegocios, SocioResumen } from '@/lib/sapSocioNegocios';
import { formatMoney } from './explorer/sapFormat';
import { fetchConSesion } from '@/lib/fetchConSesion';

const tarjeta = 'bg-white rounded-2xl border border-border';

function Mensaje({ icono: Icono = AlertCircle, texto, girando = false }: { icono?: React.ElementType; texto: string; girando?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-stone-500">
      <Icono className={`w-5 h-5 ${girando ? 'animate-spin' : ''}`} aria-hidden />
      <span>{texto}</span>
    </div>
  );
}

function ListaCampos({ campos, vacio }: { campos: CampoSocio[]; vacio: string }) {
  if (campos.length === 0) return <p className="py-8 text-sm text-center text-stone-500">{vacio}</p>;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
      {campos.map((c) => (
        <div key={c.etiqueta} className="min-w-0 border-b border-border pb-2">
          <dt className="text-[11px] font-medium text-stone-500">{c.etiqueta}</dt>
          <dd className="text-sm text-brand-dark break-words mt-0.5">{c.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function Saldo({ titulo, valor, moneda, resaltar }: { titulo: string; valor: number; moneda: string | null; resaltar?: boolean }) {
  return (
    <div className="px-4 py-3 min-w-0">
      <dt className="text-[11px] font-medium text-stone-500">{titulo}</dt>
      <dd className={`text-lg font-semibold tabular-nums mt-0.5 truncate ${resaltar && valor > 0 ? 'text-[var(--c-oliva-texto)]' : 'text-brand-dark'}`}>
        {formatMoney(valor, moneda)}
      </dd>
    </div>
  );
}

type Pestana = 'general' | 'contactos' | 'direcciones' | 'pago';

/** Ficha del socio de negocios con las pestañas de SAP. */
export function DetalleSocio({ codigo, volver, onVerDocumentos }: { codigo: string; volver?: () => void; onVerDocumentos?: (codigo: string) => void }) {
  const [socio, setSocio] = useState<SocioNegocios | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('general');

  useEffect(() => {
    const control = new AbortController();
    setSocio(null);
    setError(null);
    fetchConSesion(`/api/sap/socio-negocios?codigo=${encodeURIComponent(codigo)}`, { signal: control.signal })
      .then((r) => r.json())
      .then((j) => (j.success ? setSocio(j.socio) : setError(j.error || 'No se pudo cargar el socio de negocios.')))
      .catch((e) => { if (e.name !== 'AbortError') setError('No se pudo conectar con SAP. Intenta de nuevo.'); });
    return () => control.abort();
  }, [codigo]);

  const pestanas: Array<{ id: Pestana; nombre: string }> = [
    { id: 'general', nombre: 'General' },
    { id: 'contactos', nombre: `Personas de contacto${socio ? ` (${socio.contactos.length})` : ''}` },
    { id: 'direcciones', nombre: `Direcciones${socio ? ` (${socio.direcciones.length})` : ''}` },
    { id: 'pago', nombre: 'Condiciones de pago' },
  ];

  return (
    <div className="space-y-4">
      {volver && (
        <button onClick={volver} className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-medium text-stone-600 hover:text-brand cursor-pointer">
          <ArrowLeft className="w-4 h-4" aria-hidden /> Volver a los resultados
        </button>
      )}
      {error && <div className={tarjeta}><Mensaje texto={error} /></div>}
      {!error && !socio && <div className={tarjeta}><Mensaje icono={Loader2} girando texto={`Cargando ${codigo} desde SAP…`} /></div>}
      {socio && (
        <div className={`${tarjeta} p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-brand-dark">{socio.nombre}</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-sage-soft text-brand font-medium">{socio.tipo}</span>
                {!socio.activo && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">Inactivo</span>}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                {socio.codigo}{socio.nit ? ` · NIT/Cédula ${socio.nit}` : ''}{socio.nombreExtranjero ? ` · ${socio.nombreExtranjero}` : ''}{socio.moneda ? ` · Moneda ${socio.moneda}` : ''}
              </p>
            </div>
            {onVerDocumentos && (
              <button
                onClick={() => onVerDocumentos(socio.codigo)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-sm font-medium text-brand hover:border-brand-light hover:bg-cream-light transition-colors cursor-pointer"
              >
                <FileSearch className="w-4 h-4" aria-hidden /> Ver sus documentos
              </button>
            )}
          </div>

          <dl className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border border-y border-border mt-4">
            <Saldo titulo="Saldo de cuenta" valor={socio.saldoCuenta} moneda={socio.moneda} resaltar />
            <Saldo titulo="Entregas abiertas" valor={socio.entregasAbiertas} moneda={socio.moneda} />
            <Saldo titulo="Pedidos abiertos" valor={socio.pedidosAbiertos} moneda={socio.moneda} />
            <Saldo titulo="Límite de crédito" valor={socio.limiteCredito} moneda={socio.moneda} />
          </dl>

          <div className="flex gap-1 overflow-x-auto mt-4 border-b border-border" role="tablist">
            {pestanas.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={pestana === p.id}
                onClick={() => setPestana(p.id)}
                className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 -mb-px cursor-pointer transition-colors ${pestana === p.id ? 'border-brand text-brand' : 'border-transparent text-stone-500 hover:text-brand-dark'}`}
              >
                {p.nombre}
              </button>
            ))}
          </div>

          <div className="pt-4">
            {pestana === 'general' && (
              <div className="space-y-5">
                <ListaCampos campos={socio.general} vacio="Sin datos generales." />
                {socio.comentarios && (
                  <div>
                    <h3 className="text-[11px] font-medium text-stone-500">Comentarios</h3>
                    <p className="text-sm text-brand-dark mt-1 whitespace-pre-line">{socio.comentarios}</p>
                  </div>
                )}
              </div>
            )}

            {pestana === 'contactos' && (socio.contactos.length === 0 ? (
              <p className="py-8 text-sm text-center text-stone-500">Este socio no tiene personas de contacto.</p>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {socio.contactos.map((c, i) => (
                  <li key={`${c.nombre}-${i}`} className={`rounded-xl border border-border p-3 ${c.activo ? '' : 'opacity-60'}`}>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
                      {c.predeterminado && <Star className="w-3.5 h-3.5 text-[var(--c-oliva-texto)] fill-current" aria-label="Contacto predeterminado" />}
                      {c.nombre || 'Sin nombre'}
                      {!c.activo && <span className="text-[10px] font-normal text-stone-500">(inactivo)</span>}
                    </p>
                    {c.cargo && <p className="text-xs text-stone-500">{c.cargo}</p>}
                    <div className="mt-2 space-y-1 text-xs text-stone-600">
                      {(c.telefono || c.celular) && (
                        <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-stone-400" aria-hidden />{[c.telefono, c.celular].filter(Boolean).join(' · ')}</p>
                      )}
                      {c.correo && <p className="flex items-center gap-1.5 break-all"><Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" aria-hidden />{c.correo}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ))}

            {pestana === 'direcciones' && (socio.direcciones.length === 0 ? (
              <p className="py-8 text-sm text-center text-stone-500">Este socio no tiene direcciones.</p>
            ) : (
              <div className="space-y-5">
                {(['Facturación', 'Entrega'] as const).map((tipo) => {
                  const lista = socio.direcciones.filter((d) => d.tipo === tipo);
                  if (lista.length === 0) return null;
                  return (
                    <section key={tipo}>
                      <h3 className="text-[11px] font-medium tracking-wide uppercase text-stone-500 mb-2">Dirección de {tipo.toLowerCase()}</h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {lista.map((d) => (
                          <li key={`${tipo}-${d.id}`} className="rounded-xl border border-border p-3">
                            <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
                              <MapPin className="w-3.5 h-3.5 text-stone-400" aria-hidden />
                              {d.id || 'Sin identificador'}
                              {d.predeterminada && <span className="text-[10px] px-1.5 py-px rounded-full bg-sage-soft text-brand font-medium">Predeterminada</span>}
                            </p>
                            <p className="text-xs text-stone-600 mt-1">{d.direccion || '—'}</p>
                            <p className="text-xs text-stone-500">{[d.ciudad, d.departamento, d.pais].filter(Boolean).join(', ')}</p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            ))}

            {pestana === 'pago' && <ListaCampos campos={socio.condicionesPago} vacio="Sin condiciones de pago registradas." />}
          </div>
        </div>
      )}
    </div>
  );
}

/** Módulo Datos maestros socio de negocios de SAP, solo consulta. */
export default function SocioNegociosSap({ onVerDocumentos }: { onVerDocumentos?: (codigo: string) => void }) {
  const [texto, setTexto] = useState('');
  const [consulta, setConsulta] = useState<string | null>(null);
  const [socios, setSocios] = useState<SocioResumen[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    if (!consulta) return;
    const control = new AbortController();
    setCargando(true);
    setError(null);
    setSocios(null);
    fetchConSesion(`/api/sap/socio-negocios?q=${encodeURIComponent(consulta)}`, { signal: control.signal })
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return setError(j.error || 'No se pudo hacer la búsqueda.');
        // Un solo resultado: se abre directo, como hace SAP
        if (j.socios.length === 1) setSeleccionado(j.socios[0].codigo);
        setSocios(j.socios);
      })
      .catch((e) => { if (e.name !== 'AbortError') setError('No se pudo conectar con SAP. Intenta de nuevo.'); })
      .finally(() => { if (!control.signal.aborted) setCargando(false); });
    return () => control.abort();
  }, [consulta]);

  if (seleccionado) {
    return (
      <DetalleSocio
        codigo={seleccionado}
        volver={socios && socios.length > 1 ? () => setSeleccionado(null) : () => { setSeleccionado(null); setSocios(null); setConsulta(null); }}
        onVerDocumentos={onVerDocumentos}
      />
    );
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); if (texto.trim().length >= 2) setConsulta(texto.trim()); }}
        className={`${tarjeta} flex gap-2 p-2`}
      >
        <label className="flex-1 min-w-0 flex items-center gap-2 h-11 px-3 rounded-xl border border-border">
          <Search className="w-4 h-4 text-brand-light shrink-0" aria-hidden />
          <span className="sr-only">Buscar socio de negocios</span>
          <input
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Código, nombre o cédula / NIT"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-brand-dark placeholder:text-stone-500"
          />
        </label>
        <button type="submit" disabled={texto.trim().length < 2} className="h-11 px-6 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover disabled:opacity-50 transition-colors cursor-pointer">
          Buscar
        </button>
      </form>

      <div className={tarjeta}>
        {cargando && <Mensaje icono={Loader2} girando texto={`Buscando “${consulta}” en SAP…`} />}
        {error && <Mensaje texto={error} />}
        {!cargando && !error && socios === null && <Mensaje icono={Users} texto="Busca un cliente o proveedor por su código, nombre o cédula / NIT." />}
        {!cargando && !error && socios?.length === 0 && <Mensaje icono={Users} texto={`No hay socios de negocios para “${consulta}”.`} />}
        {!cargando && !error && socios && socios.length > 1 && (
          <>
            <p className="px-5 pt-4 pb-2 text-xs text-stone-500">
              {socios.length === 50 ? 'Primeros 50 socios; afina la búsqueda si no ves el tuyo.' : `${socios.length} socios`}
            </p>
            <ul>
              {socios.map((s) => (
                <li key={s.codigo} className="border-t border-border">
                  <button
                    onClick={() => setSeleccionado(s.codigo)}
                    className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-cream-light transition-colors cursor-pointer"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-brand-dark truncate">{s.nombre}</span>
                      <span className="block text-[11px] text-stone-500">
                        {s.codigo}{s.nit ? ` · ${s.nit}` : ''}{s.ciudad ? ` · ${s.ciudad}` : ''}
                      </span>
                    </span>
                    <span className="text-[11px] text-stone-500 shrink-0">{s.tipo}</span>
                    <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
