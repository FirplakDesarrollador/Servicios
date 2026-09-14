'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Ticket, Save, Upload, X, Loader2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SubirTicketPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tienda: '',
    tipo_solicitud: '',
    tipo_solicitud_otro: '',
    fecha_novedad: '',
    observaciones: '',
    prioridad: '',
    fecha_ideal_solucion: '',
  });

  const [files, setFiles] = useState<File[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    const urls: string[] = [];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `evidencias/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tickets_evidencias')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('tickets_evidencias')
        .getPublicUrl(filePath);

      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Intentar obtener el ID del usuario actual de la sesión o de la tabla Usuarios
      // Por simplicidad en este ejemplo, si no hay sesión asumiremos null
      // (Se recomienda tener Auth configurado para que el usuario se capture correctamente)
      let userId = null;
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
         // Intentar buscar este uuid en la tabla Usuarios si lo requieres
         const { data: usuarioRecord } = await supabase
           .from('Usuarios')
           .select('id')
           .eq('user_id', userData.user.id)
           .single();
         if (usuarioRecord) {
           userId = usuarioRecord.id;
         }
      }

      // 1. Subir archivos
      const evidenciasUrls = files.length > 0 ? await uploadFiles() : [];

      // 2. Guardar en base de datos
      const { error: dbError } = await supabase.from('tickets_tiendas').insert([
        {
          tienda: formData.tienda,
          tipo_solicitud: formData.tipo_solicitud,
          tipo_solicitud_otro: formData.tipo_solicitud === 'otros' ? formData.tipo_solicitud_otro : null,
          fecha_novedad: formData.fecha_novedad,
          observaciones: formData.observaciones,
          prioridad: formData.prioridad,
          fecha_ideal_solucion: formData.fecha_ideal_solucion,
          evidencias_urls: evidenciasUrls,
          usuario_id: userId,
          // created_at y estado ("Abierto") se generan por defecto
        }
      ]);

      if (dbError) throw dbError;

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al guardar el ticket');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-10 max-w-md text-center shadow-xl shadow-slate-200/50"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">¡Ticket Creado!</h2>
          <p className="text-slate-500 mb-8">
            Tu ticket se ha registrado exitosamente. Nuestro equipo lo revisará lo más pronto posible.
          </p>
          <button 
            onClick={() => router.push('/ver-tickets')}
            className="w-full bg-brand text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:opacity-90 transition-opacity"
          >
            Ver mis tickets
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-sans p-4 md:p-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-brand tracking-tight flex items-center gap-3">
              <Ticket className="w-7 h-7 md:w-8 md:h-8 text-sky-500 hidden sm:block" />
              Subir Ticket
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">Crea un nuevo ticket de soporte o requerimiento</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] p-6 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100"
        >
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tienda */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Tienda *</label>
                <select
                  name="tienda"
                  value={formData.tienda}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                >
                  <option value="">Selecciona una tienda</option>
                  <option value="bogota">Bogotá</option>
                  <option value="medellin">Medellín</option>
                  <option value="cali">Cali</option>
                  <option value="ecomerce">E-commerce</option>
                </select>
              </div>

              {/* Fecha Novedad */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Fecha de novedad *</label>
                <input
                  type="date"
                  name="fecha_novedad"
                  value={formData.fecha_novedad}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                />
              </div>

              {/* Tipo de Solicitud */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Tipo de solicitud *</label>
                <select
                  name="tipo_solicitud"
                  value={formData.tipo_solicitud}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                >
                  <option value="">Selecciona un tipo</option>
                  <option value="infraestructura">Infraestructura</option>
                  <option value="marketing">Marketing</option>
                  <option value="comercial">Comercial</option>
                  <option value="otros">Otros</option>
                </select>
              </div>

              {/* Tipo de Solicitud: Otro */}
              {formData.tipo_solicitud === 'otros' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">¿Cuál? *</label>
                  <input
                    type="text"
                    name="tipo_solicitud_otro"
                    value={formData.tipo_solicitud_otro}
                    onChange={handleChange}
                    required
                    placeholder="Especifique..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                  />
                </div>
              )}

              {/* Prioridad */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Prioridad *</label>
                <select
                  name="prioridad"
                  value={formData.prioridad}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                >
                  <option value="">Selecciona la prioridad</option>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>

              {/* Fecha ideal de solución */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Fecha ideal de solución *</label>
                <input
                  type="date"
                  name="fecha_ideal_solucion"
                  value={formData.fecha_ideal_solucion}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                />
              </div>
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Observaciones *</label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Detalla tu solicitud aquí..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-none"
              />
            </div>

            {/* Evidencias */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700">Adjuntar fotos o videos</label>
              <div className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <Upload className="w-8 h-8 text-slate-400 mb-4" />
                <p className="text-sm text-slate-600 mb-4">
                  Haz clic para explorar y seleccionar archivos o arrástralos aquí.
                </p>
                <label className="cursor-pointer bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors shadow-sm">
                  Seleccionar Archivos
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              
              {/* Preview Archivos */}
              {files.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {files.map((file, i) => (
                    <div key={i} className="relative bg-slate-100 rounded-xl p-3 flex items-center justify-between group">
                      <span className="text-xs font-medium text-slate-600 truncate max-w-[100px]">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="p-1 bg-red-100 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-slate-100 my-8" />

            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-brand text-white px-8 py-4 rounded-xl font-black uppercase text-sm tracking-widest hover:bg-brand/90 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand/20 w-full sm:w-auto"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {loading ? 'Guardando...' : 'Crear Ticket'}
              </button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
