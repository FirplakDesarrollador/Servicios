'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AsesoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAsesoresChanged: () => void;
}

export default function AsesoresModal({ isOpen, onClose, onAsesoresChanged }: AsesoresModalProps) {
  const [asesores, setAsesores] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newNombre, setNewNombre] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNombre, setEditingNombre] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAsesores = async () => {
    const { data } = await supabase
      .from('whatsapp_asesores')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });
    if (data) setAsesores(data);
  };

  const fetchSystemUsers = async () => {
    const { data } = await supabase
      .from('Usuarios')
      .select('id, user_id, nombres, apellidos, display_name, correo')
      .order('display_name', { ascending: true });
    if (data) setSystemUsers(data);
  };

  useEffect(() => {
    if (isOpen) {
      fetchAsesores();
      fetchSystemUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectSystemUser = (val: string) => {
    setSelectedUserId(val);
    if (!val) return;
    const found = systemUsers.find(u => (u.user_id && u.user_id === val) || String(u.id) === val);
    if (found) {
      const name = found.display_name?.trim() || `${found.nombres || ''} ${found.apellidos || ''}`.trim() || found.correo;
      setNewNombre(name);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim()) return;

    setLoading(true);
    const foundUser = systemUsers.find(u => (u.user_id && u.user_id === selectedUserId) || String(u.id) === selectedUserId);
    const { error } = await supabase
      .from('whatsapp_asesores')
      .insert([{ 
        nombre: newNombre.trim(), 
        usuario_id: foundUser?.user_id || null,
        correo: foundUser?.correo || null,
        activo: true 
      }]);

    setLoading(false);
    if (error) {
      alert('Error agregando asesor: ' + error.message);
    } else {
      setNewNombre('');
      setSelectedUserId('');
      await fetchAsesores();
      onAsesoresChanged();
    }
  };

  const handleStartEdit = (asesor: any) => {
    setEditingId(asesor.id);
    setEditingNombre(asesor.nombre);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingNombre.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from('whatsapp_asesores')
      .update({ nombre: editingNombre.trim() })
      .eq('id', id);

    setLoading(false);
    if (error) {
      alert('Error actualizando asesor: ' + error.message);
    } else {
      setEditingId(null);
      setEditingNombre('');
      await fetchAsesores();
      onAsesoresChanged();
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar al asesor "${nombre}"?`)) return;

    setLoading(true);
    const { error } = await supabase
      .from('whatsapp_asesores')
      .delete()
      .eq('id', id);

    setLoading(false);
    if (error) {
      alert('Error eliminando asesor: ' + error.message);
    } else {
      await fetchAsesores();
      onAsesoresChanged();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Gestionar Asesores</h2>
              <p className="text-xs text-slate-500">Agrega, edita o elimina asesores del sistema</p>
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
        <div className="p-6 space-y-6">
          
          {/* Add form */}
          <form onSubmit={handleAdd} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Asociar Nueva Cuenta de Usuario
            </span>
            
            {/* System user select */}
            {systemUsers.length > 0 && (
              <div>
                <select
                  value={selectedUserId}
                  onChange={(e) => handleSelectSystemUser(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-700 cursor-pointer"
                >
                  <option value="">-- Seleccionar de Usuarios del Sistema --</option>
                  {systemUsers.map((u) => {
                    const val = u.user_id || String(u.id);
                    const name = u.display_name?.trim() || `${u.nombres || ''} ${u.apellidos || ''}`.trim() || u.correo;
                    return (
                      <option key={val} value={val}>
                        {name} ({u.correo || 'Sin correo'})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="O escribe el nombre del asesor..."
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                className="flex-1 px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
              />
              <button
                type="submit"
                disabled={loading || !newNombre.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>
          </form>

          {/* List of Asesores */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Asesores Registrados ({asesores.length})
            </span>
            {asesores.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No hay asesores registrados aún.</p>
            ) : (
              asesores.map((asesor) => (
                <div
                  key={asesor.id}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:bg-white hover:shadow-sm"
                >
                  {editingId === asesor.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editingNombre}
                        onChange={(e) => setEditingNombre(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-indigo-300 rounded-xl outline-none text-slate-800 font-semibold"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(asesor.id)}
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
                  ) : (
                    <>
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-sm font-semibold text-slate-700 truncate">{asesor.nombre}</span>
                        {asesor.correo && (
                          <span className="text-[10px] text-indigo-500 truncate font-medium">{asesor.correo}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(asesor)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(asesor.id, asesor.nombre)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
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
