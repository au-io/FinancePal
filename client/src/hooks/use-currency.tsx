import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';

// Define available currency options
export type CurrencyType = 'USD' | 'GBP' | 'EUR' | 'INR' | 'JPY';

// Currency symbols mapped to currency codes
export const currencySymbols: Record<CurrencyType, string> = {
  'USD': '$',
  'GBP': '£',
  'EUR': '€',
  'INR': '₹',
  'JPY': '¥'
};

interface CurrencyContextType {
  currency: CurrencyType;
  currencySymbol: string;
  setCurrency: (currency: CurrencyType) => void;
}

export const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  currencySymbol: '$',
  setCurrency: () => {}
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyType>('USD');
  const { user } = useAuth();
  
  // If user is part of a family, get the family's currency
  const { data: families } = useQuery({
    queryKey: ['/api/families'],
    enabled: !!user?.familyId,
  });

  useEffect(() => {
    if (user?.familyId && families) {
      const family = families.find((f: any) => f.id === user.familyId);
      if (family && family.currency) {
        setCurrency(family.currency as CurrencyType);
      }
    }
  }, [user?.familyId, families]);

  // Get the current currency symbol
  const currencySymbol = currencySymbols[currency];

  return (
    <CurrencyContext.Provider value={{ currency, currencySymbol, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}