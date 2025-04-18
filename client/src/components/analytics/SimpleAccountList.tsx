import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Account, Transaction } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';

interface SimpleAccountListProps {
  accounts: Account[];
  transactions: Transaction[];
  isPersonalView: boolean;
}

export function SimpleAccountList({ accounts, transactions, isPersonalView }: SimpleAccountListProps) {
  // Calculate basic stats
  const totalBalance = accounts.reduce((sum, account) => sum + (account?.balance || 0), 0);
  
  // Current month stats
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const thisMonthTransactions = transactions.filter(tx => {
    if (!tx.date) return false;
    const txDate = new Date(tx.date);
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  });
  
  const income = thisMonthTransactions
    .filter(tx => tx.type === 'Income')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
  const expenses = thisMonthTransactions
    .filter(tx => tx.type === 'Expense')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  
  // Top accounts
  const sortedAccounts = [...accounts]
    .sort((a, b) => (b.balance || 0) - (a.balance || 0))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Balances</CardTitle>
        <CardDescription>
          Current balance summary for {isPersonalView ? 'your' : 'all family'} accounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Balance</h3>
          <p className="text-3xl font-semibold text-primary">{formatCurrency(totalBalance)}</p>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-green-50 p-3 rounded-md">
              <p className="text-xs text-gray-500">Current Month Income</p>
              <p className="text-lg font-medium text-green-600">{formatCurrency(income)}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-md">
              <p className="text-xs text-gray-500">Current Month Expenses</p>
              <p className="text-lg font-medium text-red-600">{formatCurrency(expenses)}</p>
            </div>
          </div>
        </div>
        
        <h3 className="text-sm font-medium text-gray-500 mb-2">Top Accounts</h3>
        {/* CSS is in global.css */}
        <div className="space-y-2 account-list-container">
          {sortedAccounts.map((account, index) => (
            <div key={`account-clean-row-${index}`} className="border rounded-md p-3 flex justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-sm">{account.icon || '💰'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-base">{account.name}</span>
                  <span className="text-xs text-gray-500">{account.category}</span>
                </div>
              </div>
              <div className="font-medium">
                {formatCurrency(account.balance || 0)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}