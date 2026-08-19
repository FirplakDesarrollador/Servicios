import React, { useState, useEffect } from 'react';
import { X, Send, Phone, MessageSquareText } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'template_1',
    name: 'Presentación Básica',
    metaName: 'apertura_inicial',
    text: '¡Hola! 🤩 Mi nombre es {{1}} y soy la persona encargada de gestionar su solicitud. Es un placer atenderle. Estaré acompañándole durante el proceso y estaré atenta a cualquier inquietud que pueda presentarse. Para mí será un gusto ayudarle. ¡Bienvenido/a! 🤝',
    variables: ['Tu Nombre (Agente)'],
  },
  {
    id: 'template_2',
    name: 'Gestión de Solicitud (Formal)',
    metaName: 'apertura_inicial', // TODO: Reemplazar por el nombre real de la segunda plantilla
    text: '¡Hola, {{1}}! Espero que estés teniendo un buen día. Mi nombre es {{2}} y me comunico con usted porque tengo a mi cargo la gestión de su solicitud. Quisiera brindarle información importante sobre el estado de su caso y acompañarle en lo que necesite. Cuando tengas un momento, puedes responder a este mensaje y con gusto continuamos.',
    variables: ['Nombre del Cliente', 'Tu Nombre (Agente)'],
  }
];

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { phoneNumber: string; template: any; parameters: string[] }) => void;
}

export default function NewMessageModal({ isOpen, onClose, onSubmit }: NewMessageModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [parameters, setParameters] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Reset form on open
      setPhoneNumber('');
      setSelectedTemplateId('');
      setParameters([]);
    }
  }, [isOpen]);

  const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId);

  useEffect(() => {
    if (selectedTemplate) {
      setParameters(new Array(selectedTemplate.variables.length).fill(''));
    } else {
      setParameters([]);
    }
  }, [selectedTemplate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !selectedTemplate) return;
    
    // Validar que todos los parámetros estén llenos
    if (parameters.some(p => p.trim() === '')) {
      alert("Por favor, llena todas las variables de la plantilla.");
      return;
    }

    onSubmit({
      phoneNumber,
      template: selectedTemplate,
      parameters
    });
  };

  const handleParameterChange = (index: number, value: string) => {
    const newParams = [...parameters];
    newParams[index] = value;
    setParameters(newParams);
  };

  // Preview actual text
  const previewText = selectedTemplate 
    ? parameters.reduce((acc, param, idx) => acc.replace(`{{${idx + 1}}}`, param || `[${selectedTemplate.variables[idx]}]`), selectedTemplate.text)
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-xl w-full max-w-lg rounded-3xl shadow-2xl border border-white/50 overflow-hidden relative animate-in zoom-in-95 duration-300">
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

        {/* Header */}
        <div className="relative z-10 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-500 rounded-2xl">
              <MessageSquareText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Nueva Conversación</h2>
              <p className="text-sm text-slate-500">Inicia un chat enviando una plantilla</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="relative z-10 p-6 space-y-5">
          
          {/* Phone Number */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Número de Teléfono</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Ej. +573001234567"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-white/50 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
                required
              />
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Plantilla de Inicio</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm appearance-none"
              required
            >
              <option value="" disabled>Selecciona una plantilla...</option>
              {TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Variables (Dynamic) */}
          {selectedTemplate && selectedTemplate.variables.length > 0 && (
            <div className="space-y-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
              <h3 className="text-sm font-semibold text-indigo-900">Parámetros de la Plantilla</h3>
              <div className="space-y-3">
                {selectedTemplate.variables.map((v, idx) => (
                  <div key={idx}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{`{{${idx + 1}}} - ${v}`}</label>
                    <input
                      type="text"
                      value={parameters[idx] || ''}
                      onChange={(e) => handleParameterChange(idx, e.target.value)}
                      placeholder={`Valor para ${v}`}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm shadow-sm"
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {selectedTemplate && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Vista Previa del Mensaje</label>
              <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl border border-gray-200 shadow-inner relative">
                 <div className="absolute top-0 right-4 w-3 h-3 bg-gradient-to-br from-slate-100 to-slate-50 border-t border-l border-gray-200 rotate-45 -mt-[7px]"></div>
                 <p className="text-sm text-slate-700 whitespace-pre-wrap">{previewText}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!phoneNumber || !selectedTemplate || parameters.some(p => !p.trim())}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Send className="w-4 h-4" />
              Enviar Plantilla
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
