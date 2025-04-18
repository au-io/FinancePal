import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { transactionCategories } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

// Interface for our context
type CategoryContextType = {
  customCategories: string[];
  addCategory: (category: string) => Promise<void>;
  removeCategory: (category: string) => Promise<void>;
  getAllCategories: () => string[];
};

// Create the context
const CategoryContext = createContext<CategoryContextType | null>(null);

// Provider component
export function CategoryProvider({ children }: { children: ReactNode }) {
  // Get transactions to extract used categories
  const [customCategoriesFromTransactions, setCustomCategoriesFromTransactions] = useState<string[]>([]);
  
  // Fetch transactions (even if we already have them elsewhere, this keeps categories in sync)
  const { data: transactions = [] } = useQuery<any[]>({
    queryKey: ['/api/transactions'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract custom categories from transactions
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      // Get unique categories from transactions that aren't in the base categories
      const uniqueCategories = [...new Set(transactions.map(tx => tx.category))];
      const customCats = uniqueCategories.filter(
        cat => !transactionCategories.includes(cat as any)
      );
      setCustomCategoriesFromTransactions(customCats);
    }
  }, [transactions]);

  // Add a new category
  const addCategory = async (category: string): Promise<void> => {
    const trimmedCategory = category.trim();
    if (!trimmedCategory) return;
    
    // Check if it already exists
    if (
      transactionCategories.includes(trimmedCategory as any) || 
      customCategoriesFromTransactions.includes(trimmedCategory)
    ) {
      return;
    }
    
    // Create the category on the server - will be used with the first transaction
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmedCategory }),
        credentials: 'include'
      });
      
      if (response.ok) {
        // Add to local state to avoid refetching
        setCustomCategoriesFromTransactions(prev => [...prev, trimmedCategory]);
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  // Remove a category and update associated transactions
  const removeCategory = async (category: string): Promise<void> => {
    try {
      // Don't allow removing default categories
      if (transactionCategories.includes(category as any)) {
        console.error('Cannot remove default category');
        return;
      }
      
      // Update all transactions with this category to use "Other"
      const response = await fetch('/api/categories/update-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldCategory: category,
          newCategory: 'Other'
        }),
        credentials: 'include'
      });
      
      if (response.ok) {
        // Remove from local state
        setCustomCategoriesFromTransactions(prev => 
          prev.filter(cat => cat !== category)
        );
      }
    } catch (error) {
      console.error('Error updating transactions for deleted category:', error);
    }
  };

  // Get all categories (system + custom)
  const getAllCategories = (): string[] => {
    return [...transactionCategories, ...customCategoriesFromTransactions];
  };

  return (
    <CategoryContext.Provider 
      value={{ 
        customCategories: customCategoriesFromTransactions, 
        addCategory, 
        removeCategory,
        getAllCategories,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
}

// Hook to use the category context
export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
}