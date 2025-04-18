import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { TransactionModal } from '@/components/modals/TransactionModal';
import { Transaction } from '@shared/schema';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart2,
  Edit, 
  Loader2, 
  Plus, 
  RefreshCw,
  Repeat,
  Trash2,
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function RecurringTransactions() {
  const { toast } = useToast();
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch accounts
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['/api/accounts'],
  });

  // Fetch transactions
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['/api/transactions'],
  });

  // Filter recurring transactions
  const recurringTransactions = React.useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((tx: Transaction) => tx.isRecurring === true);
  }, [transactions]);

  // Filter recurring income
  const recurringIncome = React.useMemo(() => {
    if (!recurringTransactions) return [];
    return recurringTransactions.filter((tx: Transaction) => tx.type === 'Income');
  }, [recurringTransactions]);

  // Filter recurring expenses
  const recurringExpenses = React.useMemo(() => {
    if (!recurringTransactions) return [];
    return recurringTransactions.filter((tx: Transaction) => tx.type === 'Expense');
  }, [recurringTransactions]);
  
  // Calculate summary metrics
  const totalRecurringIncome = React.useMemo(() => {
    return recurringIncome.reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);
  }, [recurringIncome]);
  
  const totalRecurringExpenses = React.useMemo(() => {
    return recurringExpenses.reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);
  }, [recurringExpenses]);
  
  const netRecurringAmount = totalRecurringIncome - totalRecurringExpenses;

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
        description: `The recurring transaction has been ${editingTransaction ? 'updated' : 'added'} to your account.`,
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
        title: 'Recurring transaction deleted',
        description: 'The recurring transaction has been deleted successfully.',
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

  const handleCreateTransaction = (type: 'Income' | 'Expense') => {
    // Create a new recurring transaction with the selected type
    setEditingTransaction(null);
    setIsTransactionModalOpen(true);
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
      header: 'Frequency',
      accessor: (tx: Transaction) => {
        // Build recurring info string
        let info = tx.frequency || 'Monthly';
        
        // Add frequency-specific details
        if (tx.frequency === 'Monthly' && tx.frequencyDay) {
          info += ` (Day ${tx.frequencyDay})`;
        } else if (tx.frequency === 'Custom' && tx.frequencyCustomDays) {
          info += ` (Every ${tx.frequencyCustomDays} days)`;
        }
        
        return info;
      },
      sortable: true,
      sortKey: 'frequency',
    },
    {
      header: 'End Date',
      accessor: (tx: Transaction) => {
        return tx.recurringEndDate ? formatDate(tx.recurringEndDate) : 'None';
      },
      sortable: true,
      sortKey: 'recurringEndDate',
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
                <AlertDialogTitle>Delete Recurring Transaction</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this recurring transaction? This action cannot be undone.
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

  const activeTransactions = 
    activeTab === 'income' ? recurringIncome :
    activeTab === 'expenses' ? recurringExpenses :
    recurringTransactions;

  const isLoading = isLoadingAccounts || isLoadingTransactions;

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-primary">Recurring Transactions</h1>
          <p className="text-gray-600">Manage your recurring income and expenses</p>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <Button 
            onClick={() => {
              setEditingTransaction(null);
              setIsTransactionModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Recurring Transaction
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-green-600 flex items-center">
              <RefreshCw className="h-5 w-5 mr-2" />
              Recurring Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRecurringIncome)}</div>
            <p className="text-sm text-gray-500 mt-1">{recurringIncome.length} recurring income transactions</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-red-600 flex items-center">
              <RefreshCw className="h-5 w-5 mr-2" />
              Recurring Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRecurringExpenses)}</div>
            <p className="text-sm text-gray-500 mt-1">{recurringExpenses.length} recurring expense transactions</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <BarChart2 className="h-5 w-5 mr-2" />
              Net Monthly Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netRecurringAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netRecurringAmount)}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {netRecurringAmount >= 0 
                ? 'Positive cash flow from recurring transactions' 
                : 'Negative cash flow from recurring transactions'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Transactions Tabs */}
      <Tabs defaultValue="all" className="space-y-4" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="flex gap-2 items-center">
            <Repeat className="h-4 w-4" />
            All Recurring Transactions
          </TabsTrigger>
          <TabsTrigger value="income" className="flex gap-2 items-center text-green-600">
            <Repeat className="h-4 w-4" />
            Income
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex gap-2 items-center text-red-600">
            <Repeat className="h-4 w-4" />
            Expenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>All Recurring Transactions</CardTitle>
              <CardDescription>View and manage all your recurring transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : activeTransactions.length === 0 ? (
                <div className="text-center py-10">
                  <h3 className="text-lg font-medium">No recurring transactions found</h3>
                  <p className="text-gray-500 mt-1">Create your first recurring transaction to get started</p>
                  <Button 
                    onClick={() => {
                      setEditingTransaction(null);
                      setIsTransactionModalOpen(true);
                    }}
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Recurring Transaction
                  </Button>
                </div>
              ) : (
                <DataTable 
                  data={activeTransactions}
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
        </TabsContent>

        <TabsContent value="income" className="space-y-4">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Recurring Income</CardTitle>
              <CardDescription>View and manage your recurring income transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : activeTransactions.length === 0 ? (
                <div className="text-center py-10">
                  <h3 className="text-lg font-medium">No recurring income found</h3>
                  <p className="text-gray-500 mt-1">Create your first recurring income transaction to get started</p>
                  <Button 
                    onClick={() => {
                      setEditingTransaction(null);
                      setIsTransactionModalOpen(true);
                    }}
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Recurring Income
                  </Button>
                </div>
              ) : (
                <DataTable 
                  data={activeTransactions}
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
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Recurring Expenses</CardTitle>
              <CardDescription>View and manage your recurring expense transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : activeTransactions.length === 0 ? (
                <div className="text-center py-10">
                  <h3 className="text-lg font-medium">No recurring expenses found</h3>
                  <p className="text-gray-500 mt-1">Create your first recurring expense transaction to get started</p>
                  <Button 
                    onClick={() => {
                      setEditingTransaction(null);
                      setIsTransactionModalOpen(true);
                    }}
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Recurring Expense
                  </Button>
                </div>
              ) : (
                <DataTable 
                  data={activeTransactions}
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
        </TabsContent>
      </Tabs>

      {/* Transaction Modal */}
      {isTransactionModalOpen && (
        <TransactionModal 
          isOpen={isTransactionModalOpen}
          onClose={() => setIsTransactionModalOpen(false)}
          onSubmit={(data) => {
            // Ensure the transaction is set as recurring
            transactionMutation.mutate({...data, isRecurring: true})
          }}
          accounts={accounts || []}
          editingTransaction={editingTransaction}
          isSubmitting={transactionMutation.isPending}
          defaultRecurring={true}  // Default to recurring for this page
        />
      )}
    </MainLayout>
  );
}