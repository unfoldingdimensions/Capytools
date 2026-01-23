'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Settings, Key, Database, Cpu, X } from 'lucide-react';

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
        setOpen(false);
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

    if (!open) {
        return (
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-400 hover:text-brand-600 hover:bg-brand-50" onClick={() => setOpen(true)}>
                <Settings className="h-5 w-5" />
            </Button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <button
                    onClick={() => setOpen(false)}
                    className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="mb-6 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <Cpu className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">AI Settings (BYOK)</h2>
                        <p className="text-xs text-gray-500">Configure your own AI provider keys.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Provider Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="provider">AI Provider</Label>
                        <select
                            id="provider"
                            value={config.provider}
                            onChange={handleProviderChange}
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                            {Object.entries(PROVIDERS).map(([key, value]) => (
                                <option key={key} value={key}>
                                    {value.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {config.provider !== 'default' && (
                        <>
                            {/* API Key */}
                            <div className="space-y-2">
                                <Label htmlFor="apiKey" className="flex items-center gap-2">
                                    <Key className="h-3.5 w-3.5" />
                                    API Key
                                </Label>
                                <Input
                                    id="apiKey"
                                    type="password"
                                    value={config.apiKey}
                                    placeholder={PROVIDERS[config.provider].placeholder}
                                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                />
                            </div>

                            {/* Base URL */}
                            <div className="space-y-2">
                                <Label htmlFor="baseURL" className="flex items-center gap-2">
                                    <Database className="h-3.5 w-3.5" />
                                    Base URL
                                </Label>
                                <Input
                                    id="baseURL"
                                    value={config.baseURL}
                                    placeholder="https://api.example.com/v1"
                                    onChange={(e) => setConfig({ ...config, baseURL: e.target.value })}
                                />
                            </div>

                            {/* Model */}
                            <div className="space-y-2">
                                <Label htmlFor="model">Model Name</Label>
                                <Input
                                    id="model"
                                    value={config.model}
                                    placeholder="e.g., gpt-4-turbo"
                                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                />
                            </div>

                            <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-blue-800">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <div className="text-xs">
                                    <strong className="block font-medium mb-1">Privacy Note</strong>
                                    Your API Key is stored only in your browser's local storage and sent directly to our secure proxy.
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="mt-6 flex justify-between gap-3">
                    {config.provider !== 'default' && (
                        <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleClear}>
                            Reset Default
                        </Button>
                    )}
                    <Button onClick={handleSave} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white">
                        {saved ? (
                            <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Saved
                            </>
                        ) : (
                            'Save Configuration'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
