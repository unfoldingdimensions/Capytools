"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

/**
 * The one confirm step CapyResume's destructive actions share (replace, clear,
 * remove). A native <dialog> opened with showModal(): the browser supplies the
 * focus trap, Escape-to-cancel and the inert page behind it, so there is no
 * dialog library to ship for three confirmations.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "confirm",
  cancelText = "Cancel",
  confirmVariant = "default",
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="capyresume-confirm-title"
      // Escape fires "cancel"; route it through onCancel so state stays in step.
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-3xl border border-border bg-card p-6 text-foreground shadow-xl backdrop:bg-black/40"
    >
      <h2 id="capyresume-confirm-title" className="font-display text-xl font-light">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" className="rounded-full" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button variant={confirmVariant} className="rounded-full" onClick={onConfirm}>
          {confirmText}
        </Button>
      </div>
    </dialog>
  );
}
