'use client';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal/Modal';
import { ModalHeader, ModalTitle } from '@/components/ui/modal/ModalHeader';
import { ModalFooter } from '@/components/ui/modal/ModalFooter';
import { ModalBody } from '@/components/ui/modal/ModalBody';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'default' | 'destructive';
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'default',
    onConfirm,
    onCancel,
    isLoading = false,
}: ConfirmDialogProps) {
    return (
        <Modal isOpen={isOpen} onClose={onCancel} size="sm" showCloseButton={!isLoading}>
            <ModalHeader>
                <ModalTitle>{title}</ModalTitle>
            </ModalHeader>
            <ModalBody>
                <p className="whitespace-pre-wrap text-gray-600">{message}</p>
            </ModalBody>
            <ModalFooter>
                <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                >
                    {cancelText}
                </Button>
                <Button variant={confirmVariant} onClick={onConfirm} disabled={isLoading}>
                    {isLoading ? 'Processing...' : confirmText}
                </Button>
            </ModalFooter>
        </Modal>
    );
}
