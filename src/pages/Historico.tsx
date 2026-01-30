import React, { useState, useEffect } from 'react';
import { FaFilter, FaFilePdf, FaBuilding, FaEdit, FaTrash, FaSave } from 'react-icons/fa';
import { exportAgendaPDF } from '../services/pdfExport';
import { showSuccess, showError } from '../utils/toast';
import { db } from '../services/database';
import { Modal } from '../components/ui/Modal';
import type { HistoryItem, Congregation } from '../services/database';

export const Historico: React.FC = () => {
    const [historico, setHistorico] = useState<HistoryItem[]>([]);
    const [congregacoesCadastradas, setCongregacoesCadastradas] = useState<Congregation[]>([]);

    // Carregar dados do banco
    useEffect(() => {
        Promise.resolve().then(() => {
            setHistorico(db.getHistory());
            setCongregacoesCadastradas(db.getCongregations());
        });
    }, []);

    const [filters, setFilters] = useState({
        congregacao: '',
        orador: '',
        discurso: '',
        dataInicio: '',
        dataFim: ''
    });

    const [showFilters, setShowFilters] = useState(true);

    // Extrair listas únicas para os filtros
    const congregacoes = Array.from(new Set(historico.map(h => h.congregation))).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    const oradores = Array.from(new Set(historico.map(h => h.speakerName))).sort();
    // Criar lista de discursos formatada "Numero - Tema"
    const discursos = Array.from(new Set(historico.map(h => `${h.speechNumber} - ${h.speechTheme}`))).sort((a, b) => {
        const numA = parseInt(a.split(' - ')[0]);
        const numB = parseInt(b.split(' - ')[0]);
        return numA - numB;
    });

    const getCongLabel = (name: string): string => {
        const c = congregacoesCadastradas.find(x => x.name === name);
        const loc = c?.city || c?.address;
        return loc ? `${name} - ${loc}` : name;
    };

    const [editingItem, setEditingItem] = useState<HistoryItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleEdit = (item: HistoryItem) => {
        setEditingItem({ ...item });
        setIsEditModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este registro?')) {
            try {
                db.deleteHistoryItem(id);
                setHistorico(prev => prev.filter(item => item.id !== id));
                showSuccess('Registro excluído com sucesso!');
            } catch (error) {
                showError('Erro ao excluir registro.');
                console.error(error);
            }
        }
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;

        try {
            db.updateHistoryItem(editingItem.id, editingItem);
            setHistorico(prev => prev.map(item => 
                item.id === editingItem.id ? editingItem : item
            ));
            setIsEditModalOpen(false);
            setEditingItem(null);
            showSuccess('Registro atualizado com sucesso!');
        } catch (error) {
            showError('Erro ao atualizar registro.');
            console.error(error);
        }
    };

    const handleFilterChange = (field: string, value: string) => {
        setFilters({ ...filters, [field]: value });
    };

    const clearFilters = () => {
        setFilters({
            congregacao: '',
            orador: '',
            discurso: '',
            dataInicio: '',
            dataFim: ''
        });
    };

    const filteredHistorico = historico.filter(item => {
        if (filters.congregacao && item.congregation !== filters.congregacao) {
            return false;
        }
        if (filters.orador && item.speakerName !== filters.orador) {
            return false;
        }
        if (filters.discurso) {
            const [num] = filters.discurso.split(' - ');
            if (item.speechNumber !== parseInt(num)) {
                return false;
            }
        }
        if (filters.dataInicio && item.date < filters.dataInicio) {
            return false;
        }
        if (filters.dataFim && item.date > filters.dataFim) {
            return false;
        }
        return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleExportPDF = () => {
        const dataForExport = filteredHistorico.map(item => ({
            data: item.date,
            horario: '09:30', // Horário padrão ou adicionar ao HistoryItem se necessário
            tema: item.speechTheme,
            orador: item.speakerName,
            congregacao: item.congregation
        }));

        const periodo = filters.dataInicio && filters.dataFim
            ? `${new Date(filters.dataInicio).toLocaleDateString('pt-BR')} a ${new Date(filters.dataFim).toLocaleDateString('pt-BR')}`
            : 'Histórico Completo';

        exportAgendaPDF(dataForExport, periodo);
        showSuccess('Histórico exportado em PDF com sucesso!');
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">Histórico</h2>
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <FaFilter /> {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleExportPDF}
                        disabled={filteredHistorico.length === 0}
                    >
                        <FaFilePdf /> Exportar PDF ({filteredHistorico.length})
                    </button>
                </div>
            </div>

            {/* Filtros */}
            {showFilters && (
                <div className="card mb-4">
                    <div className="card-header bg-white">
                        <h6 className="mb-0">Filtros</h6>
                    </div>
                    <div className="card-body">
                        <div className="row g-3">
                            <div className="col-md-3">
                                <label className="form-label small">
                                    <FaBuilding className="me-1" />
                                    Congregação
                                </label>
                                <select
                                    className="form-select"
                                    value={filters.congregacao}
                                    onChange={(e) => handleFilterChange('congregacao', e.target.value)}
                                >
                                    <option value="">Todas</option>
                                    {congregacoes.map((cong, idx) => (
                                        <option key={idx} value={cong}>{getCongLabel(cong)}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-3">
                                <label className="form-label small">Orador</label>
                                <select
                                    className="form-select"
                                    value={filters.orador}
                                    onChange={(e) => handleFilterChange('orador', e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    {oradores.map((orador, idx) => (
                                        <option key={idx} value={orador}>{orador}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-6">
                                <label className="form-label small">Discurso</label>
                                <select
                                    className="form-select"
                                    value={filters.discurso}
                                    onChange={(e) => handleFilterChange('discurso', e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    {discursos.map((disc, idx) => (
                                        <option key={idx} value={disc}>{disc}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-3">
                                <label className="form-label small">Data Início</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={filters.dataInicio}
                                    onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label small">Data Fim</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={filters.dataFim}
                                    onChange={(e) => handleFilterChange('dataFim', e.target.value)}
                                />
                            </div>

                            <div className="col-md-6 d-flex align-items-end">
                                <button
                                    className="btn btn-outline-secondary w-100"
                                    onClick={clearFilters}
                                >
                                    Limpar Filtros
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Estatísticas */}
            <div className="row g-3 mb-4">
                <div className="col-md-3">
                    <div className="card">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <p className="text-muted mb-1 small">Total de Discursos</p>
                                    <h4 className="mb-0">{filteredHistorico.length}</h4>
                                </div>
                                <div className="p-2 bg-primary bg-opacity-10 rounded">
                                    <FaFilePdf className="text-primary" size={24} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-3">
                    <div className="card">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <p className="text-muted mb-1 small">Oradores Diferentes</p>
                                    <h4 className="mb-0">
                                        {new Set(filteredHistorico.map(h => h.speakerName)).size}
                                    </h4>
                                </div>
                                <div className="p-2 bg-success bg-opacity-10 rounded">
                                    <FaFilePdf className="text-success" size={24} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-3">
                    <div className="card">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <p className="text-muted mb-1 small">Congregações</p>
                                    <h4 className="mb-0">
                                        {new Set(filteredHistorico.map(h => h.congregation)).size}
                                    </h4>
                                </div>
                                <div className="p-2 bg-info bg-opacity-10 rounded">
                                    <FaFilePdf className="text-info" size={24} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-3">
                    <div className="card">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <p className="text-muted mb-1 small">Período</p>
                                    <h6 className="mb-0 small">
                                        {filteredHistorico.length > 0 ? (
                                            <>
                                                {new Date(filteredHistorico[filteredHistorico.length - 1].date).toLocaleDateString('pt-BR', { month: 'short' })} - {new Date(filteredHistorico[0].date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                                            </>
                                        ) : '-'}
                                    </h6>
                                </div>
                                <div className="p-2 bg-warning bg-opacity-10 rounded">
                                    <FaFilePdf className="text-warning" size={24} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="card">
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead className="table-header-gradient">
                                <tr>
                                    <th>Data</th>
                                    <th>Discurso</th>
                                    <th>Orador</th>
                                    <th>Congregação</th>
                                    <th style={{ width: '100px' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHistorico.map((item) => (
                                    <tr key={item.id}>
                                        <td>{new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td>{item.speechNumber} - {item.speechTheme}</td>
                                        <td>{item.speakerName}</td>
                                        <td>{getCongLabel(item.congregation)}</td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                <button
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => handleEdit(item)}
                                                    title="Editar"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => handleDelete(item.id)}
                                                    title="Excluir"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredHistorico.length === 0 && (
                        <p className="text-center text-muted mt-3 mb-0">
                            Nenhum registro encontrado com os filtros aplicados
                        </p>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Editar Histórico"
                footer={
                    <div className="d-flex justify-content-end gap-2">
                        <button
                            className="btn btn-secondary"
                            onClick={() => setIsEditModalOpen(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSaveEdit}
                        >
                            <FaSave className="me-2" />
                            Salvar
                        </button>
                    </div>
                }
            >
                {editingItem && (
                    <div className="row g-3">
                        <div className="col-md-6">
                            <label className="form-label">Data</label>
                            <input
                                type="date"
                                className="form-control"
                                value={editingItem.date}
                                onChange={(e) => setEditingItem({ ...editingItem, date: e.target.value })}
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Congregação</label>
                            <select
                                className="form-select"
                                value={editingItem.congregation}
                                onChange={(e) => setEditingItem({ ...editingItem, congregation: e.target.value })}
                            >
                                <option value="">Selecione...</option>
                                {congregacoesCadastradas.map((cong) => (
                                    <option key={cong.id} value={cong.name}>
                                        {cong.name} {cong.city ? `- ${cong.city}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-12">
                            <label className="form-label">Orador</label>
                            <input
                                type="text"
                                className="form-control"
                                value={editingItem.speakerName}
                                onChange={(e) => setEditingItem({ ...editingItem, speakerName: e.target.value })}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Número do Discurso</label>
                            <input
                                type="number"
                                className="form-control"
                                value={editingItem.speechNumber}
                                onChange={(e) => setEditingItem({ ...editingItem, speechNumber: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="col-md-9">
                            <label className="form-label">Tema do Discurso</label>
                            <input
                                type="text"
                                className="form-control"
                                value={editingItem.speechTheme}
                                onChange={(e) => setEditingItem({ ...editingItem, speechTheme: e.target.value })}
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
