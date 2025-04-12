import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AccountModal } from '@/components/modals/AccountModal';
import { Account } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function Accounts() {
  const { toast } = useToast();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<number | null>(null);

  // Fetch accounts
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['/api/accounts'],
  });

  // Account mutations
  const createAccountMutation = useMutation({
    mutationFn: async (data: Partial<Account>) => {
      if (editingAccount) {
        await apiRequest('PATCH', `/api/accounts/${editingAccount.id}`, data);
      } else {
        await apiRequest('POST', '/api/accounts', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: `Account ${editingAccount ? 'updated' : 'created'} successfully`,
        description: `Your account has been ${editingAccount ? 'updated' : 'created'}.`,
      });
      setIsAccountModalOpen(false);
      setEditingAccount(null);
    },
    onError: (error) => {
      toast({
        title: `Failed to ${editingAccount ? 'update' : 'create'} account`,
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: 'Account deleted',
        description: 'The account has been deleted successfully.',
      });
      setDeletingAccountId(null);
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete account',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setIsAccountModalOpen(true);
  };

  const handleDeleteAccount = (id: number) => {
    setDeletingAccountId(id);
  };

  const accountsTableColumns = [
    {
      header: 'Name',
      accessor: (account: Account) => (
        <div className="flex items-center">
          <div className="w-8 h-8 mr-2 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
            <span className="material-icons text-primary text-sm">{account.icon}</span>
          </div>
          <span>{account.name}</span>
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: 'category',
    },
    {
      header: 'Balance',
      accessor: (account: Account) => (
        <span className={account.balance >= 0 ? 'text-green-500' : 'text-red-500'}>
          {formatCurrency(account.balance)}
        </span>
      ),
      className: 'text-right',
    },
    {
      header: 'Actions',
      accessor: (account: Account) => (
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEditAccount(account);
            }}
          >
            <Pencil className="h-4 w-4" />
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
                <AlertDialogTitle>Delete Account</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this account? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-500 hover:bg-red-600"
                  onClick={() => deleteAccountMutation.mutate(account.id)}
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

  const totalBalance = accounts?.reduce((sum: number, account: Account) => sum + account.balance, 0) || 0;

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-primary">Accounts</h1>
          <p className="text-gray-600">Manage your financial accounts</p>
        </div>
        
        <Button 
          onClick={() => {
            setEditingAccount(null);
            setIsAccountModalOpen(true);
          }}
          className="mt-4 md:mt-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Account
        </Button>
      </div>

      {/* Total Balance Card */}
      <Card className="mb-6 bg-white">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-xl text-gray-600">Total Balance</p>
            <h2 className={`text-4xl font-bold mt-2 ${totalBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(totalBalance)}
            </h2>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Your Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : accounts?.length === 0 ? (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No accounts yet</h3>
              <p className="text-gray-500 mt-1">Create your first account to get started</p>
              <Button 
                onClick={() => {
                  setEditingAccount(null);
                  setIsAccountModalOpen(true);
                }}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </div>
          ) : (
            <DataTable 
              data={accounts || []}
              columns={accountsTableColumns}
              onRowClick={handleEditAccount}
            />
          )}
        </CardContent>
      </Card>

      {/* Account Modal */}
      {isAccountModalOpen && (
        <AccountModal 
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          onSubmit={(data) => createAccountMutation.mutate(data)}
          editingAccount={editingAccount}
          isSubmitting={createAccountMutation.isPending}
        />
      )}
    </MainLayout>
  );
}
