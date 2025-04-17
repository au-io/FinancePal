import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { Input, InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/use-currency';

export interface CurrencyInputProps extends Omit<InputProps, 'onChange'> {
  value: number | string;
  onChange: (value: number) => void;
  currencySymbol?: string;
  decimalPlaces?: number;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ 
    value, 
    onChange, 
    currencySymbol,
    decimalPlaces = 2,
    className,
    ...props 
  }, forwardedRef) => {
    // Create an internal ref that we can rely on
    const innerRef = useRef<HTMLInputElement>(null);
    
    // Combine refs for forwarding
    useEffect(() => {
      if (!forwardedRef) return;
      
      if (typeof forwardedRef === 'function') {
        forwardedRef(innerRef.current);
      } else if (forwardedRef) {
        forwardedRef.current = innerRef.current;
      }
    }, [forwardedRef]);
    
    // Get current currency symbol from context
    const { currencySymbol: contextCurrencySymbol } = useCurrency();
    
    // Use provided symbol or the one from context (default to £ for GBP if neither available)
    const symbolToUse = currencySymbol || contextCurrencySymbol || '£';
    
    // State to hold unformatted input value and cursor position
    const [rawInput, setRawInput] = useState<string>('');
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [cursorPosition, setCursorPosition] = useState<number | null>(null);

    // Apply cursor position after render
    useEffect(() => {
      if (isFocused && innerRef.current && cursorPosition !== null) {
        innerRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, [isFocused, rawInput, cursorPosition]);

    // Initialize rawInput when the component receives a value
    useEffect(() => {
      if (!isFocused && value !== undefined) {
        const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
        setRawInput(numValue.toString());
      }
    }, [value, isFocused]);

    // Format value for display
    const formatValue = (val: number | string): string => {
      if (isFocused && rawInput !== '') {
        // If user is currently editing, show unformatted raw input
        return rawInput;
      } else {
        // Otherwise show the formatted value
        const numValue = typeof val === 'string' ? parseFloat(val) || 0 : val;
        return numValue.toFixed(decimalPlaces);
      }
    };

    // Parse input value
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const currentCursorPosition = e.target.selectionStart;
      
      // Store raw input
      setRawInput(inputValue);
      
      // Remove any non-numeric characters except decimal point
      let sanitizedValue = inputValue.replace(/[^\d.]/g, '');
      
      // Ensure only one decimal point
      const decimalCount = (sanitizedValue.match(/\./g) || []).length;
      if (decimalCount > 1) {
        const parts = sanitizedValue.split('.');
        sanitizedValue = parts[0] + '.' + parts.slice(1).join('');
      }
      
      // Process the value
      if (sanitizedValue === '' || sanitizedValue === '.') {
        onChange(0);
      } else if (sanitizedValue.includes('.')) {
        const [whole, decimal] = sanitizedValue.split('.');
        // Only allow specified decimal places
        const truncatedDecimal = decimal.slice(0, decimalPlaces);
        const formattedValue = whole + '.' + truncatedDecimal;
        onChange(parseFloat(formattedValue));
      } else {
        onChange(parseFloat(sanitizedValue));
      }
      
      // Save cursor position for restoration after re-render
      setCursorPosition(currentCursorPosition);
    };
    
    // Handle focus event
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      
      // Convert formatted value to raw number when focusing
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      setRawInput(numValue.toString());
      
      // Position cursor at the beginning when initially focusing
      setTimeout(() => {
        if (innerRef.current) {
          innerRef.current.setSelectionRange(0, 0);
        }
      }, 0);
    };
    
    // Handle blur event
    const handleBlur = () => {
      setIsFocused(false);
      // No longer clear rawInput on blur to maintain state
    };

    return (
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
          {symbolToUse}
        </div>
        <Input
          ref={innerRef}
          type="text"
          value={formatValue(value)}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn("pl-7", className)}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
