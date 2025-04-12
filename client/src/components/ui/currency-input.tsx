import React, { forwardRef } from 'react';
import { Input, InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
    currencySymbol = '$', 
    decimalPlaces = 2,
    className,
    ...props 
  }, ref) => {
    // Format value for display
    const formatValue = (val: number | string): string => {
      const numValue = typeof val === 'string' ? parseFloat(val) || 0 : val;
      return numValue.toFixed(decimalPlaces);
    };

    // Parse input value
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      // Remove any non-numeric characters except decimal point
      const sanitizedValue = inputValue.replace(/[^\d.]/g, '');
      
      // Check if the value is a valid number
      if (!isNaN(parseFloat(sanitizedValue))) {
        onChange(parseFloat(sanitizedValue));
      } else if (sanitizedValue === '' || sanitizedValue === '.') {
        onChange(0);
      }
    };

    return (
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
          {currencySymbol}
        </div>
        <Input
          ref={ref}
          type="text"
          value={formatValue(value)}
          onChange={handleInputChange}
          className={cn("pl-7", className)}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
