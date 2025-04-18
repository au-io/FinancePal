import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { transactionCategories } from '@shared/schema';

// Interface for our context
type CategoryContextType = {
  customCategories: string[];
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  getAllCategories: () => string[];
};

// Create the context
const CategoryContext = createContext<CategoryContextType | null>(null);

// Local storage key
const STORAGE_KEY = 'joba_custom_categories';

// Provider component
export function CategoryProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage if available
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // Save to localStorage when customCategories changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customCategories));
  }, [customCategories]);

  // Add a new category
  const addCategory = (category: string) => {
    const trimmedCategory = category.trim();
    if (!trimmedCategory) return;
    
    // Check if it already exists
    if (
      transactionCategories.some(cat => cat === trimmedCategory) || 
      customCategories.includes(trimmedCategory)
    ) {
      return;
    }
    
    setCustomCategories(prev => [...prev, trimmedCategory]);
  };

  // Remove a category and update associated transactions
  const removeCategory = async (category: string) => {
    try {
      // Update all transactions with this category to use "Other"
      await fetch('/api/categories/update-transactions', {
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
      
      // Then remove the category
      setCustomCategories(prev => prev.filter(cat => cat !== category));
    } catch (error) {
      console.error('Error updating transactions for deleted category:', error);
      // Still remove the category from the list even if transaction update fails
      setCustomCategories(prev => prev.filter(cat => cat !== category));
    }
  };

  // Get all categories (system + custom)
  const getAllCategories = (): string[] => {
    return [...transactionCategories, ...customCategories];
  };

  return (
    <CategoryContext.Provider 
      value={{ 
        customCategories, 
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