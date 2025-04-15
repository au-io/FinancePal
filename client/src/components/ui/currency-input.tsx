import React, { forwardRef, useState } from 'react';
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
  }, ref) => {
    // Get current currency symbol from context
    const { currencySymbol: contextCurrencySymbol } = useCurrency();
    
    // Use provided symbol or the one from context
    const symbolToUse = currencySymbol || contextCurrencySymbol;
    
    // State to hold input value
    const [inputText, setInputText] = useState('');

    // Format value for display
    const formatValue = (val: number | string): string => {
      if (inputText && document.activeElement === ref?.current) {
        // If user is currently editing, show unformatted input
        return inputText;
      } else {
        // Otherwise show the formatted value
        const numValue = typeof val === 'string' ? parseFloat(val) || 0 : val;
        return numValue.toFixed(decimalPlaces);
      }
    };

    // Parse input value
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Store raw input for display while editing
      setInputText(inputValue);
      
      // Remove any non-numeric characters except decimal point
      const sanitizedValue = inputValue.replace(/[^\d.]/g, '');
      
      // Enforce proper decimal format (only one decimal point, max 2 decimal places)
      if (sanitizedValue.includes('.')) {
        const [whole, decimal] = sanitizedValue.split('.');
        const formattedDecimal = decimal.slice(0, decimalPlaces);
        const formattedValue = whole + (formattedDecimal ? '.' + formattedDecimal : '');
        
        // Check if the value is a valid number
        if (!isNaN(parseFloat(formattedValue))) {
          onChange(parseFloat(formattedValue));
        } else if (formattedValue === '' || formattedValue === '.') {
          onChange(0);
        }
      } else {
        // No decimal point
        if (!isNaN(parseFloat(sanitizedValue))) {
          onChange(parseFloat(sanitizedValue));
        } else if (sanitizedValue === '') {
          onChange(0);
        }
      }
    };
    
    // When input loses focus, reset to formatted value
    const handleBlur = () => {
      setInputText('');
    };

    return (
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
          {symbolToUse}
        </div>
        <Input
          ref={ref}
          type="text"
          value={formatValue(value)}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={cn("pl-7", className)}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
