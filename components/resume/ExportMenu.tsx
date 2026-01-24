
'use client';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, FileText, Image } from 'lucide-react';

interface ExportMenuProps {
    onDownloadATS: (options?: { isAtsMode?: boolean }) => void;
    onDownloadVisual: () => void;
    isGenerating?: boolean;
}

export function ExportMenu({ onDownloadATS, onDownloadVisual, isGenerating = false }: ExportMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="gradient"
                    size="sm"
                    className="rounded-full px-5 font-bold shadow-lg shadow-brand-500/20"
                    disabled={isGenerating}
                >
                    <Download className="mr-2 h-4 w-4" />
                    {isGenerating ? 'Exporting...' : 'Download PDF'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Choose Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDownloadATS({ isAtsMode: true })} className="cursor-pointer">
                    <FileText className="mr-2 h-4 w-4 text-brand-500" />
                    <div className="flex flex-col">
                        <span className="font-bold">ATS Optimized</span>
                        <span className="text-[10px] text-muted-foreground">Best for job applications</span>
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDownloadVisual} className="cursor-pointer">
                    <Image className="mr-2 h-4 w-4 text-brand-500" />
                    <div className="flex flex-col">
                        <span className="font-bold">Visual Design</span>
                        <span className="text-[10px] text-muted-foreground">Best for sharing & print</span>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
