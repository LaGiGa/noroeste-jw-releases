import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { showSuccess, showError } from '../utils/toast';
import { db } from '../services/database';
import type { Congregation } from '../services/database';

export const Congregacoes: React.FC = () => {
    const [congregacoes, setCongregacoes] = useState<Congregation[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingCongregacao, setEditingCongregacao] = useState<Congregation | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        nome: '',
        horario: '',
        cidade: ''
    });

    // Carregar congregações do banco
    useEffect(() => {
        Promise.resolve().then(() => setCongregacoes(db.getCongregations()));
    }, []);

    const handleOpenModal = (congregacao?: Congregation) => {
        if (congregacao) {
            setEditingCongregacao(congregacao);
            setFormData({
                nome: congregacao.name,
                horario: congregacao.meetingTime || '',
                cidade: congregacao.city || congregacao.address || '' // Fallback para address se city não existir
            });
        } else {
            setEditingCongregacao(null);
            setFormData({ nome: '', horario: '', cidade: '' });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCongregacao(null);
        setFormData({ nome: '', horario: '', cidade: '' });
    };

    const handleSave = () => {
        if (!formData.nome.trim()) {
            showError('Nome não pode estar vazio');
            return;
        }

        if (editingCongregacao) {
            db.updateCongregation(editingCongregacao.id, {
                name: formData.nome,
                meetingTime: formData.horario,
                city: formData.cidade,
                address: formData.cidade // Mantendo address sincronizado com cidade por enquanto
            });
            showSuccess('Congregação atualizada com sucesso!');
        } else {
            db.addCongregation({
                name: formData.nome,
                meetingTime: formData.horario,
                city: formData.cidade,
                address: formData.cidade
            });
            showSuccess('Congregação criada com sucesso!');
        }

        setCongregacoes(db.getCongregations());
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        setDeletingId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        if (deletingId) {
            db.deleteCongregation(deletingId);
            setCongregacoes(db.getCongregations());
            showSuccess('Congregação excluída com sucesso!');
        }
        setShowDeleteConfirm(false);
        setDeletingId(null);
    };

    const filteredCongregacoes = congregacoes.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.meetingTime || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.city || c.address || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">Congregações</h2>
                <div className="d-flex gap-2">
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <FaPlus /> Nova Congregação
                    </button>
                </div>
            </div>

            {/* Busca */}
            <div className="card mb-4">
                <div className="card-body">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar por nome, horário ou cidade..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabela */}
            <div className="card">
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead className="table-header-gradient">
                                <tr>
                                    <th>Nome</th>
                                    <th>Horário da Reunião</th>
                                    <th>Cidade</th>
                                    <th className="text-end">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...filteredCongregacoes].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })).map((cong) => (
                                    <tr key={cong.id}>
                                        <td>{cong.name}</td>
                                        <td>{cong.meetingTime}</td>
                                        <td>{cong.city || cong.address}</td>
                                        <td className="text-end">
                                            <button
                                                className="btn btn-sm btn-outline-primary me-1"
                                                onClick={() => handleOpenModal(cong)}
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => handleDelete(cong.id)}
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredCongregacoes.length === 0 && (
                        <p className="text-center text-muted mt-3 mb-0">Nenhuma congregação encontrada</p>
                    )}
                </div>
            </div>

            {/* Modal Criar/Editar */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={editingCongregacao ? 'Editar Congregação' : 'Nova Congregação'}
                size="md"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={handleCloseModal}>
                            Cancelar
                        </button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            {editingCongregacao ? 'Atualizar' : 'Salvar'}
                        </button>
                    </>
                }
            >
                <div className="mb-3">
                    <label className="form-label">Nome *</label>
                    <input
                        type="text"
                        className="form-control"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Nome da congregação"
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Horário da Reunião</label>
                    <input
                        type="text"
                        className="form-control"
                        value={formData.horario}
                        onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                        placeholder="Ex: Domingo, 09:30"
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Cidade *</label>
                    <input
                        type="text"
                        className="form-control"
                        value={formData.cidade}
                        onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                        placeholder="Nome da cidade"
                    />
                </div>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Excluir Congregação"
                message="Tem certeza que deseja excluir esta congregação?"
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmText="Excluir"
                variant="danger"
            />
        </div>
    );
};
