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
  UserCog,
  UserPlus,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { registerSchema } from "@shared/schema";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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

// Form schema for adding new users
const addUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  isAdmin: z.boolean().default(false),
  familyId: z.number().nullable().default(null),
  generatePassword: z.boolean().default(true),
  // No confirmPassword required for admin-created users
});

type AddUserFormData = z.infer<typeof addUserSchema>;

export default function AdminUsers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  
  // Add user form
  const addUserForm = useForm<AddUserFormData>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      username: '',
      name: '',
      email: '',
      password: '',
      isAdmin: false,
      familyId: null,
      generatePassword: true,
    },
  });

  // Fetch users
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
  });

  // Fetch families for reference
  const { data: families, isLoading: isLoadingFamilies } = useQuery({
    queryKey: ['/api/families'],
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (userData: AddUserFormData) => {
      console.log('Submitting user data:', userData);
      try {
        const res = await apiRequest('POST', '/api/admin/users', userData);
        console.log('Admin user creation response:', res);
        const data = await res.json();
        console.log('Admin user creation data:', data);
        return data;
      } catch (error) {
        console.error('Admin user creation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('User created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'User created successfully',
        description: generatedPassword 
          ? `User created with password: ${generatedPassword}` 
          : 'User created successfully.',
      });
      setAddUserDialogOpen(false);
      setGeneratedPassword('');
      addUserForm.reset();
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({
        title: 'Failed to create user',
        description: error.message,
        variant: 'destructive',
      });
    },
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
        <Button 
          onClick={() => setAddUserDialogOpen(true)}
          className="mt-4 md:mt-0"
        >
          <Users className="h-4 w-4 mr-2" />
          Add New User
        </Button>
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

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New User
            </DialogTitle>
            <DialogDescription>
              Create a new user account and optionally assign them to a family
            </DialogDescription>
          </DialogHeader>
          
          <Form {...addUserForm}>
            <form onSubmit={addUserForm.handleSubmit((data) => {
              // Generate a random password if needed
              if (data.generatePassword) {
                const randomPassword = Math.random().toString(36).substring(2, 10);
                setGeneratedPassword(randomPassword);
                data.password = randomPassword;
              }
              
              addUserMutation.mutate(data);
            })} className="space-y-4">
              
              <FormField
                control={addUserForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addUserForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter full name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="Enter email address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addUserForm.control}
                  name="generatePassword"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Generate random password</FormLabel>
                        <FormDescription>
                          Auto-generate a secure password
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addUserForm.control}
                  name="isAdmin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Administrator</FormLabel>
                        <FormDescription>
                          Grant admin privileges
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              {!addUserForm.watch('generatePassword') && (
                <FormField
                  control={addUserForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="password" 
                          placeholder="Enter password" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {families && families.length > 0 && (
                <FormField
                  control={addUserForm.control}
                  name="familyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Family</FormLabel>
                      <Select
                        value={field.value?.toString() || "none"}
                        onValueChange={(value) => field.onChange(value && value !== "none" ? parseInt(value) : null)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a family (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No family</SelectItem>
                          {families.map((family: any) => (
                            <SelectItem key={family.id} value={family.id.toString()}>
                              {family.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Assign this user to a family (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={addUserMutation.isPending}
                >
                  {addUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
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
