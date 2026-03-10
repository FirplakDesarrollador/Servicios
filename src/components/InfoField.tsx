'use client';

import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface InfoFieldProps {
    label: string;
    value: string | number | null | undefined;
    icon?: LucideIcon;
    editable?: boolean;
    fullWidth?: boolean;
    className?: string;
}

export function InfoField({
    label,
    value,
    icon: Icon,
    editable = false,
    fullWidth = false,
    className = ""
}: InfoFieldProps) {
    return (
        <div className={`flex flex-col gap-1.5 ${fullWidth ? 'col-span-full' : ''} ${className}`}>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider ml-1">
                {label}
            </label>
            <div
                className={`
                    min-h-[42px] px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${editable
                        ? 'bg-white border border-slate-200 text-slate-700 shadow-sm hover:border-brand/30 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/5'
                        : 'bg-slate-50/50 text-slate-600 border border-transparent'
                    }
                `}
            >
                <div className="flex items-center gap-2.5">
                    {Icon && <Icon className="w-4 h-4 text-brand/60" />}
                    <span className="truncate">{value || 'N/A'}</span>
                </div>
            </div>
        </div>
    );
}

export function InfoSection({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-3xl border border-slate-100 p-6 premium-shadow ${className}`}
        >
            {title && (
                <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-brand rounded-full" />
                    {title}
                </h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {children}
            </div>
        </motion.div>
    );
}
