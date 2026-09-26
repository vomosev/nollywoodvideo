'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

let openModalCount = 0;

export default function Modal({
  open = false,
  title = '',
  onClose,
  footer = null,
  children,
  labelledBy,
  describedBy,
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 9)}`).current;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [onClose]);

  /* Lock body scroll while any modal is open. */
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    openModalCount += 1;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;

    if (openModalCount === 1) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        body.style.overflow = previousOverflow;
        body.style.paddingRight = previousPaddingRight;
      }
    };
  }, [open]);

  /* Remember and restore focus, move focus into the dialog. */
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const frame = window.requestAnimationFrame(() => {
      const node = dialogRef.current;
      if (!node) return;
      const focusable = node.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        node.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
      const previous = previouslyFocusedRef.current;
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
        previous.focus();
      }
    };
  }, [open]);

  /* Escape to close and Tab focus trap. */
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        handleClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const node = dialogRef.current;
      if (!node) return;

      const focusable = Array.from(node.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

      if (focusable.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === node || !node.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, handleClose]);

  if (!mounted || !open || typeof document === 'undefined') {
    return null;
  }

  function onBackdropMouseDown(event) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  return createPortal(
    <div className="modal-overlay" onMouseDown={onBackdropMouseDown}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || (title ? titleId : undefined)}
        aria-label={!title && !labelledBy ? 'Dialog' : undefined}
        aria-describedby={describedBy || undefined}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="modal__header">
          {title ? (
            <h2 className="modal__title text-wrap-safe" id={titleId}>
              {title}
            </h2>
          ) : (
            <span />
          )}
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={handleClose}
            aria-label="Close dialog"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              aria-hidden="true"
              focusable="false"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </Button>
        </div>

        <div className="modal__body">{children}</div>

        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}