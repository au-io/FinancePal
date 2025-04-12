import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { 
  Loader2, 
  Plus,
  Home, 
  Users,
  Search,
  Trash2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FamilyModal } from '@/components/modals/FamilyModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AdminFamilies() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFamilyOpen, setIsAddFamilyOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<any>(null);

  // Fetch families
  const { data: families, isLoading: isLoadingFamilies } = useQuery({
    queryKey: ['/api/families'],
  });

  // Fetch users for reference
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
  });

  // Filter families based on search
  const filteredFamilies = React.useMemo(() => {
    if (!families) return [];
    if (!searchQuery) return families;

    const query = searchQuery.toLowerCase();
    return families.filter((family: any) => 
      family.name.toLowerCase().includes(query)
    );
  }, [families, searchQuery]);

  // Get family member count
  const getFamilyMemberCount = (familyId: number) => {
    if (!users) return 0;
    return users.filter((user: any) => user.familyId === familyId).length;
  };

  // Families table columns
  const familiesTableColumns = [
    {
      header: 'Name',
      accessor: 'name',
    },
    {
      header: 'Currency',
      accessor: 'currency',
    },
    {
      header: 'Members',
      accessor: (family: any) => (
        <Badge variant="outline">
          {getFamilyMemberCount(family.id)} users
        </Badge>
      ),
    },
    {
      header: 'Created',
      accessor: (family: any) => formatDate(family.createdAt),
    },
    {
      header: 'Actions',
      accessor: (family: any) => (
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedFamily(family);
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      ),
      className: 'text-right',
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
          onClick={() => setIsAddFamilyOpen(true)}
          className="mt-4 md:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Family
        </Button>
      </div>

      {/* Families Table */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Home className="h-5 w-5 mr-2" />
            Families
          </CardTitle>
          <CardDescription>
            Manage all family groups in the system
          </CardDescription>
          
          {/* Search Input */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              className="pl-10"
              placeholder="Search families by name"
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
          ) : families?.length === 0 ? (
            <div className="text-center py-10">
              <Home className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">No families found</h3>
              <p className="text-gray-500 mt-1">There are no families in the system yet</p>
            </div>
          ) : filteredFamilies.length === 0 ? (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No matching families</h3>
              <p className="text-gray-500 mt-1">No families match your search criteria</p>
            </div>
          ) : (
            <DataTable 
              data={filteredFamilies}
              columns={familiesTableColumns}
              pagination
              pageSize={10}
            />
          )}
        </CardContent>
      </Card>

      {/* Add Family Modal */}
      <FamilyModal 
        isOpen={isAddFamilyOpen} 
        onClose={() => setIsAddFamilyOpen(false)} 
      />

      {/* Delete Family Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Family</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedFamily && (
                <>
                  Are you sure you want to delete <strong>{selectedFamily.name}</strong>?
                  This will remove all users from the family, but will not delete their accounts or data.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}