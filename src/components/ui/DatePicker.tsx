import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from './Select';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DatePicker({ value, onChange, placeholder = 'Seleccionar fecha...' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for the calendar view
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const [y, m] = value.split('-');
      return new Date(parseInt(y), parseInt(m) - 1, 1);
    }
    return new Date();
  });

  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      setCurrentMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
      setInputValue(`${d}/${m}/${y}`);
    } else {
      setInputValue('');
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  // Adjust so Monday is the first day of the week (0) instead of Sunday
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    const d = String(day).padStart(2, '0');
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const y = currentMonth.getFullYear();
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };
  // Removed unused formatDisplayDate

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    
    // Parse DD/MM/YYYY
    const match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (match) {
      const d = parseInt(match[1]);
      const m = parseInt(match[2]);
      const y = parseInt(match[3]);
      if (d > 0 && d <= 31 && m > 0 && m <= 12) {
        onChange(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      }
    }
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(true)}
        className={`flex w-full items-center rounded-xl border border-border bg-muted px-4 py-2.5 text-sm transition-all focus-within:border-primary/50 focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/20 ${isOpen ? 'border-primary/50 bg-card ring-2 ring-primary/20' : ''}`}
      >
        <CalendarIcon className="w-4 h-4 shrink-0 text-muted-foreground mr-2" />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-72 rounded-xl border border-border/50 bg-card p-4 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-foreground/5 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-2 items-center w-full px-2">
              <div className="flex-1">
                <Select
                  value={String(currentMonth.getMonth())}
                  onChange={(val) => setCurrentMonth(new Date(currentMonth.getFullYear(), parseInt(val), 1))}
                  options={monthNames.map((m, i) => ({ label: m.substring(0, 3), value: String(i) }))}
                />
              </div>
              <div className="flex-1">
                <Select
                  value={String(currentMonth.getFullYear())}
                  onChange={(val) => setCurrentMonth(new Date(parseInt(val), currentMonth.getMonth(), 1))}
                  options={Array.from({ length: 100 }, (_, i) => {
                    const y = String(new Date().getFullYear() - 80 + i);
                    return { label: y, value: y };
                  })}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-foreground/5 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((day) => (
              <div key={day} className="text-center text-[10px] font-bold text-muted-foreground uppercase">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dStr = String(day).padStart(2, '0');
              const mStr = String(currentMonth.getMonth() + 1).padStart(2, '0');
              const yStr = currentMonth.getFullYear();
              const isSelected = value === `${yStr}-${mStr}-${dStr}`;
              
              const today = new Date();
              const isToday = 
                day === today.getDate() && 
                currentMonth.getMonth() === today.getMonth() && 
                currentMonth.getFullYear() === today.getFullYear();

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDate(day)}
                  className={`h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-primary text-white font-bold shadow-md shadow-primary/20'
                      : isToday
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-foreground hover:bg-foreground/5'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
