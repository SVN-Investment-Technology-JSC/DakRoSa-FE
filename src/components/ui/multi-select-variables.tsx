import { useState, useRef, useEffect } from 'react';

export function MultiSelectVariables({ 
  value, 
  onChange, 
  options, 
  max = 50,
  disabled = false,
  placeholder = "Chọn tác nhân..."
}: { 
  value: string[], 
  onChange: (v: string[]) => void, 
  options?: string[],
  max?: number,
  disabled?: boolean,
  placeholder?: string
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayOptions = options || Array.from({length: max}).map((_, i) => String(i + 1));

  return (
    <div className="relative font-sans" ref={containerRef}>
      <div 
        className={`min-h-10 border rounded-md px-3 py-2 text-sm bg-white flex flex-wrap gap-1.5 items-center transition-all ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-blue-400'}`}
        onClick={() => !disabled && setOpen(!open)}
      >
        {value.length === 0 && <span className="text-gray-400">{placeholder}</span>}
        {value.map(v => (
          <span key={v} className="bg-blue-100/80 text-blue-800 px-2 py-0.5 rounded text-xs font-mono font-bold shadow-sm ring-1 ring-blue-200">[{v}]</span>
        ))}
      </div>
      
      {open && (
        <div className="absolute top-full mt-1 left-0 min-w-[200px] z-50 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto p-3">
          {displayOptions.length === 0 ? (
             <div className="text-center py-4 text-xs text-gray-500 italic">Không có lựa chọn nào</div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {displayOptions.map((val) => {
                const selected = value.includes(val);
                return (
                  <div 
                    key={val}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selected) {
                        onChange(value.filter(v => v !== val));
                      } else {
                        onChange([...value, val].sort((a,b) => {
                          const numA = parseInt(a);
                          const numB = parseInt(b);
                          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                          return a.localeCompare(b);
                        }));
                      }
                    }}
                    className={`text-center py-1.5 rounded-lg cursor-pointer text-xs font-mono font-bold transition-all transform hover:scale-[1.03] active:scale-95 ${selected ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 shadow-sm'}`}
                  >
                    {val}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
