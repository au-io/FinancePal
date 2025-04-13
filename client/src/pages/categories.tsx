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
  
  // Function to remove a custom category
  const handleDeleteCategory = (category: string) => {
    setCategoryToDelete(category);
  };
  
  // Confirm deletion
  const confirmDeleteCategory = () => {
    if (categoryToDelete) {
      removeCategory(categoryToDelete);
      
      toast({
        title: "Category removed",
        description: `Category "${categoryToDelete}" has been removed.`
      });
      
      setCategoryToDelete(null);
    }
  };
  
  return (
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
            <AlertDialogDescription>
              This will remove the category "{categoryToDelete}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}