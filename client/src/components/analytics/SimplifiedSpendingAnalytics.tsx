import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Transaction } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';

interface SpendingAnalyticsProps {
  transactions: Transaction[];
  timeframe: string;
}

export function SimplifiedSpendingAnalytics({ transactions, timeframe }: SpendingAnalyticsProps) {
  // Filter transactions based on timeframe
  const filteredTransactions = React.useMemo(() => {
    try {
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        return [];
      }

      // Filter expenses only
      const expenses = transactions.filter(tx => tx && tx.type === 'Expense');
      
      // Filter by timeframe
      const now = new Date();
      return expenses.filter(tx => {
        if (!tx || !tx.date) return false;
        
        try {
          const txDate = new Date(tx.date);
          
          if (timeframe === 'month') {
            return txDate.getMonth() === now.getMonth() && 
                  txDate.getFullYear() === now.getFullYear();
          }
          if (timeframe === 'quarter') {
            const txQuarter = Math.floor(txDate.getMonth() / 3);
            const currentQuarter = Math.floor(now.getMonth() / 3);
            return txQuarter === currentQuarter && 
                  txDate.getFullYear() === now.getFullYear();
          }
          if (timeframe === 'year') {
            return txDate.getFullYear() === now.getFullYear();
          }
          return true; // All time
        } catch (err) {
          console.error("Error filtering transaction date:", tx.date, err);
          return false;
        }
      });
    } catch (err) {
      console.error("Error filtering transactions:", err);
      return [];
    }
  }, [transactions, timeframe]);

  // Group by category
  const categoryTotals = React.useMemo(() => {
    try {
      if (!filteredTransactions || !filteredTransactions.length) return [];
      
      const totals: Record<string, number> = {};
      
      // Sum expenses by category
      filteredTransactions.forEach(tx => {
        if (!tx || !tx.category) return;
        
        const category = tx.category;
        totals[category] = (totals[category] || 0) + (tx.amount || 0);
      });
      
      // Convert to array and sort
      return Object.entries(totals)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
    } catch (err) {
      console.error("Error calculating category totals:", err);
      return [];
    }
  }, [filteredTransactions]);

  // Calculate total spending
  const totalSpending = React.useMemo(() => {
    try {
      return categoryTotals.reduce((sum, item) => sum + item.amount, 0);
    } catch (err) {
      console.error("Error calculating total spending:", err);
      return 0;
    }
  }, [categoryTotals]);

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Spending Analysis</CardTitle>
        <CardDescription>
          {timeframe === 'month' ? 'This month\'s spending by category' : 
           timeframe === 'quarter' ? 'This quarter\'s spending by category' : 
           timeframe === 'year' ? 'This year\'s spending by category' : 
           'All time spending by category'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!filteredTransactions.length ? (
          <div className="flex items-center justify-center h-[250px]">
            <p className="text-gray-500">No spending data available for the selected timeframe</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-500">Total Spending</h3>
              <p className="text-2xl font-semibold text-red-500 mt-1">
                {formatCurrency(totalSpending)}
              </p>
            </div>
            
            <h3 className="text-sm font-medium text-gray-600">Top Categories</h3>
            <div className="space-y-2">
              {categoryTotals.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                  <p className="font-medium">{item.category}</p>
                  <div className="text-right">
                    <p className="font-medium text-red-500">{formatCurrency(item.amount)}</p>
                    <p className="text-xs text-gray-500">
                      {totalSpending > 0 ? Math.round((item.amount / totalSpending) * 100) : 0}% of total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}