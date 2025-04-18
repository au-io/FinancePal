import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/use-auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, Save } from 'lucide-react';

// Profile update schema
const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }).optional().or(z.literal('')),
  phoneNumber: z.string()
    .regex(/^(\+\d{1,3})?\s?\(?\d{1,4}\)?[\s.-]?\d{1,5}[\s.-]?\d{1,9}$/, {
      message: "Please enter a valid phone number.",
    })
    .optional()
    .or(z.literal('')),
});

// Password change schema
const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, {
    message: "Current password must be at least 6 characters.",
  }),
  newPassword: z.string().min(8, {
    message: "New password must be at least 8 characters.",
  }),
  confirmPassword: z.string().min(8, {
    message: "Confirm password must be at least 8 characters.",
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Profile form
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || '',
    },
  });

  // Password form
  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileFormSchema>) => {
      await apiRequest('PATCH', `/api/user/profile`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: 'Profile updated',
        description: 'Your profile information has been updated successfully.',
      });
      setIsEditingProfile(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update profile',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Password update mutation
  const passwordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordFormSchema>) => {
      await apiRequest('PATCH', `/api/user/password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
      });
      passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to change password',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle profile form submission
  const onProfileSubmit = (values: z.infer<typeof profileFormSchema>) => {
    profileMutation.mutate(values);
  };

  // Handle password form submission
  const onPasswordSubmit = (values: z.infer<typeof passwordFormSchema>) => {
    passwordMutation.mutate(values);
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-heading font-semibold text-primary mb-6">User Profile</h1>
        
        {/* Profile Information Card */}
        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              View and edit your personal information
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {!isEditingProfile ? (
              /* Profile View Mode */
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-medium text-muted-foreground">Username</div>
                  <div className="col-span-2 font-semibold">{user?.username}</div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-medium text-muted-foreground">Name</div>
                  <div className="col-span-2">{user?.name}</div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-medium text-muted-foreground">Email</div>
                  <div className="col-span-2">{user?.email || 'Not set'}</div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-medium text-muted-foreground">Phone Number</div>
                  <div className="col-span-2">{user?.phoneNumber || 'Not set'}</div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-medium text-muted-foreground">Role</div>
                  <div className="col-span-2">{user?.isAdmin ? 'Administrator' : 'Regular User'}</div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-medium text-muted-foreground">Family</div>
                  <div className="col-span-2">{user?.familyId ? `Family ID: ${user.familyId}` : 'No family assigned'}</div>
                </div>
              </div>
            ) : (
              /* Profile Edit Mode */
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormDescription>
                          This is the name displayed to other family members.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="your.email@example.com" type="email" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your email address (optional).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+44 7123 456789" type="tel" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your contact phone number (optional).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditingProfile(false)}
                      type="button"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={profileMutation.isPending}
                    >
                      {profileMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
          
          {!isEditingProfile && (
            <CardFooter className="flex justify-end">
              <Button onClick={() => setIsEditingProfile(true)}>
                Edit Profile
              </Button>
            </CardFooter>
          )}
        </Card>
        
        {/* Password Change Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password for enhanced security
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Password must be at least 8 characters.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button 
                    type="submit"
                    disabled={passwordMutation.isPending}
                  >
                    {passwordMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Change Password
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}