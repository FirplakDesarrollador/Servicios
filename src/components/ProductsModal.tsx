'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Loader2, Package, Tag, Hash, Box, Edit2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BuscadorProductos from './solicitar-servicio/BuscadorProductos';
import BuscadorRepuestos from './solicitar-servicio/BuscadorRepuestos';

interface ProductsModalProps {
    isOpen: boolean;
    onClose: () => void;
    servicioId: number;
}

export default function ProductsModal({ isOpen, onClose, servicioId }: ProductsModalProps) {
    const [loading, setLoading] = useState(true);
    const [productos, setProductos] = useState<any[]>([]);
    const [repuestos, setRepuestos] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    
    // Pickers states
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [showRepuestoPicker, setShowRepuestoPicker] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Products
            const { data: prodData, error: prodError } = await supabase
                .from('productos_servicios')
                .select('*, producto:producto_id(*)')
                .eq('servicio_id', servicioId);

            if (prodError) throw prodError;

            // Fetch Repuestos
            const { data: repData, error: repError } = await supabase
                .from('Repuestos_Servicios')
                .select('*, repuesto:repuesto_id(*)')
                .eq('servicio_id', servicioId);

            if (repError) throw repError;

            setProductos(prodData || []);
            setRepuestos(repData || []);
        } catch (error) {
            console.error('Error fetching associated products:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchData();
        } else {
            setIsEditing(false);
        }
    }, [isOpen, servicioId]);

    const handleRemoveProduct = async (id: number) => {
        if (!window.confirm('¿Eliminar este producto del servicio?')) return;
        
        try {
            const { error } = await supabase
                .from('productos_servicios')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setProductos(prev => prev.filter(p => p.id !== id));
        } catch (error: any) {
            alert('Error al eliminar: ' + error.message);
        }
    };

    const handleRemoveRepuesto = async (id: number) => {
        if (!window.confirm('¿Eliminar este repuesto del servicio?')) return;
        
        try {
            const { error } = await supabase
                .from('Repuestos_Servicios')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setRepuestos(prev => prev.filter(r => r.id !== id));
        } catch (error: any) {
            alert('Error al eliminar: ' + error.message);
        }
    };

    const handleUpdateQuantity = async (table: string, id: number, quantity: number) => {
        if (quantity < 1) return;
        try {
            const { error } = await supabase
                .from(table)
                .update({ cantidad: quantity })
                .eq('id', id);

            if (error) throw error;
            
            if (table === 'productos_servicios') {
                setProductos(prev => prev.map(p => p.id === id ? { ...p, cantidad: quantity } : p));
            } else {
                setRepuestos(prev => prev.map(r => r.id === id ? { ...r, cantidad: quantity } : r));
            }
        } catch (error: any) {
            alert('Error al actualizar cantidad: ' + error.message);
        }
    };

    const handleAddProduct = async (producto: any) => {
        try {
            const { data, error } = await supabase
                .from('productos_servicios')
                .insert([{
                    servicio_id: servicioId,
                    producto_id: producto.id,
                    cantidad: 1,
                    created_at: new Date().toISOString()
                }])
                .select('*, producto:producto_id(*)')
                .single();

            if (error) throw error;
            setProductos(prev => [...prev, data]);
        } catch (error: any) {
            alert('Error al agregar producto: ' + error.message);
        }
    };

    const handleAddRepuesto = async (repuesto: any) => {
        try {
            const { data, error } = await supabase
                .from('Repuestos_Servicios')
                .insert([{
                    servicio_id: servicioId,
                    repuesto_id: repuesto.id,
                    cantidad: 1,
                    created_at: new Date().toISOString()
                }])
                .select('*, repuesto:repuesto_id(*)')
                .single();

            if (error) throw error;
            setRepuestos(prev => [...prev, data]);
        } catch (error: any) {
            alert('Error al agregar repuesto: ' + error.message);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Productos & Repuestos</h2>
                                <p className="text-sm text-slate-400 font-medium">Gestionar items asociados</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                                        isEditing 
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {isEditing ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Terminar Edición
                                        </>
                                    ) : (
                                        <>
                                            <Edit2 className="w-4 h-4" />
                                            Editar Items
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"
                                >
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-10 h-10 text-brand animate-spin" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando items...</p>
                                </div>
                            ) : productos.length === 0 && repuestos.length === 0 && !isEditing ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-4">
                                        <Package className="w-10 h-10 text-slate-200" />
                                    </div>
                                    <p className="text-slate-500 font-bold text-lg tracking-tight">No hay items registrados</p>
                                    <p className="text-slate-400 text-sm">Este servicio no tiene productos ni repuestos asignados.</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Products Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between ml-2">
                                            <h3 className="text-xs font-black text-brand uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Box className="w-4 h-4" />
                                                Productos ({productos.length})
                                            </h3>
                                            {isEditing && (
                                                <button 
                                                    onClick={() => setShowProductPicker(true)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:scale-105 transition-all shadow-sm shadow-brand/20"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    Agregar
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid gap-3">
                                            {productos.map((item) => (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="group bg-slate-50 border border-slate-100 rounded-3xl p-5 hover:bg-white hover:border-brand/20 hover:shadow-xl hover:shadow-brand/5 transition-all duration-300 flex items-start gap-4"
                                                >
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:bg-brand group-hover:border-brand transition-colors duration-300 flex-shrink-0 mt-1">
                                                        <Package className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-black text-brand uppercase tracking-wider bg-brand/5 px-2 py-0.5 rounded-lg border border-brand/10">
                                                                {item.producto?.sku || 'N/A'}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-400 italic">
                                                                {item.producto?.grupo}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-800 break-words uppercase tracking-tight leading-tight">
                                                            {item.producto?.nombre}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <div className="text-right">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cantidad</span>
                                                            {isEditing ? (
                                                                <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                                                    <button 
                                                                        onClick={() => handleUpdateQuantity('productos_servicios', item.id, item.cantidad - 1)}
                                                                        className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 text-slate-400 transition-colors"
                                                                    >-</button>
                                                                    <span className="w-8 text-center text-sm font-black text-slate-700">{item.cantidad}</span>
                                                                    <button 
                                                                        onClick={() => handleUpdateQuantity('productos_servicios', item.id, item.cantidad + 1)}
                                                                        className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 text-slate-400 transition-colors"
                                                                    >+</button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-lg font-black text-slate-800 bg-white px-3 py-1 rounded-xl border border-slate-100 shadow-sm">
                                                                    {item.cantidad}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isEditing && (
                                                            <button 
                                                                onClick={() => handleRemoveProduct(item.id)}
                                                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                                title="Eliminar producto"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                            {productos.length === 0 && (
                                                <div className="text-center py-6 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Sin productos asignados</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Repuestos Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between ml-2">
                                            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Tag className="w-4 h-4" />
                                                Repuestos / Kits ({repuestos.length})
                                            </h3>
                                            {isEditing && (
                                                <button 
                                                    onClick={() => setShowRepuestoPicker(true)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:scale-105 transition-all shadow-sm shadow-indigo-200"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    Agregar
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid gap-3">
                                            {repuestos.map((item) => (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="group bg-indigo-50/30 border border-indigo-100/50 rounded-3xl p-5 hover:bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex items-start gap-4"
                                                >
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-indigo-50 group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-colors duration-300 flex-shrink-0 mt-1">
                                                        <Hash className="w-6 h-6 text-indigo-300 group-hover:text-white transition-colors" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                                                {item.repuesto?.sku || 'N/A'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-800 break-words uppercase tracking-tight leading-tight">
                                                            {item.repuesto?.nombre}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <div className="text-right">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cantidad</span>
                                                            {isEditing ? (
                                                                <div className="flex items-center bg-white rounded-xl border border-indigo-200 overflow-hidden shadow-sm">
                                                                    <button 
                                                                        onClick={() => handleUpdateQuantity('Repuestos_Servicios', item.id, item.cantidad - 1)}
                                                                        className="w-8 h-8 flex items-center justify-center hover:bg-indigo-50 text-indigo-400 transition-colors"
                                                                    >-</button>
                                                                    <span className="w-8 text-center text-sm font-black text-slate-700">{item.cantidad}</span>
                                                                    <button 
                                                                        onClick={() => handleUpdateQuantity('Repuestos_Servicios', item.id, item.cantidad + 1)}
                                                                        className="w-8 h-8 flex items-center justify-center hover:bg-indigo-50 text-indigo-400 transition-colors"
                                                                    >+</button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-lg font-black text-slate-800 bg-white px-3 py-1 rounded-xl border border-indigo-50 shadow-sm">
                                                                    {item.cantidad}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isEditing && (
                                                            <button 
                                                                onClick={() => handleRemoveRepuesto(item.id)}
                                                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                                title="Eliminar repuesto"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                            {repuestos.length === 0 && (
                                                <div className="text-center py-6 bg-indigo-50/20 rounded-3xl border border-dashed border-indigo-100">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Sin repuestos asignados</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                            <button
                                onClick={onClose}
                                className="px-10 py-3 bg-brand text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                {isEditing ? 'Listo' : 'Entendido'}
                            </button>
                        </div>
                    </motion.div>
                    
                    {/* Pickers */}
                    <AnimatePresence>
                        {showProductPicker && (
                            <BuscadorProductos 
                                productosSeleccionados={productos.map(p => p.producto)}
                                onAdd={(p) => {
                                    handleAddProduct(p);
                                }}
                                onRemove={(idx) => {
                                    const p = productos[idx];
                                    if (p) handleRemoveProduct(p.id);
                                }}
                                onClose={() => setShowProductPicker(false)}
                            />
                        )}
                        {showRepuestoPicker && (
                            <BuscadorRepuestos 
                                repuestosSeleccionados={repuestos.map(r => r.repuesto)}
                                onAdd={(r) => {
                                    handleAddRepuesto(r);
                                }}
                                onRemove={(idx) => {
                                    const r = repuestos[idx];
                                    if (r) handleRemoveRepuesto(r.id);
                                }}
                                onUpdateQuantity={(idx, qty) => {
                                    const r = repuestos[idx];
                                    if (r) handleUpdateQuantity('Repuestos_Servicios', r.id, qty);
                                }}
                                onClose={() => setShowRepuestoPicker(false)}
                            />
                        )}
                    </AnimatePresence>
                </div>
            )}
        </AnimatePresence>
    );
}
