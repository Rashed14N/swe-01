import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NotificationItem } from '../types';
import { useAuth } from './AuthContext';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  toasts: ToastMessage[];
  addToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  removeToast: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!token || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Gracefully handle transient network or polling errors during dev server restarts
    }
  }, [token, user]);

  useEffect(() => {
    // Disabled background polling as notifications are turned off
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const addToast = (type: 'success' | 'error' | 'info' | 'warning', title: any, message?: any) => {
    let safeTitle = 'Notification';
    if (typeof title === 'string') {
      safeTitle = title;
    } else if (title && typeof title === 'object') {
      safeTitle = title.message || title.error || title.code || (typeof title.toString === 'function' && title.toString() !== '[object Object]' ? title.toString() : JSON.stringify(title));
    } else if (title !== undefined && title !== null) {
      safeTitle = String(title);
    }

    let safeMessage: string | undefined = undefined;
    if (typeof message === 'string') {
      safeMessage = message;
    } else if (message && typeof message === 'object') {
      safeMessage = message.message || message.error || JSON.stringify(message);
    } else if (message !== undefined && message !== null) {
      safeMessage = String(message);
    }

    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title: safeTitle, message: safeMessage }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        addToast,
        removeToast,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
