'use client';

import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, Eye, FileImage, FileText, File as FileIcon, Loader2, Paperclip, X } from 'lucide-react';
import { fetchConSesion } from '@/lib/fetchConSesion';
import { formatDate } from './sapFormat';

interface SapAttachment {
  line: number;
  name: string;
  extension: string;
  date: string | null;
  note: string | null;
  viewable: boolean;
}

// La ruta exige la sesión en un encabezado, que un iframe, una imagen o un enlace no pueden enviar:
// el archivo se pide con fetch y se muestra o descarga desde una URL local del navegador.
async function pedirAnexo(absEntry: number, a: SapAttachment, signal?: AbortSignal): Promise<Blob> {
  const res = await fetchConSesion(`/api/sap/attachments?absEntry=${absEntry}&line=${a.line}`, { signal });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.message || `Error ${res.status}`);
  }
  return res.blob();
}

function guardarArchivo(url: string, nombre: string) {
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
}

function AttachmentIcon({ ext }: { ext: string }) {
  const Icon = ext === 'pdf' ? FileText : ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext) ? FileImage : FileIcon;
  return (
    <span className="w-9 h-9 shrink-0 rounded-lg bg-sage-soft text-brand flex items-center justify-center">
      <Icon className="w-4 h-4" />
    </span>
  );
}

/** Visor a pantalla completa de un anexo (PDF o imagen) servido desde SAP. */
export function VisorAnexo({ absEntry, attachment, onClose }: { absEntry: number; attachment: SapAttachment; onClose: () => void }) {
  const [archivo, setArchivo] = useState<{ url: string | null; error: string | null }>({ url: null, error: null });
  const isPdf = attachment.extension === 'pdf';
  const url = archivo.url;

  useEffect(() => {
    const controller = new AbortController();
    let urlLocal: string | null = null;
    pedirAnexo(absEntry, attachment, controller.signal)
      .then((blob) => {
        urlLocal = URL.createObjectURL(blob);
        setArchivo({ url: urlLocal, error: null });
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setArchivo({ url: null, error: err.message });
      });
    return () => {
      controller.abort();
      if (urlLocal) URL.revokeObjectURL(urlLocal);
    };
  }, [absEntry, attachment]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-brand-dark/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden border border-border shadow-[0_30px_60px_-20px_rgba(37,65,83,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AttachmentIcon ext={attachment.extension} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-dark truncate">{attachment.name}</p>
              <p className="text-[11px] text-stone-400">Anexo SAP · {formatDate(attachment.date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {url && (
              <>
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium text-stone-600 hover:border-brand-light hover:text-brand transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir en pestaña
                </a>
                <a href={url} download={attachment.name} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                  <Download className="w-3.5 h-3.5" /> Descargar
                </a>
              </>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-brand hover:bg-cream-light transition-colors cursor-pointer" title="Cerrar (Esc)">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-cream-light flex items-center justify-center overflow-auto">
          {archivo.error ? (
            <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{archivo.error}</p>
          ) : !url ? (
            <span className="flex items-center gap-2 text-sm text-stone-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando anexo…
            </span>
          ) : isPdf ? (
            <iframe src={url} className="w-full h-full border-0" title={attachment.name} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={attachment.name} className="max-w-full max-h-full object-contain" />
          )}
        </div>
      </div>
    </div>
  );
}

/** Lista de anexos de un documento SAP (su AttachmentEntry), con visor para PDF e imágenes. */
export default function AnexosSap({ absEntry, compact = false }: { absEntry: number | null | undefined; compact?: boolean }) {
  const [state, setState] = useState<{ entry: number | null; items: SapAttachment[] | null; error: string | null }>({
    entry: null,
    items: null,
    error: null,
  });
  const [viewing, setViewing] = useState<SapAttachment | null>(null);
  const [descarga, setDescarga] = useState<{ line: number | null; error: string | null }>({ line: null, error: null });

  const descargar = async (entry: number, a: SapAttachment) => {
    setDescarga({ line: a.line, error: null });
    try {
      const url = URL.createObjectURL(await pedirAnexo(entry, a));
      guardarArchivo(url, a.name);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setDescarga({ line: null, error: null });
    } catch (err) {
      setDescarga({ line: null, error: err instanceof Error ? err.message : 'No se pudo descargar el anexo' });
    }
  };

  useEffect(() => {
    if (!absEntry) return;
    const controller = new AbortController();
    setState({ entry: absEntry, items: null, error: null });
    fetchConSesion(`/api/sap/attachments?absEntry=${absEntry}`, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || `Error ${res.status}`);
        setState({ entry: absEntry, items: json.attachments, error: null });
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setState({ entry: absEntry, items: null, error: err.message });
      });
    return () => controller.abort();
  }, [absEntry]);

  if (!absEntry) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-stone-400">
        <Paperclip className="w-6 h-6" />
        <p className="text-sm">Este documento no tiene anexos en SAP.</p>
      </div>
    );
  }

  const loading = state.entry !== absEntry || (!state.items && !state.error);
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-stone-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Cargando anexos…</span>
      </div>
    );
  }
  if (state.error) {
    return <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>;
  }

  return (
    <>
      <ul className={`divide-y divide-border ${compact ? '' : 'rounded-xl border border-border bg-white'}`}>
        {state.items!.map((a) => (
          <li key={a.line} className="flex items-center gap-3 px-4 py-3">
            <AttachmentIcon ext={a.extension} />
            <div className="flex-1 min-w-0">
              <button
                onClick={() => (a.viewable ? setViewing(a) : descargar(absEntry, a))}
                className="text-sm font-medium text-brand-dark hover:text-brand truncate max-w-full text-left cursor-pointer"
              >
                {a.name}
              </button>
              <p className="text-[11px] text-stone-400">
                {formatDate(a.date)}{a.note ? ` · ${a.note}` : ''}
              </p>
            </div>
            {a.viewable && (
              <button
                onClick={() => setViewing(a)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> Ver
              </button>
            )}
            <button
              onClick={() => descargar(absEntry, a)}
              disabled={descarga.line === a.line}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border text-stone-500 hover:border-brand-light hover:text-brand transition-colors cursor-pointer disabled:opacity-60"
              title="Descargar"
            >
              {descarga.line === a.line ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            </button>
          </li>
        ))}
      </ul>
      {descarga.error && <p className="mt-2 text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{descarga.error}</p>}
      {viewing && <VisorAnexo absEntry={absEntry} attachment={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
