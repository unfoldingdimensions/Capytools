'use client';


import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'info';

interface AlertDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    type?: AlertType;
    buttonText?: string;
    onClose: () => void;
}

export function AlertDialog({
    isOpen,
    title,
    message,
    type = 'info',
    buttonText = 'OK',
    onClose,
}: AlertDialogProps) {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="h-6 w-6 text-green-600" />;
            case 'error':
                return <AlertCircle className="h-6 w-6 text-red-600" />;
            default:
                return <Info className="h-6 w-6 text-blue-600" />;
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'success':
                return 'bg-green-100';
            case 'error':
                return 'bg-red-100';
            default:
                return 'bg-blue-100';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-w-md w-full rounded-lg bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="mb-4 flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${getBgColor()}`}>
                        {getIcon()}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                </div>
                <p className="mb-6 text-gray-600 whitespace-pre-wrap">{message}</p>
                <div className="flex justify-end">
                    <Button onClick={onClose} variant="default">
                        {buttonText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
