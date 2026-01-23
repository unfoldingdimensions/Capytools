'use client';
import { Button } from '@/components/ui/button';
import { X, Download, FileText, Printer } from 'lucide-react';
import { ResumePreview } from './ResumePreview';
import { ResumeData } from '@/types/resume.types';

interface PreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: ResumeData;
    resumeTitle: string;
    onDownload: () => void;
}

export function PreviewModal({ isOpen, onClose, data, resumeTitle, onDownload }: PreviewModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
            {/* Top Toolbar */}
            <div className="flex h-16 items-center justify-between px-6 bg-white/10 backdrop-blur-xl border-b border-white/10 text-white">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-500/20">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold leading-none mb-1">{resumeTitle || 'Untitled Resume'}</h2>
                        <p className="text-[10px] text-white/60 font-medium uppercase tracking-widest">Live Preview Mode</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghostSubtle"
                        className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0"
                        onClick={() => window.print()}
                    >
                        <Printer className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="gradient"
                        size="sm"
                        className="rounded-full px-5 font-bold shadow-lg shadow-brand-500/20"
                        onClick={onDownload}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                    </Button>
                    <div className="w-[1px] h-6 bg-white/10 mx-2" />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-white/60 hover:text-white hover:bg-white/10"
                        onClick={onClose}
                    >
                        <X className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            {/* Scrollable Preview Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-12">
                <div className="mx-auto max-w-4xl animate-in slide-in-from-bottom-8 duration-500">
                    <ResumePreview data={data} />
                </div>
            </div>

            {/* Footer hint */}
            <div className="h-10 border-t border-white/5 bg-gray-900/50 flex items-center justify-center">
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.3em]">
                    Handcraft AI Precision Preview
                </p>
            </div>
        </div>
    );
}
