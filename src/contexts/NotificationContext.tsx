import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Notification } from '@/types/taskflow';
import { useAuth } from './AuthContext';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  isLoading: boolean;
  refetch: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [lastNotificationCount, setLastNotificationCount] = useState(0);

  // Fetch notifications from API
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.map((n: any) => ({
        ...n,
        id: n._id || n.id,
        createdAt: new Date(n.createdAt),
      }));
    },
    enabled: isAuthenticated && user?.role !== 'super_admin',
    refetchInterval: 5000, // Poll every 5 seconds for new notifications
  });

  // Show toast when new notifications arrive
  useEffect(() => {
    if (notifications.length > lastNotificationCount && lastNotificationCount > 0) {
      const newNotifs = notifications.slice(0, notifications.length - lastNotificationCount);
      newNotifs.forEach((notif: Notification) => {
        if (!notif.read) {
          toast.info(notif.message, { duration: 5000 });
        }
      });
    }
    setLastNotificationCount(notifications.length);
  }, [notifications.length]);

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.patch(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAsRead = useCallback((notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  }, [markAsReadMutation]);

  // Mark all as read - using backend endpoint for efficiency
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        isLoading,
        refetch,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
