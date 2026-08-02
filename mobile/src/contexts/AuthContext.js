import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest } from '../api/auth.api';
import { deleteToken, getToken } from '../storage/tokenStorage';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    const setAuthenticatedUser = (userData) => {
        setUser(userData);
        setSession(userData ? { user: userData } : null);
    };

    const refreshUser = async () => {
        const data = await getCurrentUser();
        setAuthenticatedUser(data.user);
        return data.user;
    };

    const login = async (credentials) => {
        const data = await loginRequest(credentials);
        setAuthenticatedUser(data.user);
        return data;
    };

    const register = async (payload) => {
        const data = await registerRequest(payload);
        setAuthenticatedUser(data.user);
        return data;
    };

    const logout = async () => {
        await logoutRequest();
        setAuthenticatedUser(null);
    };

    useEffect(() => {
        let mounted = true;

        const restoreSession = async () => {
            try {
                const token = await getToken();

                if (!token) {
                    if (mounted) setAuthenticatedUser(null);
                    return;
                }

                const data = await getCurrentUser();
                if (mounted) setAuthenticatedUser(data.user);
            } catch (_error) {
                await deleteToken();
                if (mounted) setAuthenticatedUser(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        restoreSession();

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, session, loading, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
