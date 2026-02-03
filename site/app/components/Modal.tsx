"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

interface ModalProps {
  children: React.ReactNode;
  /** Content rendered outside modal-content (e.g., nav buttons) */
  outsideContent?: React.ReactNode;
  /** Custom keyboard handler for additional keys (Escape is always handled) */
  onKeyDown?: (e: KeyboardEvent) => void;
}

export default function Modal({ children, outsideContent, onKeyDown: customKeyDown }: ModalProps) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

  const onDismiss = useCallback(() => {
    router.back();
  }, [router]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
      }
      customKeyDown?.(e);
    },
    [onDismiss, customKeyDown],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onDismiss();
    }
  };

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      onKeyDown={(e) => e.key === "Escape" && onDismiss()}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {outsideContent}
      <div className="modal-content">{children}</div>
    </div>
  );
}
