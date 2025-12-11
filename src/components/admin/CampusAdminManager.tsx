import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Trash2, Shield, Search, Crown, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Database } from '@/integrations/supabase/types';

type CampusLocation = Database['public']['Enums']['campus_location'];

const CAMPUSES = [
  { value: 'pretoria_west_main', label: 'Pretoria West (Main)' },
  { value: 'arcadia', label: 'Arcadia Campus' },
  { value: 'arts', label: 'Arts Campus' },
  { value: 'giyani', label: 'Giyani Campus' },
  { value: 'mbombela', label: 'Mbombela Campus' },
  { value: 'polokwane', label: 'Polokwane Campus' },
  { value: 'garankuwa', label: 'Ga-Rankuwa Campus' },
  { value: 'soshanguve_south', label: 'Soshanguve South' },
  { value: 'soshanguve_north', label: 'Soshanguve North' },
  { value: 'emalahleni', label: 'eMalahleni Campus' }
];

interface CampusAdmin {
  id: string;
  admin_id: string;
  campus: string;
  is_head: boolean;
  profile: {
    full_name: string | null;
    email: string;
  } | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
}

export const CampusAdminManager = () => {
  const [admins, setAdmins] = useState<CampusAdmin[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dialogTab, setDialogTab] = useState<'assign' | 'create'>('create');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    userId: '',
    campus: 'pretoria_west_main',
    isHead: false
  });

  const [createFormData, setCreateFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    campus: 'pretoria_west_main',
    isHead: false
  });

  useEffect(() => {
    fetchAdmins();
    fetchUsers();
  }, []);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      // Fetch admin_access records
      const { data: accessData, error: accessError } = await supabase
        .from('admin_access')
        .select('id, admin_id, campus, is_head')
        .order('campus', { ascending: true });

      if (accessError) {
        console.error('Error fetching admin access:', accessError);
        setAdmins([]);
        return;
      }

      if (!accessData || accessData.length === 0) {
        setAdmins([]);
        return;
      }

      // Fetch profiles for these admins
      const adminIds = accessData.map(a => a.admin_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', adminIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Merge the data
      const mergedAdmins: CampusAdmin[] = accessData.map(access => ({
        id: access.id,
        admin_id: access.admin_id,
        campus: access.campus,
        is_head: access.is_head || false,
        profile: profilesData?.find(p => p.id === access.admin_id) || null
      }));

      setAdmins(mergedAdmins);
    } catch (err) {
      console.error('Error in fetchAdmins:', err);
      setAdmins([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name', { ascending: true });

    if (!error && data) {
      setUsers(data);
    }
  };

  const handleAssign = async () => {
    if (!formData.userId || !formData.campus) {
      toast({ title: 'Please select a user and campus', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.rpc('assign_campus_admin', {
      p_user_id: formData.userId,
      p_campus: formData.campus as CampusLocation,
      p_is_head: formData.isHead
    });

    if (error) {
      console.error('Error assigning admin:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Campus officer assigned successfully' });
      fetchAdmins();
      setIsDialogOpen(false);
      setFormData({ userId: '', campus: 'pretoria_west_main', isHead: false });
    }
  };

  const handleCreateAdmin = async () => {
    if (!createFormData.email || !createFormData.password || !createFormData.fullName || !createFormData.campus) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    if (createFormData.password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setIsCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-campus-admin', {
        body: {
          email: createFormData.email,
          password: createFormData.password,
          full_name: createFormData.fullName,
          campus: createFormData.campus,
          is_head: createFormData.isHead
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ title: 'CCSF Officer created successfully', description: `${createFormData.fullName} can now log in with their credentials` });
      fetchAdmins();
      setIsDialogOpen(false);
      setCreateFormData({ email: '', password: '', fullName: '', campus: 'pretoria_west_main', isHead: false });
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast({ title: 'Error', description: error.message || 'Failed to create officer', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemove = async (adminId: string, campus: string) => {
    const { error } = await supabase.rpc('remove_campus_admin', {
      p_user_id: adminId,
      p_campus: campus as CampusLocation
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Campus officer removed' });
      fetchAdmins();
    }
  };

  const getCampusLabel = (value: string) => {
    return CAMPUSES.find(c => c.value === value)?.label || value;
  };

  const filteredUsers = users.filter(u => 
    (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group admins by campus
  const adminsByCampus = admins.reduce((acc, admin) => {
    if (!acc[admin.campus]) {
      acc[admin.campus] = [];
    }
    acc[admin.campus].push(admin);
    return acc;
  }, {} as Record<string, CampusAdmin[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            CCSF Officer Management
          </h2>
          <p className="text-muted-foreground">Create and manage Campus Community Safety Forum officers</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Officer
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : admins.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No CCSF Officers</h3>
            <p className="text-muted-foreground mb-4">
              Create officers to manage campus safety operations
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create First Officer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {Object.entries(adminsByCampus).map(([campus, campusAdmins]) => (
            <motion.div
              key={campus}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{getCampusLabel(campus)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {campusAdmins.map((admin) => (
                      <div 
                        key={admin.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Shield className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {admin.profile?.full_name || 'Unknown'}
                              </span>
                              {admin.is_head && (
                                <Badge variant="default" className="text-xs">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Head Admin
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {admin.profile?.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(admin.admin_id, admin.campus)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Officer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add CCSF Officer</DialogTitle>
          </DialogHeader>
          
          <Tabs value={dialogTab} onValueChange={(v) => setDialogTab(v as 'assign' | 'create')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create New</TabsTrigger>
              <TabsTrigger value="assign">Assign Existing</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="Officer's full name"
                  value={createFormData.fullName}
                  onChange={(e) => setCreateFormData({ ...createFormData, fullName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="officer@email.com"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={createFormData.password}
                    onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Campus *</Label>
                <Select 
                  value={createFormData.campus} 
                  onValueChange={(v) => setCreateFormData({ ...createFormData, campus: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPUSES.map(campus => (
                      <SelectItem key={campus.value} value={campus.value}>{campus.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createIsHead"
                  checked={createFormData.isHead}
                  onChange={(e) => setCreateFormData({ ...createFormData, isHead: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="createIsHead" className="cursor-pointer">
                  Assign as Head Admin (can manage all campuses)
                </Label>
              </div>

              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateAdmin} disabled={isCreating}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Officer
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="assign" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Search User</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select User</Label>
                <Select value={formData.userId} onValueChange={(v) => setFormData({ ...formData, userId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredUsers.slice(0, 20).map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Campus</Label>
                <Select value={formData.campus} onValueChange={(v) => setFormData({ ...formData, campus: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPUSES.map(campus => (
                      <SelectItem key={campus.value} value={campus.value}>{campus.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isHead"
                  checked={formData.isHead}
                  onChange={(e) => setFormData({ ...formData, isHead: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isHead" className="cursor-pointer">
                  Assign as Head Admin (can manage all campuses)
                </Label>
              </div>

              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAssign}>Assign Officer</Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};