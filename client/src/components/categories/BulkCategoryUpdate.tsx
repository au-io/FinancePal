import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Loader2 } from 'lucide-react';

interface BulkCategoryUpdateProps {
  categories: string[];
}

export function BulkCategoryUpdate({ categories }: BulkCategoryUpdateProps) {
  const { toast } = useToast();
  const [sourceCategory, setSourceCategory] = useState<string>('');
  const [targetCategory, setTargetCategory] = useState<string>('');
  const [newCustomCategory, setNewCustomCategory] = useState<string>('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [affectedCount, setAffectedCount] = useState(0);
  const [isCheckingCount, setIsCheckingCount] = useState(false);
  
  // Check affected transactions count
  const checkAffectedTransactions = async () => {
    if (!sourceCategory) return;
    
    setIsCheckingCount(true);
    
    try {
      const response = await fetch(`/api/categories/${sourceCategory}/count`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setAffectedCount(data.count);
        
        if (data.count > 0) {
          setIsConfirmDialogOpen(true);
        } else {
          toast({
            title: "No transactions found",
            description: `No transactions were found with the category "${sourceCategory}".`,
            variant: "default"
          });
        }
      } else {
        toast({
          title: "Error checking transactions",
          description: "Failed to check affected transactions. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking transactions:', error);
      toast({
        title: "Error",
        description: "An error occurred while checking affected transactions.",
        variant: "destructive"
      });
    } finally {
      setIsCheckingCount(false);
    }
  };
  
  // Handle the update
  const handleUpdate = async () => {
    if (!sourceCategory || (!targetCategory && !newCustomCategory)) return;
    
    setIsUpdating(true);
    
    try {
      // Use either the selected category or the new custom category
      const finalTargetCategory = targetCategory || newCustomCategory.trim();
      
      const response = await fetch('/api/categories/update-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldCategory: sourceCategory,
          newCategory: finalTargetCategory
        }),
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Categories updated",
          description: `${data.count} transactions were updated from "${sourceCategory}" to "${finalTargetCategory}".`,
          variant: "default"
        });
        
        // Reset form
        setSourceCategory('');
        setTargetCategory('');
        setNewCustomCategory('');
      } else {
        toast({
          title: "Update failed",
          description: "Failed to update transactions. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating transactions:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating transactions.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
      setIsConfirmDialogOpen(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Category Update</CardTitle>
        <CardDescription>
          Change all transactions from one category to another
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Source Category
              </label>
              <Select
                value={sourceCategory}
                onValueChange={setSourceCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Target Category
              </label>
              <Select
                value={targetCategory}
                onValueChange={val => {
                  setTargetCategory(val);
                  setNewCustomCategory(''); // Clear custom category when selecting from dropdown
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">
              Or Create New Target Category
            </label>
            <Input 
              placeholder="Enter new category name"
              value={newCustomCategory}
              onChange={(e) => {
                setNewCustomCategory(e.target.value);
                setTargetCategory(''); // Clear dropdown selection when typing custom category
              }}
            />
          </div>
          
          <Button 
            onClick={checkAffectedTransactions}
            disabled={
              !sourceCategory || 
              ((!targetCategory && !newCustomCategory) || sourceCategory === targetCategory) ||
              isUpdating ||
              isCheckingCount
            }
            className="w-full md:w-auto"
          >
            {isCheckingCount ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : "Update Categories"}
          </Button>
        </div>
      </CardContent>
      
      {/* Confirmation Dialog */}
      <AlertDialog 
        open={isConfirmDialogOpen} 
        onOpenChange={setIsConfirmDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Category Update</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will update <strong>{affectedCount} transactions</strong> from 
                category <strong>"{sourceCategory}"</strong> to{" "}
                <strong>"{targetCategory || newCustomCategory}"</strong>.
              </p>
              <p>Are you sure you want to continue?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdate}
              disabled={isUpdating}
              className="bg-primary"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : "Update Categories"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}