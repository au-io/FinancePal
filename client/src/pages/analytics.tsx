import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { ViewToggle } from '@/components/layout/ViewToggle';
import { AccountBalanceTrend } from '@/components/analytics/AccountBalanceTrend';
import { SpendingAnalytics } from '@/components/analytics/SpendingAnalytics';
import { SubscriptionAnalytics } from '@/components/analytics/SubscriptionAnalytics';
import { TransactionCalendar } from '@/components/dashboard/TransactionCalendar';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Analytics() {
  const [isPersonalView, setIsPersonalView] = useState(true);
  const [timeframe, setTimeframe] = useState('year');

  // Fetch transactions
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: isPersonalView ? ['/api/transactions'] : ['/api/family/transactions'],
  });

  // Fetch accounts
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['/api/accounts'],
  });

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    try {
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        return {
          totalIncome: 0,
          totalExpenses: 0,
          savings: 0,
          savingsRate: 0,
        };
      }

      // Filter transactions based on timeframe
      const now = new Date();
      const filteredTransactions = transactions.filter((tx: any) => {
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
          console.error("Error filtering transaction by date:", tx.date, err);
          return false;
        }
      });

      // Calculate income and expenses
      const totalIncome = filteredTransactions
        .filter((tx: any) => tx && tx.type === 'Income')
        .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

      const totalExpenses = filteredTransactions
        .filter((tx: any) => tx && tx.type === 'Expense')
        .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

      const savings = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

      return {
        totalIncome,
        totalExpenses,
        savings,
        savingsRate,
      };
    } catch (err) {
      console.error("Error calculating summary statistics:", err);
      return {
        totalIncome: 0,
        totalExpenses: 0,
        savings: 0,
        savingsRate: 0,
      };
    }
  }, [transactions, timeframe]);

  const isLoading = isLoadingTransactions || isLoadingAccounts;

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-primary">Analytics</h1>
          <p className="text-gray-600">Gain insights into your financial health</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
          <Select
            value={timeframe}
            onValueChange={setTimeframe}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <ViewToggle 
            isPersonalView={isPersonalView} 
            onToggle={() => setIsPersonalView(!isPersonalView)} 
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white">
              <CardContent className="pt-6">
                <h3 className="text-gray-500 text-sm">Total Income</h3>
                <p className="text-2xl font-semibold mt-1 text-green-500">
                  {formatCurrency(summaryStats.totalIncome)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {timeframe === 'month' ? 'This month' : 
                   timeframe === 'quarter' ? 'This quarter' : 
                   timeframe === 'year' ? 'This year' : 'All time'}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardContent className="pt-6">
                <h3 className="text-gray-500 text-sm">Total Expenses</h3>
                <p className="text-2xl font-semibold mt-1 text-red-500">
                  {formatCurrency(summaryStats.totalExpenses)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {timeframe === 'month' ? 'This month' : 
                   timeframe === 'quarter' ? 'This quarter' : 
                   timeframe === 'year' ? 'This year' : 'All time'}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardContent className="pt-6">
                <h3 className="text-gray-500 text-sm">Savings</h3>
                <p className={`text-2xl font-semibold mt-1 ${summaryStats.savings >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(summaryStats.savings)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Income minus expenses
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardContent className="pt-6">
                <h3 className="text-gray-500 text-sm">Savings Rate</h3>
                <p className={`text-2xl font-semibold mt-1 ${summaryStats.savingsRate >= 20 ? 'text-green-500' : summaryStats.savingsRate >= 0 ? 'text-warning' : 'text-red-500'}`}>
                  {summaryStats.savingsRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Percentage of income saved
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Analytics Components */}
          <div className="space-y-6">
            <AccountBalanceTrend 
              transactions={Array.isArray(transactions) ? transactions : []} 
              accounts={Array.isArray(accounts) ? accounts : []} 
              isPersonalView={isPersonalView}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TransactionCalendar 
                transactions={Array.isArray(transactions) ? transactions : []} 
                isLoading={isLoading} 
              />
              <SubscriptionAnalytics 
                transactions={Array.isArray(transactions) ? transactions : []} 
              />
            </div>
            
            <SpendingAnalytics 
              transactions={Array.isArray(transactions) ? transactions : []} 
              timeframe={timeframe} 
            />
          </div>
        </>
      )}
    </MainLayout>
  );
}
