import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Family } from '@shared/schema';
import { formatDate } from '@/lib/utils';
import { Loader2, Plus, Users, UserPlus, UserMinus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Form schema for creating a family
const createFamilySchema = z.object({
  name: z.string().min(2, 'Family name must be at least 2 characters'),
});

export default function AdminFamilies() {
  const { toast } = useToast();
  const [isCreateFamilyOpen, setIsCreateFamilyOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Fetch families
  const { data: families, isLoading: isLoadingFamilies } = useQuery({
    queryKey: ['/api/families'],
  });

  // Fetch users for user management
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
  });

  // Create family form
  const form = useForm<z.infer<typeof createFamilySchema>>({
    resolver: zodResolver(createFamilySchema),
    defaultValues: {
      name: '',
    },
  });

  // Create family mutation
  const createFamilyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createFamilySchema>) => {
      await apiRequest('POST', '/api/families', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families'] });
      toast({
        title: 'Family created successfully',
        description: 'The new family has been created.',
      });
      setIsCreateFamilyOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Failed to create family',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add user to family mutation
  const addUserToFamilyMutation = useMutation({
    mutationFn: async ({ userId, familyId }: { userId: number; familyId: number }) => {
      await apiRequest('POST', `/api/users/${userId}/family/${familyId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'User added to family',
        description: 'The user has been successfully added to the family.',
      });
      setSelectedUserId(null);
    },
    onError: (error) => {
      toast({
        title: 'Failed to add user to family',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove user from family mutation
  const removeUserFromFamilyMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest('DELETE', `/api/users/${userId}/family`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'User removed from family',
        description: 'The user has been successfully removed from the family.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove user from family',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle family creation
  const onSubmitCreateFamily = (values: z.infer<typeof createFamilySchema>) => {
    createFamilyMutation.mutate(values);
  };

  // Handle family selection for user management
  const handleManageUsers = (family: Family) => {
    setSelectedFamily(family);
    setIsUserManagementOpen(true);
  };

  // Handle adding user to family
  const handleAddUserToFamily = () => {
    if (selectedUserId && selectedFamily) {
      addUserToFamilyMutation.mutate({
        userId: parseInt(selectedUserId),
        familyId: selectedFamily.id,
      });
    }
  };

  // Get users for the selected family
  const familyUsers = React.useMemo(() => {
    if (!users || !selectedFamily) return [];
    return users.filter((user: any) => user.familyId === selectedFamily.id);
  }, [users, selectedFamily]);

  // Get users not in any family
  const availableUsers = React.useMemo(() => {
    if (!users) return [];
    return users.filter((user: any) => !user.familyId);
  }, [users]);

  // Families table columns
  const familiesTableColumns = [
    {
      header: 'Family Name',
      accessor: 'name',
    },
    {
      header: 'Created Date',
      accessor: (family: Family) => formatDate(family.createdAt),
    },
    {
      header: 'Members',
      accessor: (family: Family) => {
        const memberCount = users?.filter((user: any) => user.familyId === family.id).length || 0;
        return `${memberCount} member${memberCount !== 1 ? 's' : ''}`;
      },
    },
    {
      header: 'Actions',
      accessor: (family: Family) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleManageUsers(family);
          }}
        >
          <Users className="h-4 w-4 mr-2" />
          Manage Users
        </Button>
      ),
      className: 'text-right',
    },
  ];

  // Family members table columns
  const familyMembersColumns = [
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
      header: 'Actions',
      accessor: (user: any) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => removeUserFromFamilyMutation.mutate(user.id)}
        >
          <UserMinus className="h-4 w-4 mr-2" />
          Remove
        </Button>
      ),
    },
  ];

  const isLoading = isLoadingFamilies || isLoadingUsers;

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-primary">Manage Families</h1>
          <p className="text-gray-600">Create and manage family groups</p>
        </div>
        
        <Button 
          onClick={() => setIsCreateFamilyOpen(true)}
          className="mt-4 md:mt-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Family
        </Button>
      </div>

      {/* Families Table */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Families</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : families?.length === 0 ? (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No families yet</h3>
              <p className="text-gray-500 mt-1">Create your first family to get started</p>
              <Button 
                onClick={() => setIsCreateFamilyOpen(true)}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Family
              </Button>
            </div>
          ) : (
            <DataTable 
              data={families || []}
              columns={familiesTableColumns}
              onRowClick={handleManageUsers}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Family Dialog */}
      <Dialog open={isCreateFamilyOpen} onOpenChange={setIsCreateFamilyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Family</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitCreateFamily)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Family Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter family name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateFamilyOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createFamilyMutation.isPending}
                >
                  {createFamilyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Family'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* User Management Sheet */}
      <Sheet open={isUserManagementOpen} onOpenChange={setIsUserManagementOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Manage Family Members</SheetTitle>
            <SheetDescription>
              {selectedFamily ? `Family: ${selectedFamily.name}` : 'Select a family to manage members'}
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-6">
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Add User to Family</h3>
              <div className="flex space-x-2">
                <Select value={selectedUserId || ''} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleAddUserToFamily}
                  disabled={!selectedUserId || addUserToFamilyMutation.isPending}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Current Members</h3>
              {familyUsers.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No members in this family</p>
              ) : (
                <DataTable 
                  data={familyUsers}
                  columns={familyMembersColumns}
                />
              )}
            </div>
          </div>
          
          <SheetFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsUserManagementOpen(false)}
            >
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
