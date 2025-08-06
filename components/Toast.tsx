
import React, { useEffect } from 'react';
import { CloseIcon, CheckCircleIcon, InfoCircleIcon, WarningTriangleIcon, XCircleIcon } from './icons';
import type { ToastMessage } from '../types';

const toastConfig = {
    success: {
        icon: <CheckCircleIcon className="w-6 h-6 text-white" />,
        bgColor: 'bg-green-500 dark:bg-green-600',
    },
    info: { 
        icon: <InfoCircleIcon className="w-6 h-6 text-white" />, 
        bgColor: 'bg-blue-500 dark:bg-blue-600' 
    },
    warning: { 
        icon: <WarningTriangleIcon className="w-6 h-6 text-white" />, 
        bgColor: 'bg-yellow-400 dark:bg-yellow-500' 
    },
    error: { 
        icon: <XCircleIcon className="w-6 h-6 text-white" />,
        bgColor: 'bg-red-500 dark:bg-red-600' 
    },
};


interface ToastProps {
  message: ToastMessage;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
    const { type, message: text, id } = message;

    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(id);
        }, 5000);

        return () => clearTimeout(timer);
    }, [id, onDismiss]);

    const config = toastConfig[type];

    return (
        <div role="alert" className="animate-fade-in-right flex w-full max-w-md overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5">
            <div className={`flex items-center justify-center p-4 ${config.bgColor}`}>
                {config.icon}
            </div>
            <div className="flex w-full items-start justify-between gap-4 p-4">
                <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">{text}</p>
                <button onClick={() => onDismiss(id)} aria-label="Close" className="flex-shrink-0 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
                    <CloseIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};


interface ToastContainerProps {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
    return (
        <div aria-live="assertive" className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50">
            <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast}
                        onDismiss={onDismiss}
                    />
                ))}
            </div>
        </div>
    );
};
