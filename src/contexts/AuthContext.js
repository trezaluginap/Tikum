import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, login as apiLogin, logout as apiLogout, register as apiRegister } from '../api/auth.api';
import { deleteToken, getToken } from '../storage/tokenStorage';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (token) {
        const res = await getCurrentUser();
        const userData = res?.user || res?.data || res;
        setUser(userData);
        setSession({ token, user: userData });
      } else {
        setUser(null);
        setSession(null);
      }
    } catch (err) {
      console.log('[AuthContext] Session restore failed:', err?.message);
      await deleteToken();
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  const login = async (email, password) => {
    const res = await apiLogin({ email, password });
    const userData = res?.user || res?.data || res;
    const token = res?.token;
    setUser(userData);
    setSession({ token, user: userData });
    return res;
  };

  const register = async (payload) => {
    const res = await apiRegister(payload);
    const userData = res?.user || res?.data || res;
    const token = res?.token;
    setUser(userData);
    setSession({ token, user: userData });
    return res;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (e) {
      void e;
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        register,
        logout,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
