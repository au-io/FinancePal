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
import { Account } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, FileText, Upload, Download, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
        const parsedData = parseCSV(text);
        setPreviewData(parsedData.slice(0, 5)); // Preview first 5 rows
      } catch (err) {
        setError('Invalid CSV format');
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
      const parsedData = parseCSV(text);
      
      if (parsedData.length === 0) {
        throw new Error('No data found in the CSV file');
      }
      
      setImportProgress(30);
      
      // Process transactions in batches
      const batchSize = 20;
      const batches = Math.ceil(parsedData.length / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const batch = parsedData.slice(i * batchSize, (i + 1) * batchSize);
        
        // Convert each row to a transaction
        const transactions = batch.map(row => {
          // Determine the transaction type
          const type = row.Type || (parseFloat(row.Amount || '0') >= 0 ? 'Income' : 'Expense');
          
          // Skip transfer transactions without destination accounts
          if (type === 'Transfer' && !row.DestinationAccount) {
            throw new Error(`Transfer transaction requires a destination account. Row: ${JSON.stringify(row)}`);
          }
          
          // Create base transaction object
          const transaction: any = {
            sourceAccountId: parseInt(accountId),
            amount: parseFloat(row.Amount || '0'),
            type: type,
            category: row.Category || 'Other',
            description: row.Description || '',
            date: new Date(row.Date || new Date()).toISOString(),
          };
          
          // If it's a transfer and has a destination account, add it
          if (type === 'Transfer' && row.DestinationAccount) {
            // Find the account ID by name
            const destinationAccount = accounts.find(a => 
              a.name.toLowerCase() === row.DestinationAccount.toLowerCase()
            );
            
            if (destinationAccount) {
              transaction.destinationAccountId = destinationAccount.id;
            } else {
              throw new Error(`Destination account '${row.DestinationAccount}' not found`);
            }
          }
          
          return transaction;
        });
        
        // Post transactions
        await Promise.all(transactions.map(tx => 
          apiRequest('POST', '/api/transactions', tx)
        ));
        
        // Update progress
        setImportProgress(30 + Math.floor(70 * (i + 1) / batches));
      }
      
      setImportProgress(100);
      
      // Success
      onSuccess();
      
      toast({
        title: 'Import successful',
        description: `Imported ${parsedData.length} transactions`,
      });
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
