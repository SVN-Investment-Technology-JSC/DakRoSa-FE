'use client';

import { useEffect, useRef, useState } from 'react';

export type MultiSelectVariableOption =
  | string
  | {
      value: string;
      label: string;
    };

export function MultiSelectVariables({
  value,
  onChange,
  options = Array.from({ length: 30 }, (_, index) => String(index + 1)),
  disabled = false,
  placeholder = 'Chọn tác nhân…',
  compact = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  options?: MultiSelectVariableOption[];
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [compactWidth, setCompactWidth] = useState(0);
  const normalizedOptions = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );
  const labelByValue = new Map(
    normalizedOptions.map((option) => [option.value, option.label]),
  );
  const selectedOptions = value.map((item) => ({
    value: item,
    label: labelByValue.get(item) ?? item,
  }));

  useEffect(() => {
    if (!compact || !triggerRef.current) return;
    const trigger = triggerRef.current;
    const updateWidth = () => setCompactWidth(trigger.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [compact]);

  const compactVisibleOptions = (() => {
    if (!compact || compactWidth === 0) return selectedOptions;
    const availableWidth = compactWidth - 16;
    let usedWidth = 0;
    let visibleCount = 0;
    for (let index = 0; index < selectedOptions.length; index += 1) {
      const item = selectedOptions[index];
      const itemWidth = Math.max(28, item.value.length * 8 + 18);
      const remainingCount = selectedOptions.length - index - 1;
      const overflowWidth = remainingCount > 0 ? 30 : 0;
      const gapWidth = visibleCount > 0 ? 6 : 0;
      if (visibleCount > 0 && usedWidth + gapWidth + itemWidth + overflowWidth > availableWidth) {
        break;
      }
      usedWidth += gapWidth + itemWidth;
      visibleCount += 1;
    }
    return selectedOptions.slice(0, Math.max(1, visibleCount));
  })();

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={
          compact
            ? 'flex h-11 w-full items-center gap-1.5 overflow-hidden rounded-lg border border-[#BFD0C2] bg-white px-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-60'
            : 'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-[#68736B] bg-white px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60'
        }
      >
        {value.length ? (
          <>
            {(compact ? compactVisibleOptions : selectedOptions).map((item) => (
              <span
                key={item.value}
                className={
                  compact
                    ? 'max-w-[92px] shrink-0 truncate rounded-md bg-emerald-50 px-1.5 py-1 font-mono font-bold text-emerald-800 ring-1 ring-emerald-200'
                    : 'rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-xs font-bold text-emerald-800 ring-1 ring-emerald-200'
                }
                title={item.label}
              >
                {compact ? item.value : item.label}
              </span>
            ))}
            {compact && selectedOptions.length > compactVisibleOptions.length ? (
              <span className="shrink-0 rounded-md bg-[#EEF2EE] px-1.5 py-1 font-bold text-[#526057]">
                +{selectedOptions.length - compactVisibleOptions.length}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-[#9AA39D]">{placeholder}</span>
        )}
      </button>
      {open ? (
        <div className={`absolute z-[60] mt-1 max-h-72 overflow-auto rounded-xl border border-[#DCE5DB] bg-white p-2 shadow-xl ${compact ? 'right-0 w-80' : 'w-full min-w-52 p-3'}`}>
          <div className={compact ? 'grid gap-1' : 'grid grid-cols-5 gap-2'}>
            {normalizedOptions.map((option) => {
              const selected = value.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onChange(
                      selected
                        ? value.filter((valueItem) => valueItem !== option.value)
                        : [...value, option.value],
                    )
                  }
                  className={
                    compact
                      ? `flex min-h-10 items-center rounded-lg border px-3 text-left text-xs transition ${
                          selected
                            ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-900'
                            : 'border-[#E0E7E1] bg-white text-[#526057] hover:border-emerald-400 hover:bg-emerald-50/50'
                        }`
                      : `rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                          selected
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-[#DCE5DB] bg-[#F8FAF7] text-[#526057] hover:border-emerald-400'
                        }`
                  }
                >
                  {compact ? (
                    <>
                      <span className={`mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-[#AEB9B0] bg-white'}`}>
                        {selected ? '✓' : ''}
                      </span>
                      <span className="leading-4">{option.label}</span>
                    </>
                  ) : (
                    option.label
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
