'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Save, ShoppingCart, Image as ImageIcon, Camera, Share2, Briefcase, Trash2 } from 'lucide-react'
import BuscadorProductos from '@/components/solicitar-servicio/BuscadorProductos'

// Main component wrapped in Suspense
export default function SalaDetailsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div></div>}>
            <SalaDetailsContent />
        </Suspense>
    )
}

function SalaDetailsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const id = searchParams.get('id')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [sala, setSala] = useState<any>(null)
    const [productos, setProductos] = useState<any[]>([])
    const [asesores, setAsesores] = useState<any[]>([])
    const [showBuscadorProductos, setShowBuscadorProductos] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        activo: false,
        asesor_id: null as number | null,
        nombre_contacto: '',
        telefono: '',
        direccion: '',
        pop_banos: false,
        pop_cocinas: false,
        pop_hidros: false,
        pop_labores: false,
        pop_no_aplica: false,
        permite_exhibir: false,
    })

    useEffect(() => {
        async function loadData() {
            if (!id) return

            setLoading(true)
            try {
                // Fetch sala details
                const { data: salaData, error: salaError } = await supabase
                    .from('query_ubicaciones')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (salaError) throw salaError

                setSala(salaData)
                setFormData({
                    activo: salaData.activo ?? false,
                    asesor_id: salaData.asesor_id,
                    nombre_contacto: salaData.nombre_contacto || '',
                    telefono: salaData.telefono || '',
                    direccion: salaData.direccion || '',
                    pop_banos: salaData.pop_banos ?? false,
                    pop_cocinas: salaData.pop_cocinas ?? false,
                    pop_hidros: salaData.pop_hidros ?? false,
                    pop_labores: salaData.pop_labores ?? false,
                    pop_no_aplica: salaData.pop_no_aplica ?? false,
                    permite_exhibir: salaData.permite_exhibir ?? false,
                })

                // Fetch asesores for the dropdown
                const { data: asesoresData } = await supabase
                    .from('Usuarios')
                    .select('id, display_name')
                    .in('rol', ['comercial', 'mac', 'coordinador_comercial', 'director_comercial', 'ecommerce'])
                    .order('display_name', { ascending: true })

                if (asesoresData) setAsesores(asesoresData)

                // Fetch productos (exhibiciones)
                const { data: productosData } = await supabase
                    .from('query_exhibiciones')
                    .select('*')
                    .eq('ubicacion_id', id)

                if (productosData) setProductos(productosData)

            } catch (error) {
                console.error('Error loading data:', error)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [id])

    const handleSave = async () => {
        if (!id) return
        setSaving(true)
        try {
            // Asumiendo que la tabla real es Ubicaciones
            const { error } = await supabase
                .from('Ubicaciones')
                .update({
                    activo: formData.activo,
                    asesor_id: formData.asesor_id,
                    nombre_contacto: formData.nombre_contacto,
                    telefono: formData.telefono,
                    direccion: formData.direccion,
                    pop_banos: formData.pop_banos,
                    pop_cocinas: formData.pop_cocinas,
                    pop_hidros: formData.pop_hidros,
                    pop_labores: formData.pop_labores,
                    pop_no_aplica: formData.pop_no_aplica,
                    permite_exhibir: formData.permite_exhibir,
                })
                .eq('id', id)

            if (error) {
                console.error('Update error on Ubicaciones, maybe trying lowercase ubicaciones?', error)
                // Fallback attempt if table name is different
                const { error: error2 } = await supabase
                    .from('ubicaciones')
                    .update({
                        activo: formData.activo,
                        asesor_id: formData.asesor_id,
                        nombre_contacto: formData.nombre_contacto,
                        telefono: formData.telefono,
                        direccion: formData.direccion,
                        pop_banos: formData.pop_banos,
                        pop_cocinas: formData.pop_cocinas,
                        pop_hidros: formData.pop_hidros,
                        pop_labores: formData.pop_labores,
                        pop_no_aplica: formData.pop_no_aplica,
                        permite_exhibir: formData.permite_exhibir,
                    })
                    .eq('id', id)
                
                if (error2) throw error2
            }

            alert('Datos guardados correctamente')
        } catch (error) {
            console.error('Error saving data:', error)
            alert('Hubo un error al guardar los datos.')
        } finally {
            setSaving(false)
        }
    }

    const handleAddProduct = async (productoItem: any) => {
        if (!id) return;
        try {
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData.user?.id;

            const { error } = await supabase.from('exhibiciones').insert({
                producto_id: productoItem.id,
                ubicacion_id: id,
                created_by: userId,
                comentario: productoItem.nombre,
                mueble_marcado: false
            });

            if (error) throw error;
            
            // Reload productos
            const { data: productosData } = await supabase
                .from('query_exhibiciones')
                .select('*')
                .eq('ubicacion_id', id);

            if (productosData) setProductos(productosData);
            setShowBuscadorProductos(false);
            alert('Producto agregado correctamente');
        } catch (error: any) {
            console.error('Error adding product:', error);
            alert('Hubo un error al agregar el producto: ' + error.message);
        }
    }

    const handleRemoveProduct = async (exhibicionId: number) => {
        try {
            const { error } = await supabase
                .from('exhibiciones')
                .delete()
                .eq('id', exhibicionId);
            if (error) throw error;

            setProductos(prev => prev.filter(p => p.id !== exhibicionId));
        } catch (error: any) {
            console.error('Error deleting product:', error);
            alert('Error al eliminar producto');
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#254153]"></div>
            </div>
        )
    }

    if (!sala) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-4">
                <p className="text-gray-500">No se encontraron detalles de la sala.</p>
                <button onClick={() => router.back()} className="text-brand hover:underline">Volver</button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-[#254153] text-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-semibold">Detalles del cliente</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex justify-end mb-4">
                    <button className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-full text-sm text-gray-700 hover:bg-gray-50 shadow-sm">
                        Ver en sharepoint
                        <Share2 className="w-4 h-4 text-emerald-500" />
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-3">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de cliente</label>
                            <input
                                type="text"
                                disabled
                                value={sala.cliente_tipo || ''}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
                            />
                        </div>
                        <div className="md:col-span-4">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-medium text-gray-600">Cliente</label>
                                <span className="text-xs text-gray-500">Id: {sala.cliente_id}</span>
                            </div>
                            <input
                                type="text"
                                disabled
                                value={sala.cliente_nombre || ''}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">NIT</label>
                            <input
                                type="text"
                                disabled
                                value={sala.cliente_nit || ''}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
                            />
                        </div>
                        <div className="md:col-span-1 flex flex-col items-center justify-center pb-2">
                            <label className="block text-xs font-medium text-gray-600 mb-2">¿Activo?</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={formData.activo}
                                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#254153]"></div>
                            </label>
                        </div>
                        <div className="md:col-span-2">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-medium text-gray-600">Nombre almacén</label>
                                <span className="text-xs text-gray-500">Id: {sala.id}</span>
                            </div>
                            <input
                                type="text"
                                disabled
                                value={sala.nombre || ''}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
                            />
                        </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-[#254153] mb-1">Asesor(a) comercial</label>
                            <select
                                value={formData.asesor_id || ''}
                                onChange={(e) => setFormData({ ...formData, asesor_id: e.target.value ? parseInt(e.target.value) : null })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#254153] focus:border-[#254153] outline-none"
                            >
                                <option value="">Seleccione...</option>
                                {asesores.map(a => (
                                    <option key={a.id} value={a.id}>{a.display_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#254153] mb-1">Persona de contacto</label>
                            <input
                                type="text"
                                value={formData.nombre_contacto}
                                onChange={(e) => setFormData({ ...formData, nombre_contacto: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#254153] focus:border-[#254153] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#254153] mb-1">Teléfono</label>
                            <input
                                type="text"
                                value={formData.telefono}
                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#254153] focus:border-[#254153] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
                            <input
                                type="text"
                                value={formData.direccion}
                                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#254153] focus:border-[#254153] outline-none"
                            />
                        </div>
                    </div>

                    {/* Row 3 */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-[#254153] mb-1">Ciudad</label>
                            {/* Typically a dropdown, but keeping it simple/readonly if we don't have ciudads array */}
                            <input
                                type="text"
                                disabled
                                value={sala.ciudad || ''}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Departamento (Estado, Provincia)</label>
                            <input
                                type="text"
                                disabled
                                value={sala.departamento || ''}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Zona</label>
                            <input
                                type="text"
                                disabled
                                value={sala.zona || ''}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Pais</label>
                            <input
                                type="text"
                                disabled
                                value={sala.pais || 'Colombia'}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
                            />
                        </div>
                    </div>

                    <hr className="my-6 border-gray-100" />

                    {/* Bottom Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Products List */}
                        <div className="lg:col-span-5 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-700 text-sm">Productos: {productos.length}</span>
                                <button 
                                    onClick={() => setShowBuscadorProductos(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    Agregar producto
                                </button>
                            </div>
                            <div className="w-full h-48 border border-gray-200 rounded-xl bg-gray-50 overflow-y-auto p-2 space-y-2">
                                {productos.length === 0 ? (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                                        No hay productos registrados
                                    </div>
                                ) : (
                                    productos.map(p => (
                                        <div key={p.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-xs flex justify-between items-center">
                                            <div>
                                                <div className="font-medium text-gray-800">{p.producto_descripcion || p.producto_sku || 'Producto'}</div>
                                                <div className="text-gray-500 mt-1">{p.producto_grupo}</div>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveProduct(p.id)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Toggles & Actions */}
                        <div className="lg:col-span-7">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8">
                                <ToggleField label="POP Baños" checked={formData.pop_banos} onChange={(v) => setFormData({ ...formData, pop_banos: v })} />
                                <ToggleField label="POP Labores" checked={formData.pop_labores} onChange={(v) => setFormData({ ...formData, pop_labores: v })} />
                                <ToggleField label="POP Cocinas" checked={formData.pop_cocinas} onChange={(v) => setFormData({ ...formData, pop_cocinas: v })} />
                                <ToggleField label="POP No aplica" checked={formData.pop_no_aplica} onChange={(v) => setFormData({ ...formData, pop_no_aplica: v })} />
                                <ToggleField label="POP Hidros" checked={formData.pop_hidros} onChange={(v) => setFormData({ ...formData, pop_hidros: v })} />
                                <ToggleField label="Permite Exhibir" checked={formData.permite_exhibir} onChange={(v) => setFormData({ ...formData, permite_exhibir: v })} />
                            </div>

                            <div className="flex flex-wrap justify-between items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-600">Fotos o videos cargados: {sala?.fotos?.length || 0}</span>
                                    <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">
                                        <Camera className="w-5 h-5" />
                                    </button>
                                    <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">
                                        <ImageIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <button 
                                    onClick={() => {
                                        const hasInvalidSku = productos.some(p => !p.producto_sku || p.producto_sku === '');
                                        if (hasInvalidSku) {
                                            alert('Algunos productos no tienen el sku bien definido, debes eliminar los que estan nulos y seleccionarlos correctamente');
                                            return;
                                        }
                                        if (confirm('¿Desea abrir un nuevo servicio para este cliente?')) {
                                            router.push('/solicitar-servicio?ubicacion_id=' + id);
                                        }
                                    }}
                                    className="flex items-center gap-2 px-5 py-2 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
                                >
                                    <Briefcase className="w-4 h-4" />
                                    Crear servicio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Save Button */}
                <div className="flex justify-center mt-8">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-[#254153] hover:bg-[#1a2f3c] text-white px-10 py-3 rounded-lg font-medium shadow-md transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : null}
                        Guardar
                    </button>
                </div>
            </div>

            {showBuscadorProductos && (
                <BuscadorProductos
                    productosSeleccionados={[]} // In FF it shows nothing or the ones already there. We just want to add one.
                    onAdd={(item) => handleAddProduct(item)}
                    onRemove={() => {}}
                    onClose={() => setShowBuscadorProductos(false)}
                />
            )}
        </div>
    )
}

function ToggleField({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">{label}</span>
            <label className="relative inline-flex items-center cursor-pointer ml-2">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#254153]"></div>
            </label>
        </div>
    )
}
