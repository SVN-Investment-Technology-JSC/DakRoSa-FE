'use client';

import { X } from 'lucide-react';
import { ReactNode, useEffect, useId, useRef } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  icon?: ReactNode;
  size?: 'default' | 'wide';
  onClose: () => void;
}

export function Modal({ open, title, description, children, icon, size = 'default', onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={`modal-panel${size === 'wide' ? ' modal-panel-wide' : ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-surface">
        <div className="modal-header">
          <div className="modal-heading">
            {icon && <div className="modal-heading-icon">{icon}</div>}
            <div>
              <h2 id={titleId}>{title}</h2>
              {description && <p>{description}</p>}
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
