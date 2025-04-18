import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator'; 
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PlusCircle, Trash } from 'lucide-react';
import { transactionCategories } from '@shared/schema';
import { useCategories } from '@/hooks/use-categories';
import { MainLayout } from '@/components/layout/MainLayout';

export default function Categories() {
  const { toast } = useToast();
  const { customCategories, addCategory, removeCategory } = useCategories();
  const [newCategory, setNewCategory] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  
  // Function to add a new category
  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    
    // Don't add duplicate categories
    const categoryName = newCategory.trim();
    if (
      transactionCategories.some(cat => cat === categoryName) || 
      customCategories.includes(categoryName)
    ) {
      toast({
        title: "Category already exists",
        description: "This category name is already in use.",
        variant: "destructive"
      });
      return;
    }
    
    addCategory(newCategory.trim());
    setNewCategory('');
    
    toast({
      title: "Category added",
      description: `New category "${newCategory.trim()}" has been added.`
    });
  };
  
  // State to track affected transactions count
  const [affectedTransactionsCount, setAffectedTransactionsCount] = useState<number>(0);
  const [isCheckingTransactions, setIsCheckingTransactions] = useState<boolean>(false);

  // Function to remove a custom category
  const handleDeleteCategory = async (category: string) => {
    setIsCheckingTransactions(true);
    
    try {
      // Check how many transactions use this category
      const response = await fetch(`/api/categories/${category}/count`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setAffectedTransactionsCount(data.count);
      } else {
        console.error('Failed to get transaction count');
        setAffectedTransactionsCount(0);
      }
    } catch (error) {
      console.error('Error checking affected transactions:', error);
      setAffectedTransactionsCount(0);
    } finally {
      setIsCheckingTransactions(false);
    }
    
    setCategoryToDelete(category);
  };
  
  // Confirm deletion
  const confirmDeleteCategory = async () => {
    if (categoryToDelete) {
      // The actual category removal and transaction updates are done in the useCategories hook
      await removeCategory(categoryToDelete);
      
      toast({
        title: "Category removed",
        description: affectedTransactionsCount > 0 
          ? `Category "${categoryToDelete}" has been removed. ${affectedTransactionsCount} transactions were updated to use the "Other" category.`
          : `Category "${categoryToDelete}" has been removed.`
      });
      
      setCategoryToDelete(null);
      setAffectedTransactionsCount(0);
    }
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Transaction Categories</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Add New Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input 
                placeholder="Enter category name" 
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="max-w-md"
              />
              <Button 
                onClick={handleAddCategory}
                disabled={!newCategory.trim()}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>System Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {transactionCategories.map((category) => (
                <div key={category} className="flex items-center p-2 border rounded-md">
                  <span className="font-medium flex-1">{category}</span>
                  {/* System categories can't be deleted */}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {customCategories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Custom Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {customCategories.map((category) => (
                  <div key={category} className="flex items-center p-2 border rounded-md">
                    <span className="font-medium flex-1">{category}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteCategory(category)}
                    >
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>This will remove the category "{categoryToDelete}". This action cannot be undone.</p>
                
                {isCheckingTransactions ? (
                  <p className="text-muted-foreground">Checking affected transactions...</p>
                ) : affectedTransactionsCount > 0 ? (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="font-medium text-amber-800">Warning: This will affect {affectedTransactionsCount} transactions</p>
                    <p className="text-amber-700 text-sm mt-1">
                      These transactions will have their category changed to "Other".
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No transactions are using this category.</p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteCategory} 
                className="bg-destructive text-destructive-foreground"
                disabled={isCheckingTransactions}
              >
                {isCheckingTransactions ? 'Checking...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}