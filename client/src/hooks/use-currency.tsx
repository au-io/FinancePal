import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { Family } from '@shared/schema';

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

// Initial context setup
const defaultCurrency: CurrencyType = 'GBP';

const contextValue: CurrencyContextType = {
  currency: defaultCurrency,
  currencySymbol: currencySymbols[defaultCurrency],
  setCurrency: () => {}
};

export const CurrencyContext = createContext<CurrencyContextType>(contextValue);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyType>(defaultCurrency);
  const { user } = useAuth();
  
  // If user is part of a family, get the family's currency
  const { data: families } = useQuery<Family[]>({
    queryKey: ['/api/families'],
    enabled: !!user?.familyId,
  });

  useEffect(() => {
    if (user?.familyId && families) {
      const family = families.find(f => f.id === user.familyId);
      if (family && family.currency && family.currency in currencySymbols) {
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