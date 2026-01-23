import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Users, Briefcase, CheckCircle2, Clock, AlertTriangle, Plus, Trash2, Loader2, LayoutGrid, List, Settings2, Shield } from 'lucide-react';
import { isPast } from 'date-fns';
import { toast } from 'sonner';
import { User } from '@/types/taskflow';

interface AdminPermissions {
  canAddMembers: boolean;
  canEditMembers: boolean;
  canDeleteMembers: boolean;
  canCreateTasks: boolean;
  canDeleteTasks: boolean;
}

interface MemberCardProps {
  member: any;
  isSuperAdmin: boolean;
  canManageTeam: boolean;
  currentUserId: string | undefined;
  userRole: string | undefined;
  onOpenPermissions: (member: any) => void;
  onDelete: (id: string) => void;
}

// Compact Grid Card - matches TaskCard size
function MemberCard({ member, isSuperAdmin, canManageTeam, currentUserId, userRole, onOpenPermissions, onDelete }: MemberCardProps) {
  const memberId = member._id || member.id;
  const canDelete = canManageTeam && 
    memberId !== currentUserId &&
    ((userRole === 'super_admin' && member.role === 'admin') ||
     (userRole === 'admin' && member.role === 'core_manager'));

  return (
    <div className="card-elevated p-2.5 cursor-pointer transition-all duration-200 hover:scale-[1.02] group relative">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <Avatar className="w-6 h-6">
          <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
            {member.name.split(' ').map((n: string) => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-xs text-foreground line-clamp-1">{member.name}</h3>
        </div>
      </div>

      {/* Department & Role */}
      <div className="flex items-center gap-1 mb-1.5">
        <Briefcase className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
        <span className="text-[9px] text-muted-foreground line-clamp-1">{member.department || 'General'}</span>
      </div>

      <div className="flex gap-1 mb-1.5">
        <Badge variant="secondary" className="text-[8px] px-1 py-0 capitalize">
          {member.role?.replace('_', ' ')}
        </Badge>
        {/* Permissions Badge */}
        {isSuperAdmin && member.role === 'admin' && (
          <>
            {member.permissions?.canAddMembers === false && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 text-warning border-warning/30">No Add</Badge>
            )}
            {member.permissions?.canDeleteMembers === false && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 text-danger border-danger/30">No Del</Badge>
            )}
            {member.permissions?.canAddMembers !== false && member.permissions?.canDeleteMembers !== false && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 text-success border-success/30">Full</Badge>
            )}
          </>
        )}
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between pt-1.5 border-t border-border text-[9px]">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{member.pending}P</span>
          <span className="text-primary">{member.inProgress}A</span>
          <span className="text-success">{member.completed}D</span>
          <span className="text-danger">{member.delayed}L</span>
        </div>
        <span className="text-muted-foreground">{member.totalTasks} tasks</span>
      </div>

      {/* Workload Bar */}
      <div className="mt-1.5">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-primary rounded-full transition-all"
            style={{ width: `${Math.min((member.totalTasks / 5) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {isSuperAdmin && member.role === 'admin' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-primary"
            onClick={(e) => { e.stopPropagation(); onOpenPermissions(member); }}
            title="Manage Permissions"
          >
            <Settings2 className="w-3 h-3" />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-danger"
            onClick={(e) => { e.stopPropagation(); onDelete(memberId); }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Compact List Card - horizontal layout
function MemberCardCompact({ member, isSuperAdmin, canManageTeam, currentUserId, userRole, onOpenPermissions, onDelete }: MemberCardProps) {
  const memberId = member._id || member.id;
  const canDelete = canManageTeam && 
    memberId !== currentUserId &&
    ((userRole === 'super_admin' && member.role === 'admin') ||
     (userRole === 'admin' && member.role === 'core_manager'));

  return (
    <div className="card-elevated px-3 py-2 cursor-pointer transition-all duration-200 hover:bg-muted/50 group flex items-center gap-3">
      {/* Avatar */}
      <Avatar className="w-5 h-5 flex-shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-[8px]">
          {member.name.split(' ').map((n: string) => n[0]).join('')}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <span className="font-medium text-xs text-foreground line-clamp-1 flex-1 min-w-0">
        {member.name}
      </span>

      {/* Role Badge */}
      <Badge variant="secondary" className="text-[8px] px-1 py-0 capitalize flex-shrink-0">
        {member.role?.replace('_', ' ')}
      </Badge>

      {/* Permissions Badge */}
      {isSuperAdmin && member.role === 'admin' && (
        <div className="flex gap-0.5 flex-shrink-0">
          {member.permissions?.canAddMembers !== false && member.permissions?.canDeleteMembers !== false ? (
            <Badge variant="outline" className="text-[8px] px-1 py-0 text-success border-success/30">Full</Badge>
          ) : (
            <>
              {member.permissions?.canAddMembers === false && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 text-warning border-warning/30">-A</Badge>
              )}
              {member.permissions?.canDeleteMembers === false && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 text-danger border-danger/30">-D</Badge>
              )}
            </>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-1.5 text-[9px] flex-shrink-0">
        <span className="text-muted-foreground">{member.pending}P</span>
        <span className="text-primary">{member.inProgress}A</span>
        <span className="text-success">{member.completed}D</span>
        <span className="text-danger">{member.delayed}L</span>
      </div>

      {/* Tasks Count */}
      <span className="text-[9px] text-muted-foreground flex-shrink-0">{member.totalTasks} tasks</span>

      {/* Actions */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {isSuperAdmin && member.role === 'admin' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-primary"
            onClick={(e) => { e.stopPropagation(); onOpenPermissions(member); }}
            title="Manage Permissions"
          >
            <Settings2 className="w-3 h-3" />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-danger"
            onClick={(e) => { e.stopPropagation(); onDelete(memberId); }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Team() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddMode, setIsAddMode] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [editingPermissions, setEditingPermissions] = useState<AdminPermissions>({
    canAddMembers: true,
    canEditMembers: true,
    canDeleteMembers: true,
    canCreateTasks: true,
    canDeleteTasks: true,
  });

  // Compute default role based on current user
  const getDefaultRole = () => user?.role === 'super_admin' ? 'admin' : 'core_manager';

  // Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: getDefaultRole(),
    department: '',
  });

  // Sync role when user changes (e.g., after auth loads)
  useEffect(() => {
    setNewUser(prev => ({ ...prev, role: getDefaultRole() }));
  }, [user?.role]);

  // Permissions
  const canManageTeam = user?.role === 'super_admin' || user?.role === 'admin';
  const isSuperAdmin = user?.role === 'super_admin';

  // Fetch Users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    }
  });

  // Fetch Active Tasks
  const { data: activeTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await api.get('/tasks');
      return res.data;
    }
  });

  // Fetch Completed Tasks for stats
  const { data: completedTasks = [] } = useQuery({
    queryKey: ['tasks', 'completed'],
    queryFn: async () => {
      const res = await api.get('/tasks?completed=true');
      return res.data;
    }
  });

  // Combine all tasks for stats
  const allTasks = [...activeTasks, ...completedTasks];

  // Filter users based on current user's role visibility rules:
  // - Super Admin: sees only Admins
  // - Admin: sees other Admins and Core Managers
  // - Core Manager: sees only other Core Managers (no Administrators)
  const visibleUsers = users.filter((u: User) => {
    if (!user) return false;
    
    if (user.role === 'super_admin') {
      // Super Admin can only see Admins
      return u.role === 'admin';
    } else if (user.role === 'admin') {
      // Admin can see other Admins and Core Managers
      return u.role === 'admin' || u.role === 'core_manager';
    } else if (user.role === 'core_manager') {
      // Core Manager can only see other Core Managers
      return u.role === 'core_manager';
    }
    return false;
  });

  // Calculate Stats per User
  const teamStats = visibleUsers.map((u: User) => {
    const userId = (u._id || u.id) as string;

    // Filter all tasks where user is assignee
    const userTasks = allTasks.filter((t: any) => {
      return t.assignments?.some((a: any) => {
        if (!a || !a.userId) return false;
        const assigneeId =
          typeof a.userId === 'object' ? (a.userId as any)._id : a.userId;
        return assigneeId === userId;
      });
    });

    // Active tasks only (for workload)
    const userActiveTasks = activeTasks.filter((t: any) => {
      return t.assignments?.some((a: any) => {
        if (!a || !a.userId) return false;
        const assigneeId =
          typeof a.userId === 'object' ? (a.userId as any)._id : a.userId;
        return assigneeId === userId;
      });
    });

    const completed = userTasks.filter((t: any) => t.status === 'completed').length;
    const inProgress = userActiveTasks.filter((t: any) => t.status === 'in_progress').length;
    const pending = userActiveTasks.filter((t: any) => t.status === 'pending').length;
    const delayed = userActiveTasks.filter((t: any) => isPast(new Date(t.dueDate)) && t.status !== 'completed').length;

    return {
      ...u,
      totalTasks: userActiveTasks.length, // Active tasks count for workload
      completed,
      inProgress,
      pending,
      delayed
    };
  });

  // Mutations
  const createMemberMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsAddMode(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: getDefaultRole(),
        department: '',
      });
      toast.success('User added successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add member');
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Member removed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  });

  // Update admin permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ id, permissions }: { id: string; permissions: AdminPermissions }) => {
      await api.patch(`/users/${id}/permissions`, { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setPermissionsDialogOpen(false);
      setSelectedAdmin(null);
      toast.success('Permissions updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update permissions');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMemberMutation.mutate(newUser);
  };

  const openPermissionsDialog = (admin: any) => {
    setSelectedAdmin(admin);
    setEditingPermissions({
      canAddMembers: admin.permissions?.canAddMembers ?? true,
      canEditMembers: admin.permissions?.canEditMembers ?? true,
      canDeleteMembers: admin.permissions?.canDeleteMembers ?? true,
      canCreateTasks: admin.permissions?.canCreateTasks ?? true,
      canDeleteTasks: admin.permissions?.canDeleteTasks ?? true,
    });
    setPermissionsDialogOpen(true);
  };

  const handleSavePermissions = () => {
    if (selectedAdmin) {
      updatePermissionsMutation.mutate({
        id: selectedAdmin._id || selectedAdmin.id,
        permissions: editingPermissions,
      });
    }
  };



  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6" />
              {user?.role === 'super_admin' ? 'Admin Management' : 
               user?.role === 'admin' ? 'Team Management' : 'Team Directory'}
            </h1>
            <p className="text-muted-foreground">
              {user?.role === 'super_admin' 
                ? 'Manage your organization\'s admins.'
                : user?.role === 'admin'
                ? 'Manage admins and core team members.'
                : 'View core team managers in your organization.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border border-border p-1 bg-muted/30">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {canManageTeam && (
              <Dialog open={isAddMode} onOpenChange={setIsAddMode}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Member
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Team Member</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      required
                      value={newUser.name}
                      onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      required
                      value={newUser.email}
                      onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password (Default)</Label>
                    <Input
                      type="password"
                      required
                      value={newUser.password}
                      onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input
                        value={newUser.department}
                        onChange={e => setNewUser({ ...newUser, department: e.target.value })}
                        placeholder="Engineering"
                      />
                    </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={newUser.role}
                      onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      {user?.role === 'super_admin' && (
                        <option value="admin">Admin</option>
                      )}
                      {user?.role === 'admin' && (
                        <option value="core_manager">Core Team Manager</option>
                      )}
                    </select>
                  </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createMemberMutation.isPending}>
                    {createMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>

        {/* Team Display */}
        {usersLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : teamStats.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <p className="text-muted-foreground">No team members found</p>
          </div>
        ) : (
          /* Segregated View for Admin - shows Admins and Core Managers separately */
          (() => {
            // Separate admins and core managers for Admin view
            const adminMembers = teamStats.filter((m: any) => m.role === 'admin');
            const coreManagerMembers = teamStats.filter((m: any) => m.role === 'core_manager');
            const isAdminUser = user?.role === 'admin';
            const isCoreManagerUser = user?.role === 'core_manager';

            // Helper function to render a section
            const renderMemberSection = (members: any[], title: string, icon: React.ReactNode, showSection: boolean) => {
              if (!showSection || members.length === 0) return null;

              const rows: any[][] = [];
              for (let i = 0; i < members.length; i += 6) {
                rows.push(members.slice(i, i + 6));
              }

              return (
                <div className="space-y-3">
                  {/* Section Header */}
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    {icon}
                    <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                    <Badge variant="secondary" className="text-xs">{members.length}</Badge>
                  </div>

                  {/* Members */}
                  {viewMode === 'grid' ? (
                    <div className="space-y-3">
                      {rows.map((row, rowIndex) => {
                        const leftMembers = row.slice(0, 3);
                        const rightMembers = row.slice(3);
                        return (
                          <div key={rowIndex} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {leftMembers.map((member: any) => (
                                <MemberCard
                                  key={member._id || member.id}
                                  member={member}
                                  isSuperAdmin={isSuperAdmin}
                                  canManageTeam={canManageTeam}
                                  currentUserId={user?._id || user?.id}
                                  userRole={user?.role}
                                  onOpenPermissions={openPermissionsDialog}
                                  onDelete={(id) => {
                                    if (confirm('Remove this member?')) deleteMemberMutation.mutate(id);
                                  }}
                                />
                              ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {rightMembers.map((member: any) => (
                                <MemberCard
                                  key={member._id || member.id}
                                  member={member}
                                  isSuperAdmin={isSuperAdmin}
                                  canManageTeam={canManageTeam}
                                  currentUserId={user?._id || user?.id}
                                  userRole={user?.role}
                                  onOpenPermissions={openPermissionsDialog}
                                  onDelete={(id) => {
                                    if (confirm('Remove this member?')) deleteMemberMutation.mutate(id);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rows.map((row, rowIndex) => {
                        const leftMembers = row.slice(0, 3);
                        const rightMembers = row.slice(3);
                        return (
                          <div key={rowIndex} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-1">
                              {leftMembers.map((member: any) => (
                                <MemberCardCompact
                                  key={member._id || member.id}
                                  member={member}
                                  isSuperAdmin={isSuperAdmin}
                                  canManageTeam={canManageTeam}
                                  currentUserId={user?._id || user?.id}
                                  userRole={user?.role}
                                  onOpenPermissions={openPermissionsDialog}
                                  onDelete={(id) => {
                                    if (confirm('Remove this member?')) deleteMemberMutation.mutate(id);
                                  }}
                                />
                              ))}
                            </div>
                            <div className="flex flex-col gap-1">
                              {rightMembers.map((member: any) => (
                                <MemberCardCompact
                                  key={member._id || member.id}
                                  member={member}
                                  isSuperAdmin={isSuperAdmin}
                                  canManageTeam={canManageTeam}
                                  currentUserId={user?._id || user?.id}
                                  userRole={user?.role}
                                  onOpenPermissions={openPermissionsDialog}
                                  onDelete={(id) => {
                                    if (confirm('Remove this member?')) deleteMemberMutation.mutate(id);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent space-y-6">
                {/* Super Admin: Only shows Admins */}
                {isSuperAdmin && renderMemberSection(
                  adminMembers, 
                  'Administrators', 
                  <Shield className="w-4 h-4 text-primary" />,
                  true
                )}

                {/* Admin: Shows both Admins and Core Managers in separate sections */}
                {isAdminUser && (
                  <>
                    {renderMemberSection(
                      adminMembers, 
                      'Administrators', 
                      <Shield className="w-4 h-4 text-amber-500" />,
                      adminMembers.length > 0
                    )}
                    {renderMemberSection(
                      coreManagerMembers, 
                      'Core Managers', 
                      <Users className="w-4 h-4 text-primary" />,
                      true
                    )}
                  </>
                )}

                {/* Core Manager: Shows only Core Managers */}
                {isCoreManagerUser && (
                  <>
                    {renderMemberSection(
                      coreManagerMembers, 
                      'Core Managers', 
                      <Users className="w-4 h-4 text-primary" />,
                      true
                    )}
                  </>
                )}
              </div>
            );
          })()
        )}

        {/* Permissions Management Dialog - Super Admin Only */}
        <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Manage Permissions
              </DialogTitle>
            </DialogHeader>
            {selectedAdmin && (
              <div className="space-y-6 mt-4">
                {/* Admin Info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedAdmin.name?.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedAdmin.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedAdmin.email}</p>
                  </div>
                </div>

                {/* Permissions Toggles */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Member Management</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="canAddMembers">Can Add Members</Label>
                      <p className="text-xs text-muted-foreground">Allow creating new Core Managers</p>
                    </div>
                    <Switch
                      id="canAddMembers"
                      checked={editingPermissions.canAddMembers}
                      onCheckedChange={(checked) => 
                        setEditingPermissions(prev => ({ ...prev, canAddMembers: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="canEditMembers">Can Edit Members</Label>
                      <p className="text-xs text-muted-foreground">Allow editing member details</p>
                    </div>
                    <Switch
                      id="canEditMembers"
                      checked={editingPermissions.canEditMembers}
                      onCheckedChange={(checked) => 
                        setEditingPermissions(prev => ({ ...prev, canEditMembers: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="canDeleteMembers">Can Delete Members</Label>
                      <p className="text-xs text-muted-foreground">Allow removing Core Managers</p>
                    </div>
                    <Switch
                      id="canDeleteMembers"
                      checked={editingPermissions.canDeleteMembers}
                      onCheckedChange={(checked) => 
                        setEditingPermissions(prev => ({ ...prev, canDeleteMembers: checked }))
                      }
                    />
                  </div>

                  <div className="border-t border-border pt-4 mt-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-4">Task Management</h4>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label htmlFor="canCreateTasks">Can Create Tasks</Label>
                        <p className="text-xs text-muted-foreground">Allow creating and assigning tasks</p>
                      </div>
                      <Switch
                        id="canCreateTasks"
                        checked={editingPermissions.canCreateTasks}
                        onCheckedChange={(checked) => 
                          setEditingPermissions(prev => ({ ...prev, canCreateTasks: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="canDeleteTasks">Can Delete Tasks</Label>
                        <p className="text-xs text-muted-foreground">Allow deleting tasks</p>
                      </div>
                      <Switch
                        id="canDeleteTasks"
                        checked={editingPermissions.canDeleteTasks}
                        onCheckedChange={(checked) => 
                          setEditingPermissions(prev => ({ ...prev, canDeleteTasks: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPermissionsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSavePermissions}
                    disabled={updatePermissionsMutation.isPending}
                  >
                    {updatePermissionsMutation.isPending ? 'Saving...' : 'Save Permissions'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
