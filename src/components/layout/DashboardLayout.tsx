import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading, user, isSuperAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'super_admin':
        return <Badge variant="default" className="bg-purple-600">Super Admin</Badge>;
      case 'admin':
        return <Badge variant="default" className="bg-blue-600">Admin</Badge>;
      case 'core_manager':
        return <Badge variant="secondary">Core Manager</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      {/* Top Header Bar */}
      <header className="fixed top-0 right-0 left-64 h-16 bg-background/80 backdrop-blur-sm border-b border-border z-30 transition-all duration-300">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Left side - Welcome text */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Welcome back,
            </span>
            <span className="font-semibold text-foreground">
              {user?.name?.split(' ')[0]}
            </span>
            {getRoleBadge()}
          </div>

          {/* Right side - Notifications & User */}
          <div className="flex items-center gap-4">
            {/* Notification Bell - Not shown for Super Admin */}
            {!isSuperAdmin && <NotificationBell />}
            
            {/* User Avatar */}
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.department || 'No department'}</p>
              </div>
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {user?.name?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pl-64 pt-16 pb-12 min-h-screen transition-all duration-300">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Footer with Copyright */}
      <footer className="fixed bottom-0 right-0 left-64 h-12 bg-background/80 backdrop-blur-sm border-t border-border flex items-center justify-center z-20">
        <p className="text-xs text-muted-foreground">
          Copyright © 2025 AI GRP. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
