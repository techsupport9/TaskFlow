import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { 
  Settings as SettingsIcon, 
  User as UserIcon, 
  Bell, 
  Shield, 
  Building,
  Palette,
  Download,
  Sun,
  Moon,
  Monitor,
  Check,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Users,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


export default function Settings() {
  const { user, company } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  // Profile state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    department: user?.department || '',
    phone: '',
    bio: '',
  });

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Super Admin password change state
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<string>('');
  const [adminPasswordData, setAdminPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showAdminPasswords, setShowAdminPasswords] = useState({
    new: false,
    confirm: false,
  });

  // Preferences state
  const [preferences, setPreferences] = useState({
    dateFormat: 'DD/MM/YYYY',
    timeZone: 'Asia/Kolkata',
    notifications: {
      taskAssigned: true,
      taskCompleted: true,
      taskComments: true,
      dueDateReminders: true,
      emailNotifications: true,
      weeklyDigest: false,
    },
    autoDeleteDays: 7,
    defaultPriority: 'medium',
  });

  // Fetch user profile with preferences
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await api.get('/users/profile');
      return res.data;
    },
    enabled: !!user, // Always fetch when user is available
  });

  // Fetch users for Super Admin and Admin with password change permission
  // Must be after userProfile query to access userProfile.permissions
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
    enabled: user?.role === 'super_admin' || (user?.role === 'admin' && userProfile?.permissions?.canChangePassword === true),
  });

  // Update local state when profile loads
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        name: userProfile.name || '',
        department: userProfile.department || '',
        phone: userProfile.phone || '',
        bio: userProfile.bio || '',
      });
      if (userProfile.preferences) {
        setPreferences(prev => ({
          ...prev,
          ...userProfile.preferences,
          notifications: {
            ...prev.notifications,
            ...(userProfile.preferences.notifications || {}),
          },
        }));
      }
    }
  }, [userProfile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      return await api.patch('/users/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      toast.success('Profile updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword?: string; newPassword: string; targetUserId?: string }) => {
      return await api.post('/users/change-password', data);
    },
    onSuccess: () => {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setAdminPasswordData({ newPassword: '', confirmPassword: '' });
      setSelectedUserForPassword('');
      toast.success('Password changed successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to change password');
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: typeof preferences) => {
      return await api.patch('/users/preferences', { preferences: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      toast.success('Preferences saved');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save preferences');
    },
  });

  const handleProfileSave = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handleAdminPasswordChange = () => {
    if (!selectedUserForPassword) {
      toast.error('Please select a user');
      return;
    }
    if (adminPasswordData.newPassword !== adminPasswordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (adminPasswordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    changePasswordMutation.mutate({
      newPassword: adminPasswordData.newPassword,
      targetUserId: selectedUserForPassword,
    });
  };

  const handlePreferencesSave = () => {
    updatePreferencesMutation.mutate(preferences);
  };

  // Export tasks as CSV
  const handleExportTasks = async () => {
    try {
      const res = await api.get('/tasks');
      const tasks = res.data;
      
      // Create CSV
      const headers = ['Title', 'Description', 'Priority', 'Status', 'Due Date', 'Created At'];
      const rows = tasks.map((t: any) => [
        t.title,
        t.description || '',
        t.priority,
        t.status,
        new Date(t.dueDate).toLocaleDateString(),
        new Date(t.createdAt).toLocaleDateString(),
      ]);
      
      const csv = [
        headers.join(','),
        ...rows.map((r: string[]) => r.map(cell => `"${cell}"`).join(',')),
      ].join('\n');
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Tasks exported successfully');
    } catch (err) {
      toast.error('Failed to export tasks');
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account, preferences, and application settings.
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="profile" className="gap-2">
              <UserIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Data</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                Profile Information
              </h2>
              
              <div className="flex items-start gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {profileData.name?.split(' ').map(n => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue={user?.email} disabled />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input 
                        id="department" 
                        value={profileData.department}
                        onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input 
                        id="phone" 
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea 
                      id="bio" 
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      placeholder="Tell us a bit about yourself..."
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="capitalize">
                      {user?.role?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-border">
                <Button 
                  onClick={handleProfileSave}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>

            {/* Company Section */}
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building className="w-5 h-5" />
                Company
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input defaultValue={company?.name} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Tenant ID</Label>
                  <Input defaultValue={company?.id} disabled className="font-mono text-sm" />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Theme
              </h2>
              
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === 'light' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Sun className="w-8 h-8" />
                    <span className="font-medium">Light</span>
                    {theme === 'light' && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === 'dark' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Moon className="w-8 h-8" />
                    <span className="font-medium">Dark</span>
                    {theme === 'dark' && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === 'system' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Monitor className="w-8 h-8" />
                    <span className="font-medium">System</span>
                    {theme === 'system' && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </button>
              </div>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Task Assigned</p>
                    <p className="text-sm text-muted-foreground">Get notified when a task is assigned to you</p>
                  </div>
                  <Switch 
                    checked={preferences.notifications.taskAssigned}
                    onCheckedChange={(checked) => setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, taskAssigned: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Task Completed</p>
                    <p className="text-sm text-muted-foreground">Get notified when your tasks are completed</p>
                  </div>
                  <Switch 
                    checked={preferences.notifications.taskCompleted}
                    onCheckedChange={(checked) => setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, taskCompleted: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Comments</p>
                    <p className="text-sm text-muted-foreground">Get notified when someone comments on your tasks</p>
                  </div>
                  <Switch 
                    checked={preferences.notifications.taskComments}
                    onCheckedChange={(checked) => setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, taskComments: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Due Date Reminders</p>
                    <p className="text-sm text-muted-foreground">Get reminded before task due dates</p>
                  </div>
                  <Switch 
                    checked={preferences.notifications.dueDateReminders}
                    onCheckedChange={(checked) => setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, dueDateReminders: checked }
                    })}
                  />
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive email alerts in addition to in-app</p>
                    </div>
                    <Switch 
                      checked={preferences.notifications.emailNotifications}
                      onCheckedChange={(checked) => setPreferences({
                        ...preferences,
                        notifications: { ...preferences.notifications, emailNotifications: checked }
                      })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Weekly Digest</p>
                    <p className="text-sm text-muted-foreground">Receive a weekly summary of task activity</p>
                  </div>
                  <Switch 
                    checked={preferences.notifications.weeklyDigest}
                    onCheckedChange={(checked) => setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, weeklyDigest: checked }
                    })}
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-border">
                <Button 
                  onClick={handlePreferencesSave}
                  disabled={updatePreferencesMutation.isPending}
                >
                  Save Notification Settings
                </Button>
              </div>
            </div>

            {/* Admin-only settings */}
            {user?.role === 'admin' && (
              <div className="card-elevated p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Admin Settings</h2>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Auto-delete completed tasks after (days)</Label>
                    <select
                      className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={preferences.autoDeleteDays}
                      onChange={(e) => setPreferences({ ...preferences, autoDeleteDays: Number(e.target.value) })}
                    >
                      <option value={3}>3 days</option>
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={0}>Never</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Task Priority</Label>
                    <select
                      className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={preferences.defaultPriority}
                      onChange={(e) => setPreferences({ ...preferences, defaultPriority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end mt-4 pt-4 border-t border-border">
                  <Button 
                    onClick={handlePreferencesSave}
                    disabled={updatePreferencesMutation.isPending}
                  >
                    Save Admin Settings
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Change My Password
              </h2>
              
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input 
                      id="currentPassword"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input 
                      id="newPassword"
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input 
                      id="confirmPassword"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  onClick={handlePasswordChange}
                  disabled={changePasswordMutation.isPending || !passwordData.currentPassword || !passwordData.newPassword}
                  className="mt-2"
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </div>
            </div>

            {/* Super Admin or Admin with permission: Change Others' Passwords */}
            {(user?.role === 'super_admin' || (user?.role === 'admin' && userProfile?.permissions?.canChangePassword === true)) && (
              <div className="card-elevated p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Change User Password
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {user?.role === 'super_admin' 
                    ? 'As a Super Admin, you can change passwords for any user in the system.'
                    : 'You have permission to change passwords for Core Managers.'}
                </p>
                
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="selectUser">Select User</Label>
                    <Select value={selectedUserForPassword} onValueChange={setSelectedUserForPassword}>
                      <SelectTrigger id="selectUser">
                        <SelectValue placeholder="Select a user..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers
                          .filter((u: any) => {
                            const userId = u._id || u.id;
                            const currentUserId = user?._id || user?.id;
                            // Super Admin can change any user's password
                            if (user?.role === 'super_admin') {
                              return userId !== currentUserId;
                            }
                            // Admin with permission can only change Core Manager passwords
                            if (user?.role === 'admin' && userProfile?.permissions?.canChangePassword) {
                              return userId !== currentUserId && u.role === 'core_manager';
                            }
                            return false;
                          })
                          .map((u: any) => (
                            <SelectItem key={u._id || u.id} value={u._id || u.id}>
                              <div className="flex items-center gap-2">
                                <span>{u.name}</span>
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {u.role?.replace('_', ' ')}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedUserForPassword && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="adminNewPassword">New Password</Label>
                        <div className="relative">
                          <Input 
                            id="adminNewPassword"
                            type={showAdminPasswords.new ? 'text' : 'password'}
                            value={adminPasswordData.newPassword}
                            onChange={(e) => setAdminPasswordData({ ...adminPasswordData, newPassword: e.target.value })}
                            placeholder="Enter new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPasswords({ ...showAdminPasswords, new: !showAdminPasswords.new })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showAdminPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adminConfirmPassword">Confirm New Password</Label>
                        <div className="relative">
                          <Input 
                            id="adminConfirmPassword"
                            type={showAdminPasswords.confirm ? 'text' : 'password'}
                            value={adminPasswordData.confirmPassword}
                            onChange={(e) => setAdminPasswordData({ ...adminPasswordData, confirmPassword: e.target.value })}
                            placeholder="Confirm new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPasswords({ ...showAdminPasswords, confirm: !showAdminPasswords.confirm })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showAdminPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Button 
                        onClick={handleAdminPasswordChange}
                        disabled={changePasswordMutation.isPending || !adminPasswordData.newPassword || !adminPasswordData.confirmPassword}
                        className="mt-2"
                      >
                        {changePasswordMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Changing...
                          </>
                        ) : (
                          'Change User Password'
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Two-Factor Authentication
              </h2>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="space-y-6">
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Data
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                  <div>
                    <p className="font-medium text-foreground">Export Tasks</p>
                    <p className="text-sm text-muted-foreground">Download all your tasks as a CSV file</p>
                  </div>
                  <Button variant="outline" onClick={handleExportTasks}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>

          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
