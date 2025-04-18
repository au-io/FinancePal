import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest, parseCSV, downloadFileFromApi } from '@/lib/queryClient';
import { Account, transactionTypes, transactionCategories } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, FileText, Upload, Download, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Helper functions for data validation and normalization
function normalizeTransactionType(type: string): string | null {
  // Case-insensitive match
  const normalizedType = type.toLowerCase().trim();
  
  // Direct matches
  if (normalizedType === 'income') return 'Income';
  if (normalizedType === 'expense') return 'Expense';
  if (normalizedType === 'transfer') return 'Transfer';
  
  // Common synonyms
  if (['earning', 'salary', 'revenue', 'payment', 'deposit', 'credit'].includes(normalizedType)) {
    return 'Income';
  }
  
  if (['cost', 'payment', 'purchase', 'bill', 'debit', 'spending', 'paid'].includes(normalizedType)) {
    return 'Expense';
  }
  
  if (['move', 'send', 'wire', 'transmit', 'moved'].includes(normalizedType)) {
    return 'Transfer';
  }
  
  // If no match found
  return null;
}

function normalizeCategory(category: string): string | null {
  // Case-insensitive match
  const normalizedCategory = category.toLowerCase().trim();
  
  // Check for exact matches with standard categories
  for (const standardCategory of transactionCategories) {
    if (normalizedCategory === standardCategory.toLowerCase()) {
      return standardCategory;
    }
  }
  
  // Common category synonyms and variants
  const categoryMap: Record<string, string> = {
    'rent': 'Housing',
    'mortgage': 'Housing',
    'apartment': 'Housing',
    'home': 'Housing',
    'property': 'Housing',
    
    'car': 'Transportation',
    'gas': 'Transportation',
    'fuel': 'Transportation',
    'bus': 'Transportation',
    'train': 'Transportation',
    'metro': 'Transportation',
    'taxi': 'Transportation',
    'uber': 'Transportation',
    'lyft': 'Transportation',
    
    'groceries': 'Food',
    'restaurant': 'Food',
    'dining': 'Food',
    'takeout': 'Food',
    'lunch': 'Food',
    'dinner': 'Food',
    
    'electric': 'Utilities',
    'electricity': 'Utilities',
    'water': 'Utilities',
    'gas bill': 'Utilities',
    'internet': 'Utilities',
    'phone': 'Utilities',
    'mobile': 'Utilities',
    
    'health': 'Healthcare',
    'doctor': 'Healthcare',
    'medical': 'Healthcare',
    'dentist': 'Healthcare',
    'medicine': 'Healthcare',
    'pharmacy': 'Healthcare',
    
    'movies': 'Entertainment',
    'music': 'Entertainment',
    'game': 'Entertainment',
    'games': 'Entertainment',
    'streaming': 'Entertainment',
    'netflix': 'Entertainment',
    'spotify': 'Entertainment',
    
    'college': 'Education',
    'school': 'Education',
    'university': 'Education',
    'course': 'Education',
    'book': 'Education',
    'books': 'Education',
    'tuition': 'Education',
    
    'wages': 'Salary',
    'income': 'Salary',
    'paycheck': 'Salary',
    'bonus': 'Salary',
    'commission': 'Salary',
    
    'investment': 'Business',
    'dividend': 'Business',
    'profit': 'Business',
    'interest': 'Business'
  };
  
  // Check for category aliases
  if (categoryMap[normalizedCategory]) {
    return categoryMap[normalizedCategory];
  }
  
  // If no match found, return null (will use the original value)
  return null;
}

interface ImportTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
}

