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
    rightElement?: React.ReactNode;
}

export function InfoField({
    label,
    value,
    icon: Icon,
    editable = false,
    fullWidth = false,
    className = "",
    rightElement
}: InfoFieldProps) {
    return (
        <div className={`flex flex-col gap-1.5 ${fullWidth ? 'col-span-full' : ''} ${className}`}>
            <span className="text-xs font-semibold text-slate-500 ml-0.5">
                {label}
            </span>
            <div
                className={`
                    min-h-[40px] px-3 py-2 rounded-md text-sm border transition-all duration-200 flex items-start justify-between
                    ${editable
                        ? 'bg-white border-slate-300 text-slate-900 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }
                `}
            >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {Icon && (
                        <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex flex-col min-w-0">
                        <span className="break-words font-medium" title={value?.toString()}>
                            {value || '---'}
                        </span>
                    </div>
                </div>
                {rightElement && (
                    <div className="ml-2 shrink-0 self-center">
                        {rightElement}
                    </div>
                )}
            </div>
        </div>
    );
}

export function InfoSection({ 
    title, 
    children, 
    className = "",
    rightElement
}: { 
    title?: string; 
    children: React.ReactNode; 
    className?: string;
    rightElement?: React.ReactNode;
}) {
    return (
        <div
            className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden ${className}`}
        >
            {title && (
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                        {title}
                    </h3>
                    {rightElement}
                </div>
            )}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {children}
            </div>
        </div>
    );
}
