'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getMe,
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
} from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await getMe();
      const nextUser = data && data.user ? data.user : data;
      if (!mountedRef.current) return null;
      if (nextUser && nextUser.id) {
        setUser(nextUser);
        setStatus('authenticated');
        return nextUser;
      }
      setUser(null);
      setStatus('anonymous');
      return null;
    } catch (err) {
      // 401 simply means nobody is signed in; network/API failures should not
      // trap the UI in a permanent loading state either.
      if (!mountedRef.current) return null;
      setUser(null);
      setStatus('anonymous');
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMe();
        if (cancelled || !mountedRef.current) return;
        const nextUser = data && data.user ? data.user : data;
        if (nextUser && nextUser.id) {
          setUser(nextUser);
          setStatus('authenticated');
        } else {
          setUser(null);
          setStatus('anonymous');
        }
      } catch (err) {
        if (cancelled || !mountedRef.current) return;
        setUser(null);
        setStatus('anonymous');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await apiLogin(credentials);
    const nextUser = data && data.user ? data.user : data;
    if (mountedRef.current) {
      if (nextUser && nextUser.id) {
        setUser(nextUser);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('anonymous');
      }
    }
    return nextUser;
  }, []);

  const signup = useCallback(async (payload) => {
    const data = await apiSignup(payload);
    const nextUser = data && data.user ? data.user : data;
    if (mountedRef.current) {
      if (nextUser && nextUser.id) {
        setUser(nextUser);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('anonymous');
      }
    }
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {
      // Even if the API is unreachable we drop the local session state so the
      // interface reflects the user's intent.
    } finally {
      if (mountedRef.current) {
        setUser(null);
        setStatus('anonymous');
      }
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, signup, logout, refresh }),
    [user, status, login, signup, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return ctx;
}

export default AuthContext;