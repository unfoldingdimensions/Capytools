'use client';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal/Modal';
import { ModalBody } from '@/components/ui/modal/ModalBody';
import { ModalFooter } from '@/components/ui/modal/ModalFooter';
import { ModalHeader, ModalTitle } from '@/components/ui/modal/ModalHeader';

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
  confirmText = 'confirm',
  cancelText = 'cancel',
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
        <p className="whitespace-pre-wrap text-body-md text-muted-foreground">{message}</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} loading={isLoading}>
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
