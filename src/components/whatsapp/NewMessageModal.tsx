import React, { useState, useEffect } from 'react';
import { X, Send, Phone, MessageSquareText } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'template_1',
    name: 'Presentación Básica',
    metaName: 'apertura_inicial',
    languageCode: 'es_CO',
    text: '¡Hola! 😊 Mi nombre es {{1}} y soy la persona encargada de gestionar su solicitud.\nEs un placer atenderle. Estaré acompañándole durante el proceso y estaré atenta a cualquier inquietud que pueda presentarse.\nPara mí será un gusto ayudarle. ¡Bienvenido/a! 🤝',
    variables: ['Tu Nombre (Agente)'],
  },
  {
    id: 'template_2',
    name: 'Gestión de Solicitud (Formal)',
    metaName: 'plantilla_despues_de_24_horas',
    languageCode: 'en',
    text: '¡Hola, {{1}}! Espero que estés teniendo un buen día.\nMi nombre es {{2}} y me comunico con usted porque tengo a mi cargo la gestión de su solicitud. Quisiera brindarle información importante sobre el estado de su caso y acompañarle en lo que necesite.\nCuando tengas un momento, puedes responder a este mensaje y con gusto continuamos.',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/40 backdrop-blur-[2px] animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-border overflow-hidden relative animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative z-10 px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
              <MessageSquareText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-brand-dark">Nueva Conversación</h2>
              <p className="text-sm text-stone-500">Inicia un chat enviando una plantilla</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="relative z-10 p-6 space-y-5">
          
          {/* Phone Number */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-stone-700">Número de Teléfono</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-stone-400" />
              </div>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Ej. +573001234567"
                className="block w-full pl-10 pr-3 py-2.5 border border-border rounded-xl bg-white text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-brand-light transition-all"
                required
              />
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-stone-700">Plantilla de Inicio</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="block w-full px-3 py-2.5 border border-border rounded-xl bg-white text-stone-700 focus:outline-none focus:border-brand-light transition-all appearance-none"
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
            <div className="space-y-3 p-4 bg-cream-light rounded-xl border border-border">
              <h3 className="text-sm font-semibold text-brand">Parámetros de la Plantilla</h3>
              <div className="space-y-3">
                {selectedTemplate.variables.map((v, idx) => (
                  <div key={idx}>
                    <label className="block text-xs font-medium text-stone-600 mb-1">{`{{${idx + 1}}} - ${v}`}</label>
                    <input
                      type="text"
                      value={parameters[idx] || ''}
                      onChange={(e) => handleParameterChange(idx, e.target.value)}
                      placeholder={`Valor para ${v}`}
                      className="block w-full px-3 py-2 border border-border rounded-lg bg-white text-stone-700 focus:outline-none transition-all text-sm"
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
              <label className="block text-sm font-semibold text-stone-700">Vista Previa del Mensaje</label>
              <div className="p-4 bg-cream-light rounded-2xl border border-border relative">
                 <div className="absolute top-0 right-4 w-3 h-3 bg-cream-light border-t border-l border-border rotate-45 -mt-[7px]"></div>
                 <p className="text-sm text-stone-700 whitespace-pre-wrap">{previewText}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-stone-600 hover:text-brand-dark hover:bg-stone-100 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!phoneNumber || !selectedTemplate || parameters.some(p => !p.trim())}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand hover:bg-brand-hover rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
