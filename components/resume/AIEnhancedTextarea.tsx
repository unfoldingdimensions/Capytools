'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIEnhancedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    onGenerate: () => void;
    isGenerating: boolean;
    generateLabel?: string;
    error?: string;
}

export const AIEnhancedTextarea = React.forwardRef<HTMLTextAreaElement, AIEnhancedTextareaProps>(
    ({ label, onGenerate, isGenerating, generateLabel = 'Generate with AI', error, className, ...props }, ref) => {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    {label && <Label htmlFor={props.id}>{label}</Label>}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onGenerate}
                        disabled={isGenerating}
                        className="text-primary hover:text-primary/90 h-auto p-0 font-normal hover:bg-transparent"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-1 h-3 w-3" />
                                {generateLabel}
                            </>
                        )}
                    </Button>
                </div>
                <Textarea
                    ref={ref}
                    className={cn(error ? 'border-red-500' : '', className)}
                    {...props}
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
        );
    }
);

AIEnhancedTextarea.displayName = 'AIEnhancedTextarea';
