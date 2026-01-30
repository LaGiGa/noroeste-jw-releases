import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    footer
}) => {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'modal-sm',
        md: '',
        lg: 'modal-lg',
        xl: 'modal-xl'
    };

    return (
        <>
            <div className="modal show d-block" tabIndex={-1}>
                <div className={`modal-dialog ${sizeClasses[size]} modal-dialog-centered`}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{title}</h5>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={onClose}
                                aria-label="Close"
                            ></button>
                        </div>
                        <div className="modal-body">
                            {children}
                        </div>
                        {footer && (
                            <div className="modal-footer">
                                {footer}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="modal-backdrop show" onClick={onClose}></div>
        </>
    );
};
