import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye, FaFilePdf, FaList, FaBuilding } from 'react-icons/fa';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { exportOradoresPDF, exportOradoresAprovadosPDF } from '../services/pdfExport';
import { showSuccess, showError } from '../utils/toast';
import { DISCURSOS_COMPLETOS } from '../data/discursos';
import { db } from '../services/database';
import type { Speaker, Congregation } from '../services/database';

export const Oradores: React.FC = () => {
    const [oradores, setOradores] = useState<Speaker[]>([]);
    const [congregacoes, setCongregacoes] = useState<Congregation[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDiscursosModal, setShowDiscursosModal] = useState(false);
    const [showEditDiscursosModal, setShowEditDiscursosModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingOrador, setEditingOrador] = useState<Speaker | null>(null);
    const [viewingOrador, setViewingOrador] = useState<Speaker | null>(null);
    const [editingDiscursosOrador, setEditingDiscursosOrador] = useState<Speaker | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedDiscursos, setSelectedDiscursos] = useState<number[]>([]);
    const [formData, setFormData] = useState({
        nome: '',
        telefone: '',
        congregacao: '',
        aprovadoFora: false,
        discursos: [] as number[]
    });

    // Carregar dados do banco
    useEffect(() => {
        Promise.resolve().then(() => {
            setOradores(db.getSpeakers().sort((a, b) => a.name.localeCompare(b.name)));
            setCongregacoes(db.getCongregations());
        });
    }, []);

    const getCongLabel = (name: string): string => {
        const c = congregacoes.find(x => x.name === name);
        const loc = c?.city || c?.address;
        return loc ? `${name} - ${loc}` : name;
    };

    const handleOpenModal = (orador?: Speaker) => {
        if (orador) {
            setEditingOrador(orador);
            setFormData({
                nome: orador.name,
                telefone: orador.phone,
                congregacao: orador.congregation,
                aprovadoFora: !!orador.approvedForOutside,
                discursos: orador.qualifiedSpeeches
            });
        } else {
            setEditingOrador(null);
            setFormData({ nome: '', telefone: '', congregacao: '', aprovadoFora: false, discursos: [] });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingOrador(null);
        setFormData({ nome: '', telefone: '', congregacao: '', aprovadoFora: false, discursos: [] });
    };

    const handleSave = () => {
        if (!formData.nome.trim()) {
            showError('Nome não pode estar vazio');
            return;
        }

        if (!formData.congregacao.trim()) {
            showError('Congregação não pode estar vazia');
            return;
        }

        const oradorData = {
            name: formData.nome,
            phone: formData.telefone,
            congregation: formData.congregacao,
            approvedForOutside: formData.aprovadoFora,
            qualifiedSpeeches: editingOrador ? editingOrador.qualifiedSpeeches : [] // Manter discursos existentes se editando
        };

        if (editingOrador) {
            db.updateSpeaker(editingOrador.id, oradorData);
            showSuccess('Orador atualizado com sucesso!');
        } else {
            db.addSpeaker(oradorData);
            showSuccess('Orador criado com sucesso!');
        }

        setOradores(db.getSpeakers().sort((a, b) => a.name.localeCompare(b.name)));
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        setDeletingId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        if (deletingId) {
            db.deleteSpeaker(deletingId);
            setOradores(db.getSpeakers().sort((a, b) => a.name.localeCompare(b.name)));
            showSuccess('Orador excluído com sucesso!');
        }
        setShowDeleteConfirm(false);
        setDeletingId(null);
    };

    const handleViewDiscursos = (orador: Speaker) => {
        setViewingOrador(orador);
        setShowDiscursosModal(true);
    };

    const handleEditDiscursos = (orador: Speaker) => {
        setEditingDiscursosOrador(orador);
        setSelectedDiscursos([...orador.qualifiedSpeeches]);
        setShowEditDiscursosModal(true);
    };

    const handleToggleDiscurso = (numero: number) => {
        setSelectedDiscursos(prev =>
            prev.includes(numero)
                ? prev.filter(n => n !== numero)
                : [...prev, numero].sort((a, b) => a - b)
        );
    };

    const handleSaveDiscursos = () => {
        if (editingDiscursosOrador) {
            db.updateSpeaker(editingDiscursosOrador.id, {
                qualifiedSpeeches: selectedDiscursos
            });
            setOradores(db.getSpeakers().sort((a, b) => a.name.localeCompare(b.name)));
            showSuccess('Discursos atualizados com sucesso!');
            setShowEditDiscursosModal(false);
            setEditingDiscursosOrador(null);
            setSelectedDiscursos([]);
        }
    };

    const handleExportPDF = () => {
        const dataForPdf = oradores.map(o => ({
            nome: o.name,
            telefone: o.phone,
            congregacao: o.congregation
        }));
        exportOradoresPDF(dataForPdf);
        showSuccess('PDF exportado com sucesso!');
    };

    const handleExportAprovadosPDF = () => {
        const aprovados = oradores
            .filter(o => o.approvedForOutside)
            .map(o => ({
                id: o.id,
                nome: o.name,
                telefone: o.phone,
                congregacao: o.congregation,
                qualifiedSpeeches: o.qualifiedSpeeches
            }));

        if (aprovados.length === 0) {
            showError('Nenhum orador aprovado para discursos fora encontrado.');
            return;
        }

        exportOradoresAprovadosPDF(aprovados);
        showSuccess('Relatório de aprovados exportado com sucesso!');
    };

    const filteredOradores = oradores.filter(o =>
        o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.congregation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">Oradores</h2>
                <div className="d-flex gap-2">
                    <button className="btn btn-outline-success" onClick={handleExportAprovadosPDF} title="Relatório de oradores para outras congregações">
                        <FaFilePdf /> Relatório Aprovados
                    </button>
                    <button className="btn btn-outline-primary" onClick={handleExportPDF}>
                        <FaFilePdf /> Lista Geral
                    </button>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <FaPlus /> Novo Orador
                    </button>
                </div>
            </div>

            {/* Busca */}
            <div className="card mb-4">
                <div className="card-body">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar por nome ou congregação..."
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
                                    <th>Telefone</th>
                                    <th>Congregação</th>
                                    <th>Fora?</th>
                                    <th className="text-end">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOradores.map((orador) => (
                                    <tr key={orador.id}>
                                        <td>{orador.name}</td>
                                        <td>{orador.phone || '-'}</td>
                                        <td>{getCongLabel(orador.congregation)}</td>
                                        <td>
                                            {orador.approvedForOutside ? (
                                                <span className="badge bg-success">Aprovado</span>
                                            ) : (
                                                <span className="badge bg-secondary opacity-50">Não</span>
                                            )}
                                        </td>
                                        <td className="text-end">
                                            <button
                                                className="btn btn-sm btn-outline-info me-1"
                                                onClick={() => handleViewDiscursos(orador)}
                                                title="Ver discursos"
                                            >
                                                <FaEye />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-success me-1"
                                                onClick={() => handleEditDiscursos(orador)}
                                                title="Editar discursos preparados"
                                            >
                                                <FaList />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-primary me-1"
                                                onClick={() => handleOpenModal(orador)}
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => handleDelete(orador.id)}
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredOradores.length === 0 && (
                        <p className="text-center text-muted mt-3 mb-0">Nenhum orador encontrado</p>
                    )}
                </div>
            </div>

            {/* Modal Criar/Editar */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={editingOrador ? 'Editar Orador' : 'Novo Orador'}
                size="md"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={handleCloseModal}>
                            Cancelar
                        </button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            {editingOrador ? 'Atualizar' : 'Salvar'}
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
                        placeholder="Nome completo"
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Telefone</label>
                    <input
                        type="text"
                        className="form-control"
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        placeholder="(00) 00000-0000"
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">
                        <FaBuilding className="me-1" />
                        Congregação de Origem *
                    </label>
                    <select
                        className="form-select"
                        value={formData.congregacao}
                        onChange={(e) => setFormData({ ...formData, congregacao: e.target.value })}
                    >
                        <option value="">Selecione uma congregação</option>
                        {[...congregacoes].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })).map((cong) => (
                            <option key={cong.id} value={cong.name}>{getCongLabel(cong.name)}</option>
                        ))}
                    </select>
                </div>
                <div className="mb-3">
                    <div className="form-check form-switch mt-2">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="aprovadoFora"
                            checked={formData.aprovadoFora}
                            onChange={(e) => setFormData({ ...formData, aprovadoFora: e.target.checked })}
                        />
                        <label className="form-check-label" htmlFor="aprovadoFora">
                            Aprovado para fazer discursos fora
                        </label>
                    </div>
                </div>
            </Modal>

            {/* Modal Ver Discursos */}
            <Modal
                isOpen={showDiscursosModal}
                onClose={() => setShowDiscursosModal(false)}
                title={`Discursos - ${viewingOrador?.name}`}
                size="md"
                footer={
                    <button className="btn btn-secondary" onClick={() => setShowDiscursosModal(false)}>
                        Fechar
                    </button>
                }
            >
                {viewingOrador && (
                    <div>
                        <p className="mb-2">
                            <strong>Congregação:</strong> {getCongLabel(viewingOrador.congregation)}
                        </p>
                        <p className="mb-2">
                            <strong>Telefone:</strong> {viewingOrador.phone || '-'}
                        </p>
                        <p className="mb-3">
                            <strong>Status Fora:</strong> {viewingOrador.approvedForOutside ? 'Aprovado' : 'Não consta como aprovado'}
                        </p>
                        <h6>Discursos que pode apresentar:</h6>
                        {viewingOrador.qualifiedSpeeches.length > 0 ? (
                            <ul className="list-group">
                                {viewingOrador.qualifiedSpeeches.map(num => {
                                    const tema = DISCURSOS_COMPLETOS.find(d => d.numero === num)?.tema || '';
                                    return (
                                        <li key={num} className="list-group-item d-flex justify-content-between align-items-center">
                                            <span><strong>#{num}</strong> - {tema}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-muted">Nenhum discurso cadastrado</p>
                        )}
                    </div>
                )}
            </Modal>


            {/* Modal Editar Discursos */}
            <Modal
                isOpen={showEditDiscursosModal}
                onClose={() => setShowEditDiscursosModal(false)}
                title={`Editar Discursos - ${editingDiscursosOrador?.name}`}
                size="lg"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowEditDiscursosModal(false)}>
                            Cancelar
                        </button>
                        <button className="btn btn-primary" onClick={handleSaveDiscursos}>
                            Salvar ({selectedDiscursos.length} selecionados)
                        </button>
                    </>
                }
            >
                <div className="mb-3">
                    <p className="text-muted">
                        Selecione os discursos que {editingDiscursosOrador?.name} pode apresentar:
                    </p>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <div className="row">
                            {DISCURSOS_COMPLETOS.map(discurso => (
                                <div key={discurso.numero} className="col-md-6 mb-2">
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id={`discurso-${discurso.numero}`}
                                            checked={selectedDiscursos.includes(discurso.numero)}
                                            onChange={() => handleToggleDiscurso(discurso.numero)}
                                        />
                                        <label className="form-check-label" htmlFor={`discurso-${discurso.numero}`}>
                                            <strong>#{discurso.numero}</strong> - {discurso.tema}
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Excluir Orador"
                message="Tem certeza que deseja excluir este orador?"
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmText="Excluir"
                variant="danger"
            />
        </div>
    );
};
