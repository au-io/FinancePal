import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Account, Transaction } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DataTable } from '@/components/ui/data-table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Loader2, Users, AlertTriangle } from 'lucide-react';

export default function Family() {
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  
  // Fetch family members
  const { data: familyMembers, isLoading: isLoadingMembers, error: membersError } = useQuery({
    queryKey: ['/api/family/members'],
  });

  // Fetch family transactions
  const { data: familyTransactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['/api/family/transactions'],
  });

  // Set first member as selected by default
  useEffect(() => {
    if (familyMembers && familyMembers.length > 0 && !selectedMemberId) {
      setSelectedMemberId(familyMembers[0].id);
    }
  }, [familyMembers, selectedMemberId]);

  // Filter transactions by member
  const memberTransactions = React.useMemo(() => {
    if (!familyTransactions || !selectedMemberId) return [];
    return familyTransactions.filter((tx: Transaction) => tx.userId === selectedMemberId);
  }, [familyTransactions, selectedMemberId]);

  // Calculate category distribution
  const categoryData = React.useMemo(() => {
    if (!memberTransactions.length) return [];
    
    const categories: Record<string, number> = {};
    
    memberTransactions
      .filter((tx: Transaction) => tx.type === 'Expense')
      .forEach((tx: Transaction) => {
        if (!categories[tx.category]) {
          categories[tx.category] = 0;
        }
        categories[tx.category] += tx.amount;
      });
      
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [memberTransactions]);

  // Calculate monthly spending
  const monthlyData = React.useMemo(() => {
    if (!memberTransactions.length) return [];
    
    const months: Record<string, { income: number; expenses: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    memberTransactions.forEach((tx: Transaction) => {
      const date = new Date(tx.date);
      const monthKey = monthNames[date.getMonth()];
      
      if (!months[monthKey]) {
        months[monthKey] = { income: 0, expenses: 0 };
      }
      
      if (tx.type === 'Income') {
        months[monthKey].income += tx.amount;
      } else if (tx.type === 'Expense') {
        months[monthKey].expenses += tx.amount;
      }
    });
    
    return Object.entries(months).map(([name, data]) => ({
      name,
      Income: data.income,
      Expenses: data.expenses
    }));
  }, [memberTransactions]);

  // Transaction table columns
  const transactionColumns = [
    {
      header: 'Date',
      accessor: (tx: Transaction) => new Date(tx.date).toLocaleDateString(),
    },
    {
      header: 'Description',
      accessor: (tx: Transaction) => tx.description || tx.category,
    },
    {
      header: 'Category',
      accessor: 'category',
    },
    {
      header: 'Type',
      accessor: 'type',
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
    }
  ];

  const COLORS = ['#7F5539', '#9C6644', '#F8A100', '#FFB733', '#0F766E', '#14B8A6', '#EF4444', '#10B981'];

  const isLoading = isLoadingMembers || isLoadingTransactions;
  const hasNoFamily = membersError && membersError.message.includes('not part of a family');

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-primary">Family View</h1>
          <p className="text-gray-600">See your family's financial overview</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : hasNoFamily ? (
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-warning mb-4" />
              <h2 className="text-xl font-semibold mb-2">You're not part of a family</h2>
              <p className="text-gray-500 max-w-md">
                Please contact your administrator to be added to a family. 
                Once you're part of a family, you'll be able to see your family members' finances.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : familyMembers?.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-xl font-semibold mb-2">No family members found</h2>
              <p className="text-gray-500">
                There are no other members in your family yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Family Member Tabs */}
          <Tabs 
            defaultValue={selectedMemberId?.toString() || ""}
            value={selectedMemberId?.toString() || ""}
            onValueChange={(value) => setSelectedMemberId(parseInt(value))}
            className="space-y-6"
          >
            <TabsList className="bg-white p-1 mb-4">
              {familyMembers.map((member: User) => (
                <TabsTrigger key={member.id} value={member.id.toString()}>
                  {member.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {familyMembers.map((member: User) => (
              <TabsContent key={member.id} value={member.id.toString()}>
                {/* Member Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* Total Accounts */}
                  <Card className="bg-white">
                    <CardContent className="pt-6">
                      <h3 className="text-gray-500 text-sm">Total Accounts</h3>
                      <p className="text-2xl font-semibold mt-1">
                        {familyTransactions?.filter((t: Transaction) => 
                          t.userId === member.id && t.type === 'Transfer' && t.destinationAccountId).length || 0}
                      </p>
                    </CardContent>
                  </Card>
                  
                  {/* Income */}
                  <Card className="bg-white">
                    <CardContent className="pt-6">
                      <h3 className="text-gray-500 text-sm">Total Income</h3>
                      <p className="text-2xl font-semibold mt-1 text-green-500">
                        {formatCurrency(
                          familyTransactions
                            ?.filter((t: Transaction) => t.userId === member.id && t.type === 'Income')
                            .reduce((sum: number, t: Transaction) => sum + t.amount, 0) || 0
                        )}
                      </p>
                    </CardContent>
                  </Card>
                  
                  {/* Expenses */}
                  <Card className="bg-white">
                    <CardContent className="pt-6">
                      <h3 className="text-gray-500 text-sm">Total Expenses</h3>
                      <p className="text-2xl font-semibold mt-1 text-red-500">
                        {formatCurrency(
                          familyTransactions
                            ?.filter((t: Transaction) => t.userId === member.id && t.type === 'Expense')
                            .reduce((sum: number, t: Transaction) => sum + t.amount, 0) || 0
                        )}
                      </p>
                    </CardContent>
                  </Card>
                  
                  {/* Transactions */}
                  <Card className="bg-white">
                    <CardContent className="pt-6">
                      <h3 className="text-gray-500 text-sm">Total Transactions</h3>
                      <p className="text-2xl font-semibold mt-1">
                        {familyTransactions?.filter((t: Transaction) => t.userId === member.id).length || 0}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Monthly Overview */}
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle>Monthly Overview</CardTitle>
                      <CardDescription>Income vs Expense by month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        {monthlyData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={monthlyData}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip formatter={(value) => formatCurrency(value as number)} />
                              <Legend />
                              <Bar dataKey="Income" fill="#10B981" name="Income" />
                              <Bar dataKey="Expenses" fill="#EF4444" name="Expenses" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-gray-500">No data available</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Expense Categories */}
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle>Expense Categories</CardTitle>
                      <CardDescription>Distribution of expenses by category</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        {categoryData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              >
                                {categoryData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => formatCurrency(value as number)} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-gray-500">No expense data available</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Transactions */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>
                      Latest transactions for {member.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {memberTransactions.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-gray-500">No transactions found</p>
                      </div>
                    ) : (
                      <DataTable 
                        data={memberTransactions.slice(0, 10)}
                        columns={transactionColumns}
                        pagination
                        pageSize={10}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </MainLayout>
  );
}
