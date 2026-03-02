import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api from '../services/api';

interface AuthContextType {
    isAuthenticated: boolean;
    user: any | null;
    token: string | null;
    login: (token: string, userData: any) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<any | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // PIN on Refresh: Strictly clear and do not load from localStorage
        localStorage.removeItem('zn_token');
        localStorage.removeItem('zn_user');
        setLoading(false);
    }, []);

    const login = (newToken: string, userData: any) => {
        // PIN on Refresh: Do not save to localStorage
        setToken(newToken);
        setUser(userData);
        setIsAuthenticated(true);
        // Important: Set on global axios and our instance
        const authHeader = `Bearer ${newToken}`;
        axios.defaults.headers.common['Authorization'] = authHeader;
        api.defaults.headers.common['Authorization'] = authHeader;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        delete axios.defaults.headers.common['Authorization'];
        delete api.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
