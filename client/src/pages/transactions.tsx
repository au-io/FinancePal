import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { TransactionModal } from '@/components/modals/TransactionModal';
import { ImportTransactionsModal } from '@/components/transactions/ImportTransactionsModal';
import { Transaction } from '@shared/schema';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DownloadCloud,
  Filter,
  Loader2, 
  Plus, 
  Edit, 
  Trash2,
  Upload
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { downloadFileFromApi } from '@/lib/queryClient';

export default function Transactions() {
  const { toast } = useToast();
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedRecurring, setSelectedRecurring] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date } | undefined>(undefined);

  // Fetch accounts
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['/api/accounts'],
  });

  // Build query string for filtering
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (selectedAccountId && selectedAccountId !== 'all') {
      params.append('accountId', selectedAccountId);
    }
    if (dateRange?.from) {
      params.append('startDate', dateRange.from.toISOString());
      if (dateRange.to) {
        params.append('endDate', dateRange.to.toISOString());
      }
    }
    return params.toString();
  };

  // Fetch transactions with filters
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: [`/api/transactions?${buildQueryString()}`],
  });

  // Filter transactions by type and recurring status
  const filteredTransactions = React.useMemo(() => {
    if (!transactions) return [];
    
    let filtered = [...transactions];
    
    // Filter by transaction type
    if (selectedType && selectedType !== 'all') {
      filtered = filtered.filter((tx: Transaction) => tx.type === selectedType);
    }
    
    // Filter by recurring status
    if (selectedRecurring) {
      if (selectedRecurring === 'recurring') {
        filtered = filtered.filter((tx: Transaction) => tx.isRecurring === true);
      } else if (selectedRecurring === 'non-recurring') {
        filtered = filtered.filter((tx: Transaction) => !tx.isRecurring);
      }
    }
    
    return filtered;
  }, [transactions, selectedType, selectedRecurring]);

  // Transaction mutations
  const transactionMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingTransaction) {
        await apiRequest('PATCH', `/api/transactions/${editingTransaction.id}`, data);
      } else {
        await apiRequest('POST', '/api/transactions', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: `Transaction ${editingTransaction ? 'updated' : 'created'} successfully`,
        description: `The transaction has been ${editingTransaction ? 'updated' : 'added'} to your account.`,
      });
      setIsTransactionModalOpen(false);
      setEditingTransaction(null);
    },
    onError: (error) => {
      toast({
        title: `Failed to ${editingTransaction ? 'update' : 'create'} transaction`,
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: 'Transaction deleted',
        description: 'The transaction has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete transaction',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleDeleteTransaction = (id: number) => {
    deleteTransactionMutation.mutate(id);
  };

  const handleExportCSV = async () => {
    try {
      // Build query string for export
      let exportUrl = '/api/export/transactions';
      const queryString = buildQueryString();
      if (queryString) {
        exportUrl += `?${queryString}`;
      }
      
      await downloadFileFromApi(exportUrl, 'transactions.csv');
      
      toast({
        title: 'Transactions exported successfully',
        description: 'Your transactions have been exported to CSV.'
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export transactions',
        variant: 'destructive',
      });
    }
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
    setIsImportModalOpen(false);
    toast({
      title: 'Transactions imported successfully',
      description: 'Your transactions have been imported.',
    });
  };

  const transactionsTableColumns = [
    {
      header: 'Date',
      accessor: (tx: Transaction) => formatDate(tx.date),
      sortable: true,
      sortKey: 'date',
    },
    {
      header: 'Description',
      accessor: (tx: Transaction) => tx.description || tx.category,
    },
    {
      header: 'Category',
      accessor: 'category',
      sortable: true,
      sortKey: 'category',
    },
    {
      header: 'Account',
      accessor: (tx: any) => {
        if (tx.type === 'Transfer') {
          return `${tx.sourceAccountName || 'Unknown'} → ${tx.destinationAccountName || 'Unknown'}`;
        }
        return tx.sourceAccountName || 'Unknown';
      },
      sortable: true,
      sortKey: 'sourceAccountId',
    },
    {
      header: 'Type',
      accessor: 'type',
      sortable: true,
      sortKey: 'type',
    },
    {
      header: 'Recurring',
      accessor: (tx: Transaction) => {
        if (!tx.isRecurring) return 'No';
        
        // Build recurring info string
        let info = `Yes (${tx.frequency || 'Monthly'}`;
        
        // Add frequency-specific details
        if (tx.frequency === 'Monthly' && tx.frequencyDay) {
          info += ` on day ${tx.frequencyDay}`;
        } else if (tx.frequency === 'Custom' && tx.frequencyCustomDays) {
          info += ` every ${tx.frequencyCustomDays} day(s)`;
        }
        
        // Add end date if exists
        if (tx.recurringEndDate) {
          info += `, until ${formatDate(tx.recurringEndDate)}`;
        }
        
        info += ')';
        return info;
      },
      sortable: true,
      sortKey: 'isRecurring',
    },
    {
      header: 'User',
      accessor: (tx: any) => tx.userName || 'Unknown',
      sortable: true,
      sortKey: 'userId',
    },
    {
      header: 'Amount',
      accessor: (tx: Transaction) => (
        <span className={tx.type === 'Income' ? 'text-green-500' : tx.type === 'Expense' ? 'text-red-500' : ''}>
          {tx.type === 'Income' ? '+' : tx.type === 'Expense' ? '-' : ''}
          {formatCurrency(tx.amount)}
        </span>
      ),
      className: 'text-right',
      sortable: true,
      sortKey: 'amount',
    },
    {
      header: 'Actions',
      accessor: (tx: Transaction) => (
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEditTransaction(tx);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this transaction? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-500 hover:bg-red-600"
                  onClick={() => handleDeleteTransaction(tx.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  const isLoading = isLoadingAccounts || isLoadingTransactions;

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-primary">Transactions</h1>
          <p className="text-gray-600">Manage your financial transactions</p>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <Button 
            onClick={() => {
              setEditingTransaction(null);
              setIsTransactionModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button 
            variant="outline"
            onClick={handleExportCSV}
          >
            <DownloadCloud className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
          <CardDescription>Filter your transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Account</label>
              <Select value={selectedAccountId || 'all'} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts?.map((account: any) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <Select value={selectedType || 'all'} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Recurring</label>
              <Select value={selectedRecurring || 'all'} onValueChange={setSelectedRecurring}>
                <SelectTrigger>
                  <SelectValue placeholder="All Transactions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="recurring">Recurring Only</SelectItem>
                  <SelectItem value="non-recurring">Non-Recurring Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Date Range</label>
              <DatePickerWithRange 
                dateRange={dateRange} 
                onDateRangeChange={setDateRange} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Your Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No transactions found</h3>
              <p className="text-gray-500 mt-1">
                {transactions?.length > 0 
                  ? 'Try changing your filters to see more results'
                  : 'Create your first transaction to get started'}
              </p>
              <Button 
                onClick={() => {
                  setEditingTransaction(null);
                  setIsTransactionModalOpen(true);
                }}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </div>
          ) : (
            <DataTable 
              data={filteredTransactions}
              columns={transactionsTableColumns}
              onRowClick={handleEditTransaction}
              pagination
              pageSize={10}
              searchable
              defaultSortKey="date"
              defaultSortDirection="asc"
            />
          )}
        </CardContent>
      </Card>

      {/* Transaction Modal */}
      {isTransactionModalOpen && (
        <TransactionModal 
          isOpen={isTransactionModalOpen}
          onClose={() => setIsTransactionModalOpen(false)}
          onSubmit={(data) => transactionMutation.mutate(data)}
          accounts={accounts || []}
          editingTransaction={editingTransaction}
          isSubmitting={transactionMutation.isPending}
        />
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <ImportTransactionsModal 
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={handleImportSuccess}
          accounts={accounts || []}
        />
      )}
    </MainLayout>
  );
}
