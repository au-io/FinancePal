import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Account, Transaction } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';

interface CanvasAccountListProps {
  accounts: Account[];
  transactions: Transaction[];
  isPersonalView: boolean;
}

export function CanvasAccountList({ accounts, transactions, isPersonalView }: CanvasAccountListProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
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

  // Draw the accounts on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sortedAccounts.length) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = canvas.clientWidth;
    canvas.height = sortedAccounts.length * 70 + 20; // Each row is 70px high
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set text styles
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#000';
    
    // Draw each account row
    sortedAccounts.forEach((account, index) => {
      const y = index * 70 + 35;
      
      // Draw account name
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(account.name, 60, y - 10);
      
      // Draw account category
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText(account.category, 60, y + 10);
      
      // Draw account balance
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#000';
      const balance = formatCurrency(account.balance || 0);
      const balanceWidth = ctx.measureText(balance).width;
      ctx.fillText(balance, canvas.width - balanceWidth - 20, y);
      
      // Draw a circle for the icon
      ctx.beginPath();
      ctx.arc(30, y, 20, 0, 2 * Math.PI);
      ctx.fillStyle = '#f1f5f9';
      ctx.fill();
      
      // Draw a simple icon ($ symbol)
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#333';
      ctx.fillText('💰', 24, y + 5);
      
      // Draw line at the bottom
      if (index < sortedAccounts.length - 1) {
        ctx.beginPath();
        ctx.moveTo(20, y + 35);
        ctx.lineTo(canvas.width - 20, y + 35);
        ctx.strokeStyle = '#e5e7eb';
        ctx.stroke();
      }
    });
    
  }, [sortedAccounts]);

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
        <div className="canvas-container border rounded-md overflow-hidden">
          <canvas 
            ref={canvasRef} 
            className="w-full" 
            style={{ minHeight: `${sortedAccounts.length * 70 + 20}px` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}