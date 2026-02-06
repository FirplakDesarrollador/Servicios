'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw, PlayCircle, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Ayuda {
    id: number
    created_at: string
    titulo_ayuda: string
    link_ayuda: string
    descripcion_ayuda: string
}

export default function AyudaPage() {
    const router = useRouter()
    const [ayudas, setAyudas] = useState<Ayuda[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadAyudas()
    }, [])

    const loadAyudas = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('ayudas')
                .select('*')
                .order('created_at', { ascending: true })

            if (error) throw error
            if (data) setAyudas(data)
        } catch (error) {
            console.error('Error loading ayudas:', error)
        } finally {
            setLoading(false)
        }
    }

    const getFileExtension = (url: string) => {
        return url.substring(url.length - 3, url.length).toLowerCase()
    }

    const videos = ayudas.filter(ayuda => getFileExtension(ayuda.link_ayuda) === 'mp4')
    const imagenes = ayudas.filter(ayuda => getFileExtension(ayuda.link_ayuda) === 'jpg')

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#254153] mx-auto mb-4"></div>
                    <p className="text-slate-600">Cargando ayuda...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#254153] to-[#1a2f3d] text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/')}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                aria-label="Volver"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <h1 className="text-2xl font-bold">Ayuda</h1>
                        </div>

                        <button
                            onClick={loadAyudas}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Recargar"
                        >
                            <RefreshCw className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Videotutoriales */}
                {videos.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12"
                    >
                        <div className="flex items-center gap-2 mb-6">
                            <PlayCircle className="w-6 h-6 text-[#254153]" />
                            <h2 className="text-2xl font-bold text-[#254153]">Videotutoriales</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {videos.map((video, index) => (
                                <motion.div
                                    key={video.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                                >
                                    <div className="p-4">
                                        <h3 className="text-sm font-semibold text-[#254153] mb-3 text-center">
                                            {video.titulo_ayuda}
                                        </h3>

                                        <div className="mb-3 rounded-lg overflow-hidden bg-black">
                                            <video
                                                controls
                                                className="w-full h-[150px] object-contain"
                                                preload="metadata"
                                            >
                                                <source src={video.link_ayuda} type="video/mp4" />
                                                Tu navegador no soporta el elemento de video.
                                            </video>
                                        </div>

                                        <p className="text-xs text-slate-600 text-center font-light">
                                            {video.descripcion_ayuda}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Imágenes de ayuda */}
                {imagenes.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="flex items-center gap-2 mb-6">
                            <ImageIcon className="w-6 h-6 text-[#254153]" />
                            <h2 className="text-2xl font-bold text-[#254153]">Guías visuales</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {imagenes.map((imagen, index) => (
                                <motion.div
                                    key={imagen.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                                >
                                    <div className="p-4">
                                        <h3 className="text-sm font-semibold text-[#254153] mb-3 text-center">
                                            {imagen.titulo_ayuda}
                                        </h3>

                                        <div className="mb-3 rounded-lg overflow-hidden">
                                            <img
                                                src={imagen.link_ayuda}
                                                alt={imagen.titulo_ayuda}
                                                className="w-full h-[270px] object-contain"
                                            />
                                        </div>

                                        <p className="text-xs text-slate-600 text-center font-light">
                                            {imagen.descripcion_ayuda}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Sin contenido */}
                {videos.length === 0 && imagenes.length === 0 && (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <PlayCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-600 text-lg">
                            No hay contenido de ayuda disponible en este momento
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
