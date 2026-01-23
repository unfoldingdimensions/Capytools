'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, Layout, Eye, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppDispatch } from '@/store/hooks';
import { setTitle } from '@/store/slices/resumeSlice';

interface BuilderHeaderProps {
    title: string;
    lastSaved: string | null;
    isSaving: boolean;
    onSave: () => void;
    onPreview: () => void;
}

export function BuilderHeader({
    title,
    lastSaved,
    isSaving,
    onSave,
    onPreview
}: BuilderHeaderProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();

    return (
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
            <div className="container mx-auto px-6 h-20 flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => router.push('/dashboard')}
                        aria-label="Back to dashboard"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col">
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => dispatch(setTitle(e.target.value))}
                            placeholder="Untitled Resume"
                            className="h-8 border-none bg-transparent px-0 font-display font-medium text-xl focus-visible:ring-0 placeholder:text-muted-foreground/50 text-foreground w-[300px]"
                            aria-label="Resume Title"
                        />
                        <p className="text-xs text-muted-foreground font-medium" role="status">
                            {lastSaved ? `Saved ${lastSaved}` : 'Unsaved changes'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        className="hidden sm:flex rounded-full text-muted-foreground hover:text-foreground"
                        onClick={() => router.push('/templates')}
                    >
                        <Layout className="mr-2 h-4 w-4" />
                        Templates
                    </Button>
                    <Button
                        variant="secondary"
                        className="rounded-full hidden sm:flex"
                        onClick={onPreview}
                    >
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                    </Button>
                    <Button
                        size="lg"
                        className="rounded-full px-8 font-bold"
                        onClick={onSave}
                        disabled={isSaving}
                        loading={isSaving}
                    >
                        <Save className="mr-2 h-4 w-4" />
                        Save
                    </Button>
                </div>
            </div>
        </header>
    );
}
