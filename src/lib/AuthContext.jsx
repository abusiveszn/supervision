import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { ADMIN_SESSION_KEY, verifyAdminCredentials } from '@/lib/auth-constants';
import { getRegisteredUsers } from '@/lib/user-registry';

const AuthContext = createContext();

const ACTIVE_SESSION_KEY = 'smartsupervise_user_session';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      // Clean up legacy admin session if present
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(ADMIN_SESSION_KEY);
      }

      // Check for active stored user session (student, supervisor, or admin)
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(ACTIVE_SESSION_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && (parsed.role || parsed.portal)) {
              setUser(parsed);
              setIsAuthenticated(true);
              setIsLoadingAuth(false);
              setIsLoadingPublicSettings(false);
              setAuthChecked(true);
              return;
            }
          } catch {
            window.localStorage.removeItem(ACTIVE_SESSION_KEY);
          }
        }
      }

      // Allow the public frontend to render before Base44 credentials are configured.
      if (!appParams.appId) {
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }
      
      // First, check app public settings (with token if available)
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token,
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Check active local user session first
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(ACTIVE_SESSION_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && (parsed.role || parsed.portal)) {
              setUser(parsed);
              setIsAuthenticated(true);
              setIsLoadingAuth(false);
              setAuthChecked(true);
              return;
            }
          } catch {
            window.localStorage.removeItem(ACTIVE_SESSION_KEY);
          }
        }
      }

      if (!appParams.appId) {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
        return;
      }

      // Check authentication via Base44
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const loginAsStudent = (studentData = {}) => {
    const existing = (getRegisteredUsers() || []).find(
      (u) => (u.email && studentData.email && u.email.toLowerCase() === studentData.email.toLowerCase()) ||
             (u.id && studentData.id && u.id === studentData.id)
    );
    const studentUser = {
      id: existing?.id || studentData.id || `student-${Date.now()}`,
      email: studentData.email || existing?.email,
      full_name: existing?.full_name || studentData.full_name || `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim() || studentData.email?.split('@')[0] || 'Student',
      first_name: existing?.first_name || studentData.first_name || studentData.full_name?.split(' ')[0] || 'Student',
      last_name: existing?.last_name || studentData.last_name || studentData.full_name?.split(' ').slice(1).join(' ') || '',
      role: 'student',
      portal: 'student',
      registration_number: existing?.registration_number || studentData.registration_number || studentData.matricNo || 'STU-001',
      department: existing?.department || studentData.department || 'Computer Science',
      department_id: existing?.department_id || studentData.department_id || 'Computer Science',
    };
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(studentUser));
    }
    setUser(studentUser);
    setIsAuthenticated(true);
    setIsLoadingAuth(false);
    setAuthChecked(true);
    setAuthError(null);
    return studentUser;
  };

  const loginAsSupervisor = (supervisorData = {}) => {
    const existing = (getRegisteredUsers() || []).find(
      (u) => (u.email && supervisorData.email && u.email.toLowerCase() === supervisorData.email.toLowerCase()) ||
             (u.id && supervisorData.id && u.id === supervisorData.id)
    );
    const supervisorUser = {
      id: existing?.id || supervisorData.id || `supervisor-${Date.now()}`,
      email: supervisorData.email || existing?.email,
      full_name: existing?.full_name || supervisorData.full_name || `${supervisorData.first_name || ''} ${supervisorData.last_name || ''}`.trim() || supervisorData.email?.split('@')[0] || 'Supervisor',
      first_name: existing?.first_name || supervisorData.first_name || supervisorData.full_name?.split(' ')[0] || 'Supervisor',
      last_name: existing?.last_name || supervisorData.last_name || supervisorData.full_name?.split(' ').slice(1).join(' ') || '',
      role: 'supervisor',
      portal: 'supervisor',
      staff_id: existing?.staff_id || supervisorData.staff_id || 'SUP-001',
      department: existing?.department || supervisorData.department || 'Computer Science',
      department_id: existing?.department_id || supervisorData.department_id || 'Computer Science',
      level: existing?.level || supervisorData.level || 'Faculty Member',
    };
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(supervisorUser));
    }
    setUser(supervisorUser);
    setIsAuthenticated(true);
    setIsLoadingAuth(false);
    setAuthChecked(true);
    setAuthError(null);
    return supervisorUser;
  };

  const loginAsAdmin = (email, password) => {
    const adminUser = verifyAdminCredentials(email, password);
    if (!adminUser) {
      throw new Error('Invalid administrator email or password');
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(adminUser));
    }
    setUser(adminUser);
    setIsAuthenticated(true);
    setIsLoadingAuth(false);
    setAuthChecked(true);
    setAuthError(null);
    return adminUser;
  };

  const logout = (shouldRedirect = true) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(ACTIVE_SESSION_KEY);
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      window.localStorage.removeItem('base44_access_token');
      window.localStorage.removeItem('token');
      try {
        window.sessionStorage.clear();
      } catch { /* ignore */ }
    }
    setUser(null);
    setIsAuthenticated(false);
    
    // Clear any Base44 in-memory auth header without triggering platform redirect
    try {
      if (base44?.auth?.setToken) {
        base44.auth.setToken('', false);
      }
    } catch { /* ignore */ }
    
    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      loginAsStudent,
      loginAsSupervisor,
      loginAsAdmin,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
