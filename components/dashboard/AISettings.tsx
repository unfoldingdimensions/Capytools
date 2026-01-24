'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Settings, Key, Cpu, X, Server } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface AIConfig {
    provider: 'default' | 'zai' | 'openrouter' | 'custom';
    apiKey?: string;
    baseURL?: string;
    model?: string;
}

const PROVIDERS = {
    default: {
        name: 'Default (Handcraft)',
        baseURL: '',
        model: 'gpt-4-turbo',
        placeholder: 'Managed by Handcraft',
    },
    zai: {
        name: 'Z.ai (Zhipu AI)',
        baseURL: 'https://api.z.ai/api/paas/v4/',
        model: 'glm-4.6v-flash',
        placeholder: 'Enter your Z.ai API Key',
    },
    openrouter: {
        name: 'OpenRouter',
        baseURL: 'https://openrouter.ai/api/v1',
        model: 'openai/gpt-4o',
        placeholder: 'Enter your OpenRouter Key',
    },
    custom: {
        name: 'Custom / Other',
        baseURL: '',
        model: '',
        placeholder: 'Enter API Key',
    },
};

export function AISettings() {
    const [open, setOpen] = useState(false);
    const [config, setConfig] = useState<AIConfig>({
        provider: 'default',
        apiKey: '',
        baseURL: '',
        model: '',
    });
    const [saved, setSaved] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('ai-config');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setConfig({
                    provider: parsed.provider || 'default',
                    apiKey: parsed.apiKey || '',
                    baseURL: parsed.baseURL || '',
                    model: parsed.model || '',
                });
            } catch (e) {
                console.error('Failed to parse ai-config', e);
            }
        }
    }, [open]);

    // Cleanup scrolling on mount/unmount of modal
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [open]);

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const provider = value as AIConfig['provider'];
        const defaults = PROVIDERS[provider];

        setConfig((prev) => ({
            ...prev,
            provider,
            // Only auto-fill if switching to a known provider, keep existing if custom or already set
            baseURL: provider === 'custom' ? prev.baseURL : defaults.baseURL,
            model: provider === 'custom' ? prev.model : defaults.model,
        }));
    };

    const handleSave = () => {
        localStorage.setItem('ai-config', JSON.stringify(config));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setTimeout(() => setOpen(false), 1000);
    };

    const handleClear = () => {
        localStorage.removeItem('ai-config');
        setConfig({
            provider: 'default',
            apiKey: '',
            baseURL: '',
            model: '',
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                onClick={() => setOpen(true)}
            >
                <Settings className="h-5 w-5" />
            </Button>
            {open && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
                    {/* Modal Container */}
                    <div
                        className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-gray-900 border border-white/20 dark:border-white/10 shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header - Fixed */}
                        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 ring-1 ring-brand-100 dark:ring-brand-500/20">
                                    <Cpu className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-display font-bold text-foreground">AI Power Settings</h2>
                                    <p className="text-xs text-muted-foreground font-medium">Configure inference engine & keys</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setOpen(false)}
                                className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Provider Selection */}
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <Server className="h-4 w-4 text-brand-500" />
                                    Inference Provider
                                </Label>
                                <div className="relative group">
                                    <select
                                        value={config.provider}
                                        onChange={handleProviderChange}
                                        className="w-full appearance-none rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 pr-10 text-sm font-medium text-foreground transition-all focus:border-brand-500 focus:bg-white dark:focus:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-brand-500/10 cursor-pointer hover:border-brand-300 dark:hover:border-gray-700"
                                    >
                                        {Object.entries(PROVIDERS).map(([key, value]) => (
                                            <option key={key} value={key} className="bg-white dark:bg-gray-900 text-foreground py-2">
                                                {value.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground group-hover:text-brand-500 transition-colors">
                                        <Settings className="h-4 w-4" />
                                    </div>
                                </div>

                                {config.provider === 'default' ? (
                                    <div className="flex items-start gap-3 rounded-2xl bg-brand-50/50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-500/10 p-4">
                                        <CheckCircle className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold text-brand-900 dark:text-brand-100">Managed Mode Active</p>
                                            <p className="text-xs text-brand-700/80 dark:text-brand-200/70 mt-1 leading-relaxed">
                                                Handcraft handles all AI costs and configuration. Best for getting started quickly.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-5">
                                        <div className="h-px bg-gray-100 dark:bg-gray-800" />

                                        {/* API Key */}
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                <Key className="h-4 w-4 text-brand-500" />
                                                Secret API Key
                                            </Label>
                                            <Input
                                                type="password"
                                                value={config.apiKey}
                                                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                                placeholder={PROVIDERS[config.provider].placeholder}
                                                className="font-mono text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus-visible:ring-brand-500"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Base URL */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                    Custom Endpoint
                                                </Label>
                                                <Input
                                                    value={config.baseURL}
                                                    onChange={(e) => setConfig({ ...config, baseURL: e.target.value })}
                                                    placeholder="https://api.example.com/v1"
                                                    className="text-xs bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                                                />
                                            </div>

                                            {/* Model */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                    Model Name
                                                </Label>
                                                <Input
                                                    value={config.model}
                                                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                                    placeholder="gpt-4-turbo"
                                                    className="text-xs bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-500/10 p-4">
                                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                                                <span className="font-bold block mb-0.5">Local Storage Only</span>
                                                Your keys are stored securely in your browser and are never saved to our servers.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer - Fixed */}
                        <div className="flex items-center justify-between p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 rounded-b-3xl">
                            {config.provider !== 'default' && (
                                <Button
                                    variant="ghost"
                                    onClick={handleClear}
                                    className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                                >
                                    Reset
                                </Button>
                            )}
                            <div className="flex gap-3 ml-auto w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                    className="flex-1 sm:flex-none border-gray-200 dark:border-gray-700"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    className={cn(
                                        "flex-1 sm:flex-none min-w-[100px] font-bold transition-all",
                                        saved ? "bg-zinc-800 hover:bg-zinc-900 text-white" : "bg-brand-600 hover:bg-brand-700"
                                    )}
                                >
                                    {saved ? (
                                        <>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Saved
                                        </>
                                    ) : (
                                        'Save Settings'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                , document.body)}
        </>
    );
}
