import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export function Select({ value, onChange, options, placeholder = 'Seleccionar...', className = '' }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchBuffer = useRef('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const char = e.key.toLowerCase();
      searchBuffer.current += char;

      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
      
      searchTimeout.current = setTimeout(() => {
        searchBuffer.current = '';
      }, 750); // Clear buffer after 750ms of inactivity

      const searchTerm = searchBuffer.current;
      
      // Find the first option that starts with the search buffer
      const matchIndex = options.findIndex(opt => opt.label.toLowerCase().startsWith(searchTerm));
      
      if (matchIndex !== -1) {
        onChange(options[matchIndex].value);
      } else if (searchTerm.length > 1) {
        // If no match for multi-char, maybe they started a new search (like typing 's' then 'e')
        // We could just fallback to the single char
        const singleCharIndex = options.findIndex(opt => opt.label.toLowerCase().startsWith(char));
        if (singleCharIndex !== -1) {
          searchBuffer.current = char;
          onChange(options[singleCharIndex].value);
        }
      }
    }
  }, [options, onChange]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center justify-between bg-card/60 backdrop-blur-sm border border-border/60 hover:border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all text-foreground font-semibold cursor-pointer shadow-sm"
      >
        <span className={selectedOption ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-xl border border-border/50 bg-card p-1 text-sm shadow-xl animate-in fade-in slide-in-from-top-2">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-foreground/5 ${
                value === option.value ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
              }`}
            >
              {option.label}
              {value === option.value && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