export function ImportTransactionsModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  accounts,
}: ImportTransactionsModalProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);
    
    if (!selectedFile) {
      setFile(null);
      setPreviewData([]);
      return;
    }
    
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      setFile(null);
      setPreviewData([]);
      return;
    }
    
    setFile(selectedFile);
    
    // Read and preview the file
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        
        // Log first 100 characters for debugging
        console.log('CSV sample:', text.substring(0, 100));
        
        // Parse the CSV data
        const parsedData = parseCSV(text);
        
        if (parsedData.length === 0) {
          setError('No data found in the CSV file. Please check the format and ensure it has headers (Date, Type, Category, Description, Amount).');
          setPreviewData([]);
          return;
        }
        
        // Check for required columns
        const firstRow = parsedData[0];
        const missingColumns = [];
        
        if (!firstRow.Date && !firstRow.date) missingColumns.push('Date');
        if (!firstRow.Amount && !firstRow.amount) missingColumns.push('Amount');
        
        if (missingColumns.length > 0) {
          setError(`Missing required columns in CSV: ${missingColumns.join(', ')}. Please ensure your CSV has the correct headers.`);
          setPreviewData(parsedData.slice(0, 5)); // Still show preview to help debugging
          return;
        }
        
        setPreviewData(parsedData.slice(0, 5)); // Preview first 5 rows
      } catch (err) {
        setError(`Invalid CSV format: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setPreviewData([]);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file || !accountId) {
      setError('Please select both a file and an account');
      return;
    }
    
    setError(null);
    setIsImporting(true);
    setImportProgress(10);
    
    try {
      // Read the file
      const text = await file.text();
      
      // Log sample for debugging
      console.log('CSV import content sample:', text.substring(0, 200));
      
      const parsedData = parseCSV(text);
      
      if (parsedData.length === 0) {
        throw new Error('No data found in the CSV file. Make sure your file has the correct format with the following headers: Date, Type, Category, Description, Amount.');
      }
      
      // Check for required columns
      const firstRow = parsedData[0];
      const missingColumns = [];
      
      if (!('Date' in firstRow) && !('date' in firstRow)) missingColumns.push('Date');
      if (!('Amount' in firstRow) && !('amount' in firstRow)) missingColumns.push('Amount');
      
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns in CSV: ${missingColumns.join(', ')}. Please ensure your CSV has all required headers.`);
      }
      
      setImportProgress(30);
      
      // Process transactions in batches
      const batchSize = 20;
      const batches = Math.ceil(parsedData.length / batchSize);
      let importedCount = 0;
      let errorCount = 0;
      let errors = [];
      
      for (let i = 0; i < batches; i++) {
        const batch = parsedData.slice(i * batchSize, (i + 1) * batchSize);
        
        // Convert each row to a transaction
        const transactions = [];
        
        for (const row of batch) {
          try {
            // Get amount and validate
            const amountKey = 'Amount' in row ? 'Amount' : 'amount';
            const amountStr = row[amountKey] ? row[amountKey].trim() : '';
            let amount = parseFloat(amountStr || '0');
            
            if (isNaN(amount)) {
              throw new Error(`Invalid amount: "${amountStr}"`);
            }
            
            // Determine transaction type
            const typeKey = 'Type' in row ? 'Type' : 'type';
            let type = row[typeKey] ? row[typeKey].trim() : '';
            
            // For Expense type with negative amount values, ensure amount is positive
            // to avoid double negatives when the system applies the sign later
            if (type.toLowerCase().includes('expense') && amount < 0) {
              // Convert to positive since the system will apply the negative sign
              amount = Math.abs(amount);
            }
            
            // Get date and validate
            const dateKey = 'Date' in row ? 'Date' : 'date';
            const dateStr = row[dateKey] ? row[dateKey].trim() : '';
            let parsedDate;
            
            try {
              parsedDate = new Date(dateStr);
              if (isNaN(parsedDate.getTime())) {
                throw new Error(`Invalid date: "${dateStr}". Use format YYYY-MM-DD.`);
              }
            } catch (e) {
              throw new Error(`Invalid date: "${dateStr}". Use format YYYY-MM-DD.`);
            }
            
            // Normalize and validate transaction type
            if (!type) {
              // Auto-determine type based on amount if not provided
              type = amount >= 0 ? 'Income' : 'Expense';
            } else {
              // Normalize transaction type to match one of the valid types
              const normalizedType = normalizeTransactionType(type);
              if (normalizedType) {
                type = normalizedType;
              } else {
                throw new Error(`Invalid transaction type: "${type}". Must be one of: Income, Expense, or Transfer.`);
              }
            }
            
            // Skip transfer transactions without destination accounts
            const destKey = 'DestinationAccount' in row ? 'DestinationAccount' : 'destinationAccount';
            if (type === 'Transfer' && !row[destKey]) {
              throw new Error(`Transfer transaction requires a destination account.`);
            }
            
            // Validate and normalize category
            const categoryKey = 'Category' in row ? 'Category' : 'category';
            let category = row[categoryKey] ? row[categoryKey].trim() : 'Other';
            const normalizedCategory = normalizeCategory(category);
            if (normalizedCategory) {
              category = normalizedCategory;
            }
            
            // Get description
            const descKey = 'Description' in row ? 'Description' : 'description';
            const description = row[descKey] ? row[descKey].trim() : '';
            
            // Create base transaction object
            const transaction: any = {
              sourceAccountId: parseInt(accountId),
              amount: amount,
              type: type,
              category: category,
              description: description,
              date: parsedDate.toISOString(),
            };
            
            // If it's a transfer and has a destination account, add it
            if (type === 'Transfer' && row[destKey]) {
              // Find the account ID by name
              const destinationAccountName = row[destKey].trim();
              const destinationAccount = accounts.find(a => 
                a.name.toLowerCase() === destinationAccountName.toLowerCase()
              );
              
              if (destinationAccount) {
                transaction.destinationAccountId = destinationAccount.id;
              } else {
                throw new Error(`Destination account '${destinationAccountName}' not found. Available accounts: ${accounts.map(a => a.name).join(', ')}`);
              }
            }
            
            transactions.push(transaction);
          } catch (rowError: any) {
            errorCount++;
            errors.push(`Row ${i * batchSize + transactions.length + 1}: ${rowError.message || 'Unknown error'}`);
            
            // If too many errors, stop processing
            if (errorCount > 5) {
              throw new Error(`Too many errors (${errorCount}). First 5 errors: ${errors.slice(0, 5).join('; ')}`);
            }
          }
        }
        
        if (transactions.length === 0) {
          continue;
        }
        
        // Post transactions
        try {
          await Promise.all(transactions.map(tx => 
            apiRequest('POST', '/api/transactions', tx)
          ));
          importedCount += transactions.length;
        } catch (batchError: any) {
          throw new Error(`Error importing batch ${i+1}: ${batchError.message || 'Unknown error'}`);
        }
        
        // Update progress
        setImportProgress(30 + Math.floor(70 * (i + 1) / batches));
      }
      
      setImportProgress(100);
      
      // Report results
      if (errorCount > 0) {
        setError(`Imported ${importedCount} transactions with ${errorCount} errors. ${errors.slice(0, 3).join('; ')}`);
        
        toast({
          title: 'Import partially successful',
          description: `Imported ${importedCount} transactions with ${errorCount} errors.`,
          variant: 'default',
        });
      } else {
        // Full success
        onSuccess();
        
        toast({
          title: 'Import successful',
          description: `Imported ${importedCount} transactions`,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import transactions');
      
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Failed to import transactions',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isImporting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Transactions</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="account">Select Account</Label>
            <Select
              value={accountId}
              onValueChange={setAccountId}
              disabled={isImporting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="file">Upload CSV File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isImporting}
                className="flex-1"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">
                CSV should have columns: Date, Amount, Type, Category, Description
              </p>
              <p className="text-xs text-gray-500">
                For Transfer transactions, add the 'DestinationAccount' column with the exact account name.
              </p>
              
              <div className="pt-2">
                <p className="text-xs font-medium text-gray-700 mb-1">Download Template:</p>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline"
                    className="text-xs h-8"
                    onClick={async () => {
                      try {
                        await downloadFileFromApi(
                          '/api/templates/regular-transactions',
                          'regular-transactions-template.csv'
                        );
                        toast({
                          title: 'Template downloaded',
                          description: 'Regular transactions template downloaded successfully.'
                        });
                      } catch (error) {
                        toast({
                          title: 'Download failed',
                          description: error instanceof Error ? error.message : 'Failed to download template',
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Regular
                  </Button>
                  
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline"
                    className="text-xs h-8"
                    onClick={async () => {
                      try {
                        await downloadFileFromApi(
                          '/api/templates/transfer-transactions',
                          'transfer-transactions-template.csv'
                        );
                        toast({
                          title: 'Template downloaded',
                          description: 'Transfer transactions template downloaded successfully.'
                        });
                      } catch (error) {
                        toast({
                          title: 'Download failed',
                          description: error instanceof Error ? error.message : 'Failed to download template',
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Transfer
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 p-3 rounded-md flex items-start gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {file && previewData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <h4 className="text-sm font-medium">Preview ({file.name})</h4>
              </div>
              
              <div className="border rounded-md overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(previewData[0]).map((header) => (
                        <th
                          key={header}
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {Object.values(row).map((cell: any, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-3 py-2 text-xs text-gray-500 truncate max-w-[150px]"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {isImporting && (
            <div className="space-y-2">
              <Progress value={importProgress} className="w-full" />
              <p className="text-sm text-center text-gray-500">
                Importing transactions... {importProgress}%
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || !file || !accountId}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
