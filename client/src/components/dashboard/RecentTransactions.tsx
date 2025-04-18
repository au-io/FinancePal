import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@shared/schema';
import { Link } from 'wouter';
import { ArrowDown, ArrowUp, ArrowLeftRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecentTransactionsProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <Card className="bg-white rounded-xl shadow-sm">
        <CardHeader className="flex justify-between items-center pb-2">
          <CardTitle className="text-lg font-heading">Recent Transactions</CardTitle>
          <Link href="/transactions">
            <a className="text-primary text-sm">View All</a>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center justify-between p-3 animate-pulse">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-200 mr-3" />
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-16" />
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-sm">
      <CardHeader className="flex justify-between items-center pb-2">
        <CardTitle className="text-lg font-heading">Recent Transactions</CardTitle>
        <Link href="/transactions">
          <a className="text-primary text-sm">View All</a>
        </Link>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No recent transactions found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="p-3 rounded-lg flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                    transaction.type === 'Income' 
                      ? 'bg-green-100' 
                      : transaction.type === 'Expense' 
                        ? 'bg-red-100' 
                        : 'bg-blue-100'
                  }`}>
                    {transaction.type === 'Income' && (
                      <ArrowDown className="h-5 w-5 text-green-500" />
                    )}
                    {transaction.type === 'Expense' && (
                      <ArrowUp className="h-5 w-5 text-red-500" />
                    )}
                    {transaction.type === 'Transfer' && (
                      <ArrowLeftRight className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.description || transaction.category}</p>
                    <div className="flex items-center text-xs space-x-2">
                      <p className="text-gray-500">
                        {formatDistanceToNow(new Date(transaction.date), { addSuffix: true })}
                      </p>
                      {(transaction as any).userName && (
                        <>
                          <span className="text-gray-300">•</span>
                          <p className="text-gray-500">By {(transaction as any).userName}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`font-medium ${
                  transaction.type === 'Income' 
                    ? 'text-green-500' 
                    : transaction.type === 'Expense' 
                      ? 'text-red-500' 
                      : 'text-gray-700'
                }`}>
                  {transaction.type === 'Income' ? '+' : transaction.type === 'Expense' ? '-' : ''}
                  ${transaction.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
