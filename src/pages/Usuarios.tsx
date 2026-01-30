import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaUserShield } from 'react-icons/fa';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { showSuccess, showError } from '../utils/toast';
import { db } from '../services/database';
import type { User } from '../services/database';

const AVAILABLE_PERMISSIONS = [
    { id: 'dashboard', label: 'Visão Geral' },
    { id: 'agenda', label: 'Agenda (inclui Discursos e Histórico)' },
    { id: 'campo', label: 'Campo' },
    { id: 'congregacoes', label: 'Congregações' },
    { id: 'escola', label: 'Escola' },
    { id: 'indicador', label: 'Indicador (Designações)' },
    { id: 'relatorios', label: 'Relatórios' },
    { id: 'dados', label: 'Dados (Exportação/Importação)' },
];

const ROLE_LABELS: Record<User['role'], string> = {
    'ADMIN': 'Administrador',
    'USER': 'Usuário'
};

export const Usuarios: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        username: '',
        name: '',
        password: '',
        role: 'USER' as User['role'],
        permissions: [] as string[]
    });

    const loadUsers = () => {
        setUsers(db.getUsers());
    };

    useEffect(() => {
        Promise.resolve().then(() => loadUsers());
    }, []);

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                name: user.name,
                password: '', // Não mostrar senha existente
                role: user.role,
                permissions: user.permissions || []
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: '',
                name: '',
                password: '',
                role: 'USER',
                permissions: []
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingUser(null);
    };

    const handleTogglePermission = (path: string) => {
        setFormData(prev => {
            const newPermissions = prev.permissions.includes(path)
                ? prev.permissions.filter(p => p !== path)
                : [...prev.permissions, path];
            return { ...prev, permissions: newPermissions };
        });
    };

    const handleSave = () => {
        if (!formData.username || !formData.name) {
            showError('Usuário e Nome são obrigatórios');
            return;
        }

        if (!editingUser && !formData.password) {
            showError('Senha é obrigatória para novos usuários');
            return;
        }

        const userData = {
            username: formData.username,
            name: formData.name,
            role: formData.role,
            permissions: formData.permissions,
            password: formData.password || (editingUser ? editingUser.password : '')
        };

        if (editingUser) {
            db.updateUser(editingUser.id, userData);
            showSuccess('Usuário atualizado com sucesso!');
        } else {
            db.addUser(userData);
            showSuccess('Usuário criado com sucesso!');
        }

        handleCloseModal();
        loadUsers();
    };

    const handleDelete = (id: string) => {
        setDeletingUserId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        if (deletingUserId) {
            db.deleteUser(deletingUserId);
            showSuccess('Usuário excluído com sucesso!');
            setShowDeleteConfirm(false);
            setDeletingUserId(null);
            loadUsers();
        }
    };

    return (
        <div className="container-fluid p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><FaUserShield /> Gerenciamento de Usuários</h2>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <FaPlus /> Novo Usuário
                </button>
            </div>

            <div className="card">
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover">
                            <thead>
                                <tr>
                                    <th>Usuário</th>
                                    <th>Nome</th>
                                    <th>Função</th>
                                    <th>Permissões</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td><strong>{user.username}</strong></td>
                                        <td>{user.name}</td>
                                        <td>
                                            <span className={`badge ${user.role === 'ADMIN' ? 'bg-danger' : 'bg-info'}`}>
                                                {ROLE_LABELS[user.role]}
                                            </span>
                                        </td>
                                        <td>
                                            {user.role === 'ADMIN' ? (
                                                <span className="badge bg-success">Acesso Total</span>
                                            ) : (
                                                <div className="d-flex flex-wrap gap-1">
                                                    {user.permissions && user.permissions.map(p => {
                                                        const permission = AVAILABLE_PERMISSIONS.find(perm => perm.id === p);
                                                        return permission ? (
                                                            <span key={p} className="badge bg-secondary" style={{ fontSize: '0.7em' }}>
                                                                {permission.label}
                                                            </span>
                                                        ) : null;
                                                    })}
                                                    {(!user.permissions || user.permissions.length === 0) && (
                                                        <span className="text-muted small">Nenhuma permissão</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="btn-group">
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => handleOpenModal(user)}
                                                    title="Editar"
                                                >
                                                    <FaEdit />
                                                </button>
                                                {user.username !== 'admin' && (
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleDelete(user.id)}
                                                        title="Excluir"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                size="lg"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={handleCloseModal}>
                            Cancelar
                        </button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            {editingUser ? 'Atualizar' : 'Salvar'}
                        </button>
                    </>
                }
            >
                <div className="row g-3">
                    <div className="col-md-6">
                        <label className="form-label">Usuário (Login) *</label>
                        <input
                            type="text"
                            className="form-control"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                            placeholder="ex: joao.silva"
                            disabled={!!editingUser}
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Nome *</label>
                        <input
                            type="text"
                            className="form-control"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">
                            {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
                        </label>
                        <input
                            type="password"
                            className="form-control"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Função</label>
                        <select
                            className="form-select"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                        >
                            <option value="USER">Usuário</option>
                            <option value="ADMIN">Administrador</option>
                        </select>
                    </div>

                    {formData.role !== 'ADMIN' && (
                        <div className="col-12">
                            <label className="form-label">Permissões de Acesso</label>
                            <div className="card p-3">
                                <div className="row">
                                    {AVAILABLE_PERMISSIONS.map(permission => (
                                        <div key={permission.id} className="col-md-6 mb-2">
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id={`perm-${permission.id}`}
                                                    checked={formData.permissions.includes(permission.id)}
                                                    onChange={() => handleTogglePermission(permission.id)}
                                                />
                                                <label className="form-check-label" htmlFor={`perm-${permission.id}`}>
                                                    {permission.label}
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="form-text">
                                Selecione as páginas que este usuário poderá acessar.
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Excluir Usuário"
                message="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmText="Excluir"
                variant="danger"
            />
        </div>
    );
};
