import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize from cached session to avoid flashing logout during network switch
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('paridhan_user');
      const token = localStorage.getItem('token');
      return token && saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
        localStorage.setItem('paridhan_user', JSON.stringify(res.user));
      } else {
        setUser(null);
        localStorage.removeItem('paridhan_user');
      }
    } catch (err) {
      // If server explicitly rejects credentials with 401/403, log out
      if (err.status === 401 || err.status === 403) {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('paridhan_user');
      } else {
        // If it's a network glitch, network switch, or 503, preserve cached user!
        const saved = localStorage.getItem('paridhan_user');
        if (saved) {
          try {
            setUser(JSON.parse(saved));
          } catch (_) {}
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.success) {
      if (res.token) {
        localStorage.setItem('token', res.token);
      }
      setUser(res.user);
      localStorage.setItem('paridhan_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (_) {}
    localStorage.removeItem('token');
    localStorage.removeItem('paridhan_user');
    setUser(null);
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
