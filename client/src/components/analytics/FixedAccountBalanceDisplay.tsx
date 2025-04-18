import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Transaction, Account } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { getTransactionTypeColor } from '@/lib/utils';

interface AccountBalanceTrendProps {
  transactions: Transaction[];
  accounts: Account[];
  isPersonalView: boolean;
}

export function FixedAccountBalanceDisplay({ transactions, accounts, isPersonalView }: AccountBalanceTrendProps) {
  // Calculate total balance
  const totalBalance = React.useMemo(() => {
    try {
      if (!accounts || !Array.isArray(accounts)) return 0;
      return accounts.reduce((sum, account) => sum + (account?.balance || 0), 0);
    } catch (error) {
      console.error("Error calculating total balance:", error);
      return 0;
    }
  }, [accounts]);

  // Calculate total income and expenses for the current month
  const currentMonthStats = React.useMemo(() => {
    try {
      if (!transactions || !Array.isArray(transactions)) {
        return { income: 0, expenses: 0 };
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Filter transactions for the current month
      const thisMonthTransactions = transactions.filter(tx => {
        if (!tx || !tx.date) return false;
        try {
          const txDate = new Date(tx.date);
          return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
        } catch (err) {
          return false;
        }
      });

      // Calculate income
      const income = thisMonthTransactions
        .filter(tx => tx && tx.type === 'Income')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      // Calculate expenses
      const expenses = thisMonthTransactions
        .filter(tx => tx && tx.type === 'Expense')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      return { income, expenses };
    } catch (error) {
      console.error("Error calculating month stats:", error);
      return { income: 0, expenses: 0 };
    }
  }, [transactions]);

  // Get top 5 accounts by balance
  const topAccounts = React.useMemo(() => {
    try {
      if (!accounts || !Array.isArray(accounts)) return [];
      
      return [...accounts]
        .filter(account => account && account.name && account.balance !== undefined)
        .sort((a, b) => (b.balance || 0) - (a.balance || 0))
        .slice(0, 5);
    } catch (error) {
      console.error("Error sorting accounts:", error);
      return [];
    }
  }, [accounts]);

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Account Balances</CardTitle>
        <CardDescription>
          {isPersonalView 
            ? 'Current balance summary for your accounts' 
            : 'Current balance summary for all family accounts'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Balance</h3>
          <p className="text-3xl font-semibold text-primary">{formatCurrency(totalBalance)}</p>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-green-50 p-3 rounded-md">
              <p className="text-xs text-gray-500">Current Month Income</p>
              <p className="text-lg font-medium text-green-600">{formatCurrency(currentMonthStats.income)}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-md">
              <p className="text-xs text-gray-500">Current Month Expenses</p>
              <p className="text-lg font-medium text-red-600">{formatCurrency(currentMonthStats.expenses)}</p>
            </div>
          </div>
        </div>
        
        {topAccounts.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Top Accounts</h3>
            <div className="space-y-2">
              {topAccounts.map(account => (
                <div 
                  key={account.id} 
                  className="flex justify-between items-center p-3 border rounded-md relative overflow-hidden"
                  style={{ position: 'relative' }}
                >
                  {/* This hidden div covers any ID-based text that might appear */}
                  <div className="absolute inset-0 bg-white" style={{ zIndex: 1 }}></div>
                  
                  <div className="flex items-center relative" style={{ zIndex: 2 }}>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-sm">{account.icon || '💰'}</span>
                    </div>
                    <div className="min-w-0 mr-2">
                      <p className="font-medium text-base truncate">{account.name}</p>
                      <p className="text-xs text-gray-500 truncate">{account.category}</p>
                    </div>
                  </div>
                  
                  <p className="font-medium text-right whitespace-nowrap relative" style={{ zIndex: 2 }}>
                    {formatCurrency(account.balance || 0)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}