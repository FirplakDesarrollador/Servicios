'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function BIPage() {
    const router = useRouter()

    return (
        <div className="flex flex-col h-screen bg-[#F8FAFC]">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#254153] to-[#1a2f3d] text-white shadow-lg flex-none">
                <div className="w-full px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        aria-label="Volver"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block leading-none mb-1">Reportes</span>
                        <h1 className="text-2xl font-bold leading-none">Power BI</h1>
                    </div>
                </div>
            </div>

            {/* iframe Container */}
            <div className="flex-1 w-full bg-slate-100">
                <iframe 
                    title="Reporte BI" 
                    width="100%" 
                    height="100%" 
                    src="https://app.powerbi.com/view?r=eyJrIjoiODcyOGI4NzQtYTUzMy00NTczLTk1NzctNzEwMjEzZmFjYjY4IiwidCI6ImZhMWRlMDRmLTQ3ODAtNGQ4My1hOTQyLTkzYzdhZThkZWU5ZCIsImMiOjR9" 
                    frameBorder="0" 
                    allowFullScreen={true}
                    className="w-full h-full border-none"
                ></iframe>
            </div>
        </div>
    )
}
