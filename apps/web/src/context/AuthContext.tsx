import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, pass: string) => Promise<User>;
  register: (email: string, pass: string, role: UserRole, name?: string) => Promise<User>;
  continueAsGuest: () => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('resumeiq_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('resumeiq_token'));
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('resumeiq_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('resumeiq_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('resumeiq_token', token);
    } else {
      localStorage.removeItem('resumeiq_token');
    }
  }, [token]);

  const login = async (email: string, pass: string): Promise<User> => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error('Unable to reach the API server. Please ensure the backend is running on port 5000.');
      }
      if (!res.ok) throw new Error(data.error || 'Invalid email or password.');
      setUser(data.user);
      setToken(data.token);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string, role: UserRole, name?: string): Promise<User> => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, role, name })
      });
      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error('Unable to reach the API server. Please ensure the backend is running on port 5000.');
      }
      if (!res.ok) throw new Error(data.error || 'Registration failed.');
      setUser(data.user);
      setToken(data.token);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/guest', { method: 'POST' });
      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error('Unable to reach the API server. Please ensure the backend is running on port 5000.');
      }
      if (res.ok) {
        setUser(data.user);
        setToken(data.token);
      } else {
        throw new Error(data.error || 'Guest initialization failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('resumeiq_user');
    localStorage.removeItem('resumeiq_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, continueAsGuest, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
