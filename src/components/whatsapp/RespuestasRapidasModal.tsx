'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface RespuestaRapida {
  id: number;
  nombre_respuesta: string;
  respuesta_rapida: string;
}

interface RespuestasRapidasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChanged: () => void;
  // Texto con el que arranca el formulario (p. ej. "Guardar como respuesta rápida" desde el chat)
  initialTexto?: string;
}

export default function RespuestasRapidasModal({ isOpen, onClose, onChanged, initialTexto }: RespuestasRapidasModalProps) {
  const [respuestas, setRespuestas] = useState<RespuestaRapida[]>([]);
  const [newNombre, setNewNombre] = useState('');
  const [newTexto, setNewTexto] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNombre, setEditingNombre] = useState('');
  const [editingTexto, setEditingTexto] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchRespuestas = async () => {
    const { data, error } = await supabase
      .from('respuestas_rapidas')
      .select('id, nombre_respuesta, respuesta_rapida')
      .order('nombre_respuesta', { ascending: true });
    if (error) console.error('Error cargando respuestas rápidas:', error);
    if (data) setRespuestas(data);
  };

  useEffect(() => {
    if (isOpen) {
      fetchRespuestas();
      setNewNombre('');
      setNewTexto(initialTexto || '');
      setEditingId(null);
    }
  }, [isOpen, initialTexto]);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim() || !newTexto.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from('respuestas_rapidas')
      .insert([{ nombre_respuesta: newNombre.trim(), respuesta_rapida: newTexto.trim() }]);

    setLoading(false);
    if (error) {
      alert('Error guardando la respuesta: ' + error.message);
    } else {
      setNewNombre('');
      setNewTexto('');
      await fetchRespuestas();
      onChanged();
    }
  };

  const handleStartEdit = (r: RespuestaRapida) => {
    setEditingId(r.id);
    setEditingNombre(r.nombre_respuesta);
    setEditingTexto(r.respuesta_rapida);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingNombre.trim() || !editingTexto.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from('respuestas_rapidas')
      .update({ nombre_respuesta: editingNombre.trim(), respuesta_rapida: editingTexto.trim() })
      .eq('id', id);

    setLoading(false);
    if (error) {
      alert('Error actualizando la respuesta: ' + error.message);
    } else {
      setEditingId(null);
      await fetchRespuestas();
      onChanged();
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar la respuesta "${nombre}"?`)) return;

    setLoading(true);
    const { error } = await supabase
      .from('respuestas_rapidas')
      .delete()
      .eq('id', id);

    setLoading(false);
    if (error) {
      alert('Error eliminando la respuesta: ' + error.message);
    } else {
      await fetchRespuestas();
      onChanged();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Respuestas rápidas</h2>
              <p className="text-xs text-slate-500">Mensajes guardados para todo el equipo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">

          {/* Add form */}
          <form onSubmit={handleAdd} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Nueva respuesta
            </span>
            <input
              type="text"
              placeholder="Nombre o atajo (ej: saludo, garantia)"
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
            />
            <textarea
              placeholder="Texto del mensaje..."
              value={newTexto}
              onChange={(e) => setNewTexto(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 resize-y"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-400">
                Usa <code className="text-indigo-500">{'{nombre}'}</code> para el nombre del contacto y <code className="text-indigo-500">{'{asesor}'}</code> para tu nombre.
              </p>
              <button
                type="submit"
                disabled={loading || !newNombre.trim() || !newTexto.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </form>

          {/* List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Respuestas guardadas ({respuestas.length})
            </span>
            {respuestas.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No hay respuestas guardadas aún.</p>
            ) : (
              respuestas.map((r) => (
                <div
                  key={r.id}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:bg-white hover:shadow-sm"
                >
                  {editingId === r.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingNombre}
                        onChange={(e) => setEditingNombre(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-300 rounded-xl outline-none text-slate-800 font-semibold"
                        autoFocus
                      />
                      <textarea
                        value={editingTexto}
                        onChange={(e) => setEditingTexto(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-300 rounded-xl outline-none text-slate-800 resize-y"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSaveEdit(r.id)}
                          disabled={loading}
                          className="p-1.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"
                          title="Guardar"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-indigo-600 truncate">/{r.nombre_respuesta}</span>
                        <span className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-3">{r.respuesta_rapida}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(r)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id, r.nombre_respuesta)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-all"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
