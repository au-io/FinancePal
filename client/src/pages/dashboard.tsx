import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { ExpenseCategories } from '@/components/dashboard/ExpenseCategories';
import { MonthlyOverview } from '@/components/dashboard/MonthlyOverview';
import { UpcomingPayments } from '@/components/dashboard/UpcomingPayments';
import { TransactionModal } from '@/components/modals/TransactionModal';
import { ViewToggle } from '@/components/layout/ViewToggle';
import { Transaction } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionCalendar } from '@/components/dashboard/TransactionCalendar';
import { CashFlowForecast } from '@/components/dashboard/CashFlowForecast';

export default function Dashboard() {
  const { toast } = useToast();
  const [isPersonalView, setIsPersonalView] = useState(true);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Fetch user's accounts
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['/api/accounts'],
  });

  // Fetch transactions
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: isPersonalView ? ['/api/transactions'] : ['/api/family/transactions'],
  });

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    if (!accounts || !transactions) {
      return {
        totalBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
      };
    }

    // Total balance from all accounts
    const totalBalance = accounts.reduce((sum: number, acc: any) => sum + acc.balance, 0);

    // Current month's transactions
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    const monthlyTransactions = transactions.filter((tx: any) => {
      const txDate = new Date(tx.date);
      return txDate.getMonth() === thisMonth && txDate.getFullYear() === thisYear;
    });

    // Monthly income and expenses
    const monthlyIncome = monthlyTransactions
      .filter((tx: any) => tx.type === 'Income')
      .reduce((sum: number, tx: any) => sum + tx.amount, 0);

    const monthlyExpenses = monthlyTransactions
      .filter((tx: any) => tx.type === 'Expense')
      .reduce((sum: number, tx: any) => sum + tx.amount, 0);

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
    };
  }, [accounts, transactions]);

  // Transaction mutation
  const transactionMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingTransaction) {
        await apiRequest('PATCH', `/api/transactions/${editingTransaction.id}`, data);
        return;
      }
      await apiRequest('POST', '/api/transactions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/family/transactions'] });
      
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

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  const isLoading = isLoadingAccounts || isLoadingTransactions;

  return (
    <MainLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-primary">Dashboard</h1>
          <p className="text-gray-600">Your financial overview</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
          <ViewToggle 
            isPersonalView={isPersonalView} 
            onToggle={() => setIsPersonalView(!isPersonalView)} 
          />
          
          <Button 
            onClick={() => {
              setEditingTransaction(null);
              setIsTransactionModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SummaryCard 
              type="balance" 
              amount={summaryStats.totalBalance} 
              changePercentage={2.4} 
              label="Total Balance" 
            />
            <SummaryCard 
              type="income" 
              amount={summaryStats.monthlyIncome} 
              changePercentage={5.1} 
              label="Monthly Income" 
            />
            <SummaryCard 
              type="expense" 
              amount={summaryStats.monthlyExpenses} 
              changePercentage={8.2} 
              label="Monthly Expenses" 
            />
          </div>
          
          {/* Main Dashboard Content */}
          <MonthlyOverview 
            transactions={transactions || []} 
            isLoading={isLoading} 
          />
          
          <div className="mb-6">
            <TransactionCalendar 
              transactions={transactions || []} 
              isLoading={isLoading} 
            />
          </div>
          
          <div className="mb-6">
            <CashFlowForecast 
              transactions={transactions || []} 
              accounts={accounts || []} 
              isLoading={isLoading} 
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <RecentTransactions 
              transactions={transactions ? transactions.slice(0, 5) : []} 
              isLoading={isLoading} 
            />
            <ExpenseCategories 
              transactions={transactions || []} 
              isLoading={isLoading} 
            />
          </div>
          
          <UpcomingPayments 
            transactions={transactions || []} 
            isLoading={isLoading} 
            onEditTransaction={handleEditTransaction} 
          />
          
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
        </>
      )}
    </MainLayout>
  );
}
