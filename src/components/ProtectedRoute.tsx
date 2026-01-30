import React from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../services/auth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredPermission?: string;
    adminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredPermission,
    adminOnly = false
}) => {
    if (!auth.isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    const currentUser = auth.getCurrentUser();

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // Se for apenas para admin
    if (adminOnly && currentUser.role !== 'ADMIN') {
        return <Navigate to="/" replace />;
    }

    // Se requer permissão específica
    if (requiredPermission && currentUser.role !== 'ADMIN') {
        if (!currentUser.permissions || !currentUser.permissions.includes(requiredPermission)) {
            return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};
