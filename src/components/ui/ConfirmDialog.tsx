import React from 'react';
import { FaExclamationTriangle, FaInfoCircle, FaTrash } from 'react-icons/fa';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'warning'
}) => {
    if (!isOpen) return null;

    const icons = {
        danger: <FaTrash className="text-danger" size={48} />,
        warning: <FaExclamationTriangle className="text-warning" size={48} />,
        info: <FaInfoCircle className="text-info" size={48} />
    };

    const buttonClasses = {
        danger: 'btn-danger',
        warning: 'btn-warning',
        info: 'btn-primary'
    };

    return (
        <>
            <div className="modal show d-block" tabIndex={-1}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{title}</h5>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={onCancel}
                                aria-label="Close"
                            ></button>
                        </div>
                        <div className="modal-body text-center">
                            <div className="mb-3">
                                {icons[variant]}
                            </div>
                            <p className="mb-0">{message}</p>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onCancel}
                            >
                                {cancelText}
                            </button>
                            <button
                                type="button"
                                className={`btn ${buttonClasses[variant]}`}
                                onClick={onConfirm}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop show" onClick={onCancel}></div>
        </>
    );
};
