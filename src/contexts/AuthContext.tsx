import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthState, UserRole } from '../types';
import { validateCredentials, saveAuthToStorage, loadAuthFromStorage, clearAuthFromStorage } from '../utils/auth';

interface AuthContextType extends AuthState {
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load user from storage on mount
    useEffect(() => {
        const storedUser = loadAuthFromStorage();
        Promise.resolve().then(() => {
            if (storedUser) {
                setUser(storedUser);
                setIsAuthenticated(true);
            }
            setIsLoading(false);
        });
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        const validatedUser = validateCredentials(username, password);

        if (validatedUser) {
            setUser(validatedUser);
            setIsAuthenticated(true);
            saveAuthToStorage(validatedUser);
            return true;
        }

        return false;
    };

    const logout = () => {
        setUser(null);
        setIsAuthenticated(false);
        clearAuthFromStorage();
    };

    const hasRole = (roles: UserRole[]): boolean => {
        if (!user) return false;
        return roles.includes(user.role);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout, hasRole }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
