import { useState, useEffect, useCallback, useRef } from 'react';

export interface QueuedNotification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationEngineState {
  isTabVisible: boolean;
  queuedNotifications: QueuedNotification[];
  unreadCount: number;
}

export function useNotificationEngine() {
  const [state, setState] = useState<NotificationEngineState>({
    isTabVisible: true,
    queuedNotifications: [],
    unreadCount: 0,
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio for notifications
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 0.3;
  }, []);

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setState(prev => ({ ...prev, isTabVisible: isVisible }));
      
      // When tab becomes visible, show queued notifications
      if (isVisible && state.queuedNotifications.length > 0) {
        // Flash the title to draw attention
        const originalTitle = document.title;
        document.title = `(${state.queuedNotifications.length}) New Notifications - Prolt`;
        setTimeout(() => {
          document.title = originalTitle;
        }, 3000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.queuedNotifications.length]);

  // Add notification - queues if tab not visible
  const addNotification = useCallback((notification: Omit<QueuedNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: QueuedNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };

    setState(prev => {
      const updated = {
        ...prev,
        queuedNotifications: [newNotification, ...prev.queuedNotifications],
        unreadCount: prev.unreadCount + 1,
      };

      // Only play sound/flash if tab is visible
      if (prev.isTabVisible) {
        // Play notification sound
        if (audioRef.current) {
          audioRef.current.play().catch(() => {
            // Ignore audio play errors (user hasn't interacted yet)
          });
        }
      }

      return updated;
    });

    return newNotification.id;
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      queuedNotifications: prev.queuedNotifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setState(prev => ({
      ...prev,
      queuedNotifications: prev.queuedNotifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  }, []);

  // Delete notification
  const deleteNotification = useCallback((id: string) => {
    setState(prev => {
      const notification = prev.queuedNotifications.find(n => n.id === id);
      return {
        ...prev,
        queuedNotifications: prev.queuedNotifications.filter(n => n.id !== id),
        unreadCount: notification && !notification.read 
          ? Math.max(0, prev.unreadCount - 1) 
          : prev.unreadCount,
      };
    });
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      queuedNotifications: [],
      unreadCount: 0,
    }));
  }, []);

  return {
    isTabVisible: state.isTabVisible,
    notifications: state.queuedNotifications,
    unreadCount: state.unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
