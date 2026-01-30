import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastProps extends Toast {
    onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ id, type, message, duration = 5000, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onClose(id), 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const icons = {
        success: <CheckCircle size={20} />,
        error: <AlertCircle size={20} />,
        info: <Info size={20} />,
        warning: <AlertTriangle size={20} />,
    };

    const styles = {
        success: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
        error: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
        info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
        warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
    };

    return (
        <div
            className={clsx(
                'flex items-center gap-3 p-4 rounded-lg border shadow-lg min-w-[300px] max-w-md transition-all',
                styles[type],
                isExiting ? 'animate-slide-out-right opacity-0' : 'animate-slide-in-right'
            )}
        >
            <div className="flex-shrink-0">{icons[type]}</div>
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button
                onClick={() => {
                    setIsExiting(true);
                    setTimeout(() => onClose(id), 300);
                }}
                className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
                <X size={16} />
            </button>
        </div>
    );
};

interface ToastContainerProps {
    toasts: Toast[];
    onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            <div className="flex flex-col gap-2 pointer-events-auto">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} {...toast} onClose={onClose} />
                ))}
            </div>
        </div>
    );
};

// Hook for using toasts
export const useToast = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = (type: ToastType, message: string, duration?: number) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, type, message, duration }]);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    return {
        toasts,
        addToast,
        removeToast,
        success: (message: string, duration?: number) => addToast('success', message, duration),
        error: (message: string, duration?: number) => addToast('error', message, duration),
        info: (message: string, duration?: number) => addToast('info', message, duration),
        warning: (message: string, duration?: number) => addToast('warning', message, duration),
    };
};
