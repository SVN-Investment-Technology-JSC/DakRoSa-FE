import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

export interface PopoverPosition {
  top: number;
  left: number;
  /** True when the popover was flipped above the trigger to stay on screen. */
  flippedUp: boolean;
}

export interface FixedPopover<T extends HTMLElement> {
  anchorRef: RefObject<T | null>;
  position: PopoverPosition | null;
}

/**
 * Positions a popover with `position: fixed`, measured from its trigger.
 *
 * The matrix lives inside a horizontally scrolling container. Setting overflow
 * on ONE axis forces the other axis to `auto` too, so an absolutely-positioned
 * child gets clipped by the scroll box no matter how high its z-index is. The
 * only reliable escape is to take the element out of that box entirely — hence
 * fixed coordinates read from `getBoundingClientRect()`.
 *
 * This has now caused the same visual bug twice (the RACI cell editor, then the
 * sub-flow picker), so both use this hook rather than re-deriving it.
 *
 * `estimatedHeight` is used to decide whether to flip above the trigger when
 * there is not enough room below.
 */
export function useFixedPopover<T extends HTMLElement>(
  isOpen: boolean,
  estimatedHeight = 240,
): FixedPopover<T> {
  const anchorRef = useRef<T | null>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const place = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const spaceBelow = window.innerHeight - rect.bottom;
      const flippedUp = spaceBelow < estimatedHeight && rect.top > spaceBelow;

      setPosition({
        top: flippedUp ? rect.top - 6 : rect.bottom + 6,
        left: rect.left,
        flippedUp,
      });
    };

    place();
    // Scrolling the matrix moves the trigger but not a fixed child, so the
    // popover has to be re-measured (capture: true — the scroll happens on an
    // inner container, not on window).
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [isOpen, estimatedHeight]);

  return { anchorRef, position };
}

/**
 * Keeps a popover of `width` fully on screen given a preferred left edge.
 * Applied at render time so the element never paints half off the viewport.
 */
export function clampLeft(left: number, width: number, margin = 8): number {
  return Math.min(Math.max(left, margin), Math.max(margin, window.innerWidth - width - margin));
}
