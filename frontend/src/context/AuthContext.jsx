import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('smartcity_token'));
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.auth.getMe();
        setUser(data.user);
        setRole(data.role);
        fetchNotifications();
      } catch (err) {
        console.error('Session expired or invalid token:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const data = await api.notifications.get();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markNotificationRead = async (id = null) => {
    try {
      await api.notifications.markRead(id);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const login = async (username, password) => {
    const data = await api.auth.login({ username, password });
    localStorage.setItem('smartcity_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setRole(data.role);
    fetchNotifications();
    return data;
  };

  const logout = async () => {
    try {
      if (token) {
        await api.auth.logout().catch(() => {});
      }
    } finally {
      localStorage.removeItem('smartcity_token');
      setToken(null);
      setUser(null);
      setRole(null);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const updateProfile = async (formData) => {
    const updated = await api.auth.updateProfile(formData);
    setUser(updated);
    return updated;
  };

  const value = {
    user,
    role,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    logout,
    updateProfile,
    notifications,
    unreadCount,
    fetchNotifications,
    markNotificationRead,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
