'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Search,
    Eraser,
    Loader2,
    AlertCircle,
    ClipboardList
} from 'lucide-react';
import ServiceCard from '@/components/servicios-abiertos/ServiceCard';

export default function ServiciosCerradosPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [resultIds, setResultIds] = useState<number[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            // Fetch current user details
            const { data: profileData } = await supabase
                .from('Usuarios')
                .select('*')
                .eq('user_id', session.user.id)
                .single();

            setProfile(profileData);
        };

        init();
    }, [router]);

    const handleSearch = async () => {
        console.log('🔍 Starting search...');
        console.log('Search term:', searchTerm);
        console.log('Profile:', profile);

        if (!searchTerm.trim()) {
            console.log('❌ Search cancelled - missing term');
            alert('Por favor ingresa un término de búsqueda');
            return;
        }

        setSearching(true);
        setServices([]);
        setResultIds([]);

        try {
            // Use direct query search as primary method (doesn't require profile)
            console.log('📡 Using direct query search...');

            // Search directly in query_servicios view for closed services
            const lowerSearch = searchTerm.toLowerCase().trim();
            const { data: directSearchData, error: directSearchError } = await supabase
                .from('query_servicios')
                .select('*')
                .eq('estado', false) // Only closed services
                .or(`consecutivo.ilike.%${lowerSearch}%,numero_de_pedido.ilike.%${lowerSearch}%`)
                .order('created_at', { ascending: false })
                .limit(50);

            if (directSearchError) {
                console.error('❌ Direct search error:', directSearchError);
                alert(`Error al buscar servicios: ${directSearchError.message}`);
                setSearching(false);
                return;
            }

            if (!directSearchData || directSearchData.length === 0) {
                console.log('⚠️ No results found');
                alert('¡Sin resultados! No se encontraron coincidencias');
                setSearching(false);
                return;
            }

            console.log(`✅ Found ${directSearchData.length} closed services via direct search`);

            // Map view fields for UI compatibility
            const mappedServices = directSearchData.map((s: any) => ({
                ...s,
                ubicacionNombre: s.ubicacion_nombre || s.ubicacionNombre,
                ubicacionCiudad: s.ubicacion_ciudad || s.ubicacionCiudad,
                consumidorNombre: s.consumidor_nombre || s.consumidorNombre,
                asesorNombre: s.asesor_nombre || s.asesorNombre,
                coordinadorNombre: s.coordinador_nombre || s.coordinadorNombre,
                macNombre: s.mac_nombre || s.macNombre || s.asesor_mac_nombre,
                asesorMacNombre: s.mac_nombre || s.macNombre || s.asesor_mac_nombre,
                asesorMacId: s.asesor_mac_id || s.asesorMacId,
                tecnicoNombre: s.tecnico_nombre || s.tecnicoNombre,
                tipoDeServicio: s.tipo_de_servicio || s.tipoDeServicio,
                numeroDePedido: s.numero_de_pedido || s.numeroDePedido,
                estadoAgendamiento: s.estado_visita || s.estadoVisita || 'Sin agendar',
                fechaProgramada: s.visita_fecha_hora_inicio
                    ? new Date(s.visita_fecha_hora_inicio).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'Null'
            }));

            setServices(mappedServices);
            setResultIds(mappedServices.map((s: any) => s.id));
            console.log('✅ Search complete');
        } catch (err) {
            console.error('💥 Unexpected error:', err);
            alert(`Error inesperado al buscar: ${err}`);
        }

        setSearching(false);
    };

    const handleClear = () => {
        setSearchTerm('');
        setResultIds([]);
        setServices([]);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Header with custom color #254153 */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ backgroundColor: '#254153' }}
                className="sticky top-0 z-50 shadow-xl border-b border-slate-200"
            >
                <div className="max-w-7xl mx-auto px-6 py-5">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-300 group"
                        >
                            <ArrowLeft className="w-6 h-6 text-white group-hover:scale-110 group-hover:-translate-x-1 transition-all" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-2xl font-black text-white tracking-tight">
                                Buscar Servicio Cerrado
                            </h1>
                            <p className="text-white/70 text-xs font-medium mt-0.5">
                                Consulta servicios finalizados
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Improved Search Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 mb-6"
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl" style={{ backgroundColor: '#254153' }}>
                                <Search className="w-5 h-5 text-white" />
                            </div>
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                                Buscar servicio cerrado
                            </label>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ingresa consecutivo, cliente, cédula, NIT o cliente final..."
                                    className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-200 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all text-sm font-bold text-slate-900 placeholder:text-slate-400"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSearch}
                                    disabled={searching || !searchTerm.trim()}
                                    style={{ backgroundColor: searching || !searchTerm.trim() ? '#94a3b8' : '#254153' }}
                                    className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                                >
                                    {searching ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Buscando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-5 h-5" />
                                            <span>Buscar</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleClear}
                                    className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                                >
                                    <Eraser className="w-5 h-5" />
                                    <span>Limpiar</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Results */}
                {services.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        {/* Results Counter */}
                        <div className="bg-slate-50 rounded-xl px-5 py-3.5 mb-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg" style={{ backgroundColor: '#254153' }}>
                                    <ClipboardList className="w-4 h-4 text-white" />
                                </div>
                                <p className="text-sm">
                                    <span className="font-bold text-slate-700">Servicios cerrados encontrados: </span>
                                    <span className="font-black text-lg" style={{ color: '#254153' }}>{services.length}</span>
                                </p>
                            </div>
                        </div>

                        {/* Services List */}
                        <div className="space-y-4">
                            <AnimatePresence>
                                {services.map((service, index) => (
                                    <motion.div
                                        key={service.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <ServiceCard service={service} onClick={() => { }} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}

                {/* Empty State */}
                {!searching && services.length === 0 && resultIds.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-center py-16"
                    >
                        <div className="bg-slate-50 rounded-2xl p-12 border-2 border-slate-100 max-w-2xl mx-auto shadow-lg">
                            <div className="inline-block p-5 bg-white rounded-2xl mb-5 shadow-md border border-slate-200">
                                <Search className="w-14 h-14 text-slate-400" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-black text-slate-700 mb-2 tracking-tight">
                                Busca servicios cerrados
                            </h3>
                            <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed text-sm">
                                Ingresa un <span className="font-bold" style={{ color: '#254153' }}>consecutivo</span>, <span className="font-bold text-slate-600">nombre de cliente</span>, <span className="font-bold text-slate-600">cédula</span>, <span className="font-bold text-slate-600">NIT</span> o <span className="font-bold text-slate-600">cliente final</span> para comenzar
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
