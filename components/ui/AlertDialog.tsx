'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Modal } from '@/components/ui/modal/Modal';
import { ModalHeader, ModalTitle } from '@/components/ui/modal/ModalHeader';
import { ModalFooter } from '@/components/ui/modal/ModalFooter';
import { ModalBody } from '@/components/ui/modal/ModalBody';

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
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader className="flex-row items-center gap-3 space-y-0">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${getBgColor()}`}>
          {getIcon()}
        </div>
        <ModalTitle>{title}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p className="whitespace-pre-wrap text-gray-600">{message}</p>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose} variant="default">
          {buttonText}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
