'use client';
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storeUser = localStorage.getItem('user');
        const storeToken = localStorage.getItem('accessToken');

        if (storeToken && storeUser) {
            try {
                setUser(JSON.parse(storeUser));
                setToken(storeToken);
            } catch (err) {
                console.error("Failed to parse stored user", err);
            }
        }
        setLoading(false);
    }, []);

    const login = (userData, accessToken) => {
        setUser(userData);
        setToken(accessToken);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('accessToken', accessToken);
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
            toast.success('Logged out successfully');
        } catch (err) {
            console.error("Logout API error:", err);
        } finally {
            setUser(null);
            setToken(null);
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            router.push('/auth/login');
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
