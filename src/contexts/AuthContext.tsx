import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Company } from '@/types/taskflow';
import api from '@/lib/api';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock company for now (backend only handles Users)
const mockCompany: Company = {
  id: 'company-1',
  name: 'AI Group',
  createdAt: new Date('2024-01-01'),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = sessionStorage.getItem('taskflow_user');
      if (savedUser) {
        try {
          // Verify token validity or refresh user data here
          // For now, simpler local re-hydrate
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.user) {
            setUser(parsed.user);
            setCompany(mockCompany);
          }
        } catch (e) {
          console.error("Failed to parse user session", e);
          sessionStorage.removeItem('taskflow_user');
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, token } = response.data;

      // Store full object with token
      const sessionData = { user, token };
      sessionStorage.setItem('taskflow_user', JSON.stringify(sessionData));

      setUser(user);
      setCompany(mockCompany);
      toast.success('Logged in successfully');
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Login failed';
      toast.error(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setCompany(null);
    sessionStorage.removeItem('taskflow_user');
    toast.info('Logged out');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        isSuperAdmin: user?.role === 'super_admin',
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
