import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Shield, 
  Users, 
  Search,
  UserCog
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function AdminUsers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Fetch users
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
  });

  // Fetch families for reference
  const { data: families, isLoading: isLoadingFamilies } = useQuery({
    queryKey: ['/api/families'],
  });

  // Promote user to admin mutation
  const promoteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest('POST', `/api/users/${userId}/promote`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'User promoted to admin',
        description: 'The user has been successfully promoted to admin.',
      });
      setIsPromoteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({
        title: 'Failed to promote user',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Filter users based on search
  const filteredUsers = React.useMemo(() => {
    if (!users) return [];
    if (!searchQuery) return users;

    const query = searchQuery.toLowerCase();
    return users.filter((user: any) => 
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Get family name by ID
  const getFamilyName = (familyId: number | null) => {
    if (!familyId || !families) return 'None';
    const family = families.find((f: any) => f.id === familyId);
    return family ? family.name : 'Unknown';
  };

  // Handle promoting user to admin
  const handlePromoteUser = (user: any) => {
    setSelectedUser(user);
    setIsPromoteDialogOpen(true);
  };

  // Confirm promotion
  const confirmPromotion = () => {
    if (selectedUser) {
      promoteUserMutation.mutate(selectedUser.id);
    }
  };

  // Users table columns
  const usersTableColumns = [
    {
      header: 'Name',
      accessor: 'name',
    },
    {
      header: 'Username',
      accessor: 'username',
    },
    {
      header: 'Email',
      accessor: 'email',
    },
    {
      header: 'Role',
      accessor: (user: any) => (
        <Badge variant={user.isAdmin ? 'default' : 'outline'}>
          {user.isAdmin ? 'Admin' : 'User'}
        </Badge>
      ),
    },
    {
      header: 'Family',
      accessor: (user: any) => getFamilyName(user.familyId),
    },
    {
      header: 'Actions',
      accessor: (user: any) => (
        <div className="flex justify-end space-x-2">
          {!user.isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handlePromoteUser(user);
              }}
            >
              <Shield className="h-4 w-4 mr-2" />
              Promote to Admin
            </Button>
          )}
        </div>
      ),
      className: 'text-right',
    },
  ];

  const isLoading = isLoadingUsers || isLoadingFamilies;

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-primary">Manage Users</h1>
          <p className="text-gray-600">Manage users and their roles</p>
        </div>
      </div>

      {/* Users Table */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Users
          </CardTitle>
          <CardDescription>
            Manage all users in the system
          </CardDescription>
          
          {/* Search Input */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              className="pl-10"
              placeholder="Search users by name, username, or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users?.length === 0 ? (
            <div className="text-center py-10">
              <UserCog className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">No users found</h3>
              <p className="text-gray-500 mt-1">There are no users in the system yet</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No matching users</h3>
              <p className="text-gray-500 mt-1">No users match your search criteria</p>
            </div>
          ) : (
            <DataTable 
              data={filteredUsers}
              columns={usersTableColumns}
              pagination
              pageSize={10}
            />
          )}
        </CardContent>
      </Card>

      {/* Promote User Dialog */}
      <AlertDialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote User to Admin</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser && (
                <>
                  Are you sure you want to promote <strong>{selectedUser.name}</strong> to admin?
                  Admin users have full access to manage families and other users.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmPromotion}
              disabled={promoteUserMutation.isPending}
            >
              {promoteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Promoting...
                </>
              ) : (
                'Promote'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
