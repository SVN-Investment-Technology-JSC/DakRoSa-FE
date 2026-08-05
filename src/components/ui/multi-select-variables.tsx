'use client';

import { useEffect, useRef, useState } from 'react';

export function MultiSelectVariables({
  value,
  onChange,
  options = Array.from({ length: 30 }, (_, index) => String(index + 1)),
  disabled = false,
  placeholder = 'Chọn tác nhân…',
}: {
  value: string[];
  onChange: (value: string[]) => void;
  options?: string[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-[#68736B] bg-white px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {value.length ? (
          value.map((item) => (
            <span
              key={item}
              className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-xs font-bold text-emerald-800 ring-1 ring-emerald-200"
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-[#9AA39D]">{placeholder}</span>
        )}
      </button>
      {open ? (
        <div className="absolute z-50 mt-1 max-h-60 w-full min-w-52 overflow-auto rounded-xl border border-[#DCE5DB] bg-white p-3 shadow-xl">
          <div className="grid grid-cols-5 gap-2">
            {options.map((item) => {
              const selected = value.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    onChange(
                      selected
                        ? value.filter((valueItem) => valueItem !== item)
                        : [...value, item],
                    )
                  }
                  className={`rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                    selected
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-[#DCE5DB] bg-[#F8FAF7] text-[#526057] hover:border-emerald-400'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
