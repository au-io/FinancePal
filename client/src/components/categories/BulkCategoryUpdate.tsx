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
      console.log('Starting check for category:', sourceCategory);
      
      // Encode the category name to handle spaces and special characters
      const encodedCategory = encodeURIComponent(sourceCategory);
      console.log('Encoded category:', encodedCategory);
      
      const response = await fetch(`/api/categories/${encodedCategory}/count`, {
        credentials: 'include'
      });
      
      console.log('Response status:', response.status);
      
      // Check if the response has a content-type header
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      // Check if the content type indicates HTML (likely an error page)
      if (contentType && contentType.includes('text/html')) {
        console.error('Received HTML instead of JSON - likely a session error');
        throw new Error('Your session may have expired. Please refresh the page and try again.');
      }
      
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      // If we got an empty response or a non-200 status
      if (!responseText.trim() || !response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication error. Please log in again.');
        } else {
          throw new Error(`Server error: ${response.status}. Please try again.`);
        }
      }
      
      // Try to clean the response text in case there are any non-JSON characters
      const cleanedText = responseText.trim();
      
      let data;
      try {
        // Only try to parse if there's actual content and it looks like JSON
        if (cleanedText && (cleanedText.startsWith('{') || cleanedText.startsWith('['))) {
          data = JSON.parse(cleanedText);
        } else {
          console.error('Response does not appear to be valid JSON:', cleanedText);
          throw new Error('Invalid response format from server');
        }
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        console.error('Attempted to parse:', cleanedText);
        
        // If it starts with <!DOCTYPE, it's definitely HTML
        if (cleanedText.startsWith('<!DOCTYPE') || cleanedText.startsWith('<html')) {
          throw new Error('Received HTML instead of JSON. Your session may have expired. Please refresh the page.');
        } else {
          throw new Error(`Invalid JSON response from server`);
        }
      }
      
      if (response.ok) {
        console.log('Parsed data:', data);
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
        console.error('Server responded with error:', data);
        toast({
          title: "Error checking transactions",
          description: data.message || "Failed to check affected transactions. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking transactions:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while checking affected transactions.",
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
      
      // Add custom category to categories list if needed
      if (newCustomCategory.trim() && !categories.includes(newCustomCategory.trim())) {
        try {
          // Add the new category locally first
          await fetch('/api/categories', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: newCustomCategory.trim() }),
            credentials: 'include'
          });
        } catch (error) {
          console.error('Error adding new category:', error);
          // Continue anyway since the category will be used in transactions
        }
      }
      
      // Make the request
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
      
      console.log('Update response status:', response.status);
      console.log('Response headers:', 
        Array.from(response.headers.entries())
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
      );
      
      // Check if the content type indicates HTML (likely an error page)
      const contentType = response.headers.get('content-type');
      console.log('Update response Content-Type:', contentType);
      
      if (contentType && contentType.includes('text/html')) {
        console.error('Received HTML instead of JSON in update response - likely a session error');
        throw new Error('Your session may have expired. Please refresh the page and try again.');
      }
      
      // Get response as text first
      const responseText = await response.text();
      console.log('Update response text:', responseText);
      
      // If we got an empty response or a non-200 status
      if (!responseText.trim()) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication error. Please log in again.');
        } else {
          throw new Error(`Server error: ${response.status}. Please try again.`);
        }
      }
      
      let data;
      try {
        // Parse the JSON response if there's content and it looks like JSON
        if (responseText.trim() && (responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
          data = JSON.parse(responseText.trim());
          console.log('Parsed update response data:', data);
        } else {
          console.error('Response does not appear to be valid JSON:', responseText);
          
          // If it starts with <!DOCTYPE, it's definitely HTML
          if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
            throw new Error('Received HTML instead of JSON. Your session may have expired. Please refresh the page.');
          } else {
            throw new Error('Invalid response format from server');
          }
        }
      } catch (parseError) {
        console.error('Error parsing update response:', parseError);
        throw new Error(`Invalid JSON in update response`);
      }
      
      if (response.ok) {
        toast({
          title: "Categories updated",
          description: data && data.count 
            ? `${data.count} transactions were updated from "${sourceCategory}" to "${finalTargetCategory}".`
            : `Transactions were updated from "${sourceCategory}" to "${finalTargetCategory}".`,
          variant: "default"
        });
        
        // Reset form
        setSourceCategory('');
        setTargetCategory('');
        setNewCustomCategory('');
      } else {
        toast({
          title: "Update failed",
          description: data && data.message 
            ? data.message 
            : "Failed to update transactions. Please try again.",
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