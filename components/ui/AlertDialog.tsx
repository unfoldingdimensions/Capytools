'use client';

import { CheckCircle, AlertCircle, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal/Modal';
import { ModalBody } from '@/components/ui/modal/ModalBody';
import { ModalFooter } from '@/components/ui/modal/ModalFooter';
import { ModalHeader, ModalTitle } from '@/components/ui/modal/ModalHeader';

export type AlertType = 'success' | 'error' | 'info';

/**
 * Tints from the palette only: sage for success, the destructive hue for errors, water
 * for information. The icon inherits its colour from the disc it sits in, so the two can
 * never disagree. There is no emerald/red/sky here — the language has no such hues.
 */
const TONES: Record<AlertType, string> = {
  success: 'bg-primary/15 text-sage-deep dark:bg-primary/25 dark:text-primary',
  error: 'bg-destructive/10 text-destructive',
  info: 'bg-water/15 text-water',
};

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
  buttonText = 'ok',
  onClose,
}: AlertDialogProps) {
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : Info;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader className="flex-row items-center gap-3 space-y-0">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', TONES[type])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <ModalTitle>{title}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p className="whitespace-pre-wrap text-body-md text-muted-foreground">{message}</p>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>{buttonText}</Button>
      </ModalFooter>
    </Modal>
  );
}
