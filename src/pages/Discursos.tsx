import React, { useState, useMemo, useEffect } from 'react';
import { FaPlus, FaTrash, FaSearch, FaEdit, FaExclamationTriangle } from 'react-icons/fa';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { showSuccess, showError } from '../utils/toast';
import { db } from '../services/database';
import type { HistoryItem, Congregation, Speaker, Speech } from '../services/database';

export const Discursos: React.FC = () => {
    const [selectedDiscurso, setSelectedDiscurso] = useState<Speech | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [filterCongregacao, setFilterCongregacao] = useState<string>('todas');
    const [congregacoesCadastradas, setCongregacoesCadastradas] = useState<Congregation[]>([]);
    const [historico, setHistorico] = useState<HistoryItem[]>([]);
    const [dbSpeakers, setDbSpeakers] = useState<Speaker[]>([]);
    const [dbSpeeches, setDbSpeeches] = useState<Speech[]>([]);

    // Estados para o Modal de Discurso
    const [showSpeechModal, setShowSpeechModal] = useState(false);
    const [editingSpeech, setEditingSpeech] = useState<Speech | null>(null);
    const [speechFormData, setSpeechFormData] = useState({
        number: 0,
        theme: '',
        doNotUseUntil: ''
    });

    const [showDeleteSpeechConfirm, setShowDeleteSpeechConfirm] = useState(false);
    const [deletingSpeechId, setDeletingSpeechId] = useState<string | null>(null);

    // Estados para o filtro de discursos
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    const [formData, setFormData] = useState({
        orador: '',
        data: '',
        congregacao: ''
    });

    const getCategory = (tema: string): string => {
        const t = (tema || '').toLowerCase();
        if (t.includes('família') || t.includes('casamento') || t.includes('filhos') || t.includes('pais') || t.includes('marido') || t.includes('esposa')) return 'Família';
        if (t.includes('jovens') || t.includes('juventude')) return 'Jovens';
        if (t.includes('reino') || t.includes('futuro') || t.includes('fim') || t.includes('vida') || t.includes('terra') || t.includes('paraíso') || t.includes('morte') || t.includes('ressurreição') || t.includes('sobreviver') || t.includes('salvação')) return 'Reino/Futuro';
        if (t.includes('deus') || t.includes('jeová') || t.includes('jesus') || t.includes('bíblia') || t.includes('oração') || t.includes('fé') || t.includes('espírito') || t.includes('criação')) return 'Deus/Bíblia';
        if (t.includes('mundo') || t.includes('satanás') || t.includes('diabo') || t.includes('tentação') || t.includes('pecado') || t.includes('moral') || t.includes('honesto') || t.includes('limpo')) return 'Vida Cristã';
        return 'Outros';
    };

    const filteredDiscursos = useMemo(() => {
        return dbSpeeches.filter(d => {
            const matchesSearch =
                d.theme.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.number.toString().includes(searchTerm);

            const category = getCategory(d.theme);
            const matchesCategory = selectedCategory === 'Todos' ||
                (selectedCategory === 'Outros' ? category === 'Outros' : category.includes(selectedCategory));

            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, selectedCategory, dbSpeeches]);

    const loadData = () => {
        setCongregacoesCadastradas(db.getCongregations());
        setHistorico(db.getHistory());
        setDbSpeakers(db.getSpeakers());
        setDbSpeeches(db.getSpeeches());
    };

    useEffect(() => {
        loadData();
    }, []);

    const oradoresList = useMemo(() => {
        return dbSpeakers.map(s => s.name).sort();
    }, [dbSpeakers]);

    const historicoFiltrado = useMemo(() => {
        if (!selectedDiscurso) return [];
        return historico
            .filter(h => h.speechNumber === selectedDiscurso.number)
            .filter(h => filterCongregacao === 'todas' || h.congregation === filterCongregacao)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedDiscurso, historico, filterCongregacao]);

    const oradoresQualificados = useMemo(() => {
        if (!selectedDiscurso) return [];
        return dbSpeakers
            .filter(s => s.qualifiedSpeeches && s.qualifiedSpeeches.includes(selectedDiscurso.number))
            .map(s => s.name)
            .sort();
    }, [selectedDiscurso, dbSpeakers]);

    const handleSelectDiscurso = (id: string) => {
        const discurso = dbSpeeches.find(d => d.id === id);
        setSelectedDiscurso(discurso || null);
        setFormData({ orador: '', data: '', congregacao: '' });
        setFilterCongregacao('todas');
    };

    // Gerenciamento de Discursos
    const handleOpenSpeechModal = (speech?: Speech) => {
        if (speech) {
            setEditingSpeech(speech);
            setSpeechFormData({
                number: speech.number,
                theme: speech.theme,
                doNotUseUntil: speech.doNotUseUntil || ''
            });
        } else {
            setEditingSpeech(null);
            const nextNumber = dbSpeeches.length > 0 ? Math.max(...dbSpeeches.map(d => d.number)) + 1 : 1;
            setSpeechFormData({
                number: nextNumber,
                theme: '',
                doNotUseUntil: ''
            });
        }
        setShowSpeechModal(true);
    };

    const handleSaveSpeech = () => {
        if (!speechFormData.theme.trim()) {
            showError('O tema do discurso é obrigatório');
            return;
        }

        if (editingSpeech) {
            db.updateSpeech(editingSpeech.id, {
                number: speechFormData.number,
                theme: speechFormData.theme,
                doNotUseUntil: speechFormData.doNotUseUntil || undefined
            });
            showSuccess('Discurso atualizado com sucesso!');
        } else {
            db.addSpeech({
                number: speechFormData.number,
                theme: speechFormData.theme,
                doNotUseUntil: speechFormData.doNotUseUntil || undefined
            });
            showSuccess('Discurso adicionado com sucesso!');
        }
        setShowSpeechModal(false);
        loadData();
    };

    const handleDeleteSpeech = (id: string) => {
        setDeletingSpeechId(id);
        setShowDeleteSpeechConfirm(true);
    };

    const confirmDeleteSpeech = () => {
        if (deletingSpeechId) {
            db.deleteSpeech(deletingSpeechId);
            if (selectedDiscurso?.id === deletingSpeechId) {
                setSelectedDiscurso(null);
            }
            loadData();
            showSuccess('Discurso excluído com sucesso!');
        }
        setShowDeleteSpeechConfirm(false);
        setDeletingSpeechId(null);
    };

    // Gerenciamento de Histórico
    const handleAddHistorico = () => {
        if (!selectedDiscurso) return;
        if (!formData.orador.trim()) { showError('Selecione um orador'); return; }
        if (!formData.data) { showError('Data é obrigatória'); return; }

        db.addHistoryItem({
            date: formData.data,
            speechNumber: selectedDiscurso.number,
            speechTheme: selectedDiscurso.theme,
            speakerName: formData.orador,
            congregation: formData.congregacao || 'Noroeste'
        });

        loadData();
        setFormData({ orador: '', data: '', congregacao: '' });
        showSuccess('Apresentação registrada!');
    };

    const handleDeleteHistorico = (id: string) => {
        setDeletingId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteHistorico = () => {
        if (deletingId) {
            db.deleteHistoryItem(deletingId);
            loadData();
            showSuccess('Registro excluído!');
        }
        setShowDeleteConfirm(false);
        setDeletingId(null);
    };

    const isSpeechRestricted = (speech: Speech) => {
        if (!speech.doNotUseUntil) return false;
        return new Date(speech.doNotUseUntil) > new Date();
    };

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">Gestão de Discursos</h2>
                <button className="btn btn-primary" onClick={() => handleOpenSpeechModal()}>
                    <FaPlus className="me-2" /> Novo Esboço
                </button>
            </div>

            <div className="card mb-4 border-0 shadow-sm">
                <div className="card-body">
                    <div className="row g-3 mb-3">
                        <div className="col-md-8">
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0"><FaSearch className="text-muted" /></span>
                                <input
                                    type="text"
                                    className="form-control border-start-0"
                                    placeholder="Buscar por número ou tema..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-4">
                            <select className="form-select" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                                <option value="Todos">Todos os Assuntos</option>
                                <option value="Família">Família / Casamento</option>
                                <option value="Jovens">Jovens</option>
                                <option value="Reino">Reino / Futuro</option>
                                <option value="Deus">Deus / Bíblia</option>
                                <option value="Vida Cristã">Vida Cristã</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>
                    </div>

                    <div className="list-group overflow-auto custom-scrollbar" style={{ maxHeight: '350px' }}>
                        {filteredDiscursos.map(d => {
                            const restricted = isSpeechRestricted(d);
                            return (
                                <div
                                    key={d.id}
                                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3 ${selectedDiscurso?.id === d.id ? 'bg-primary bg-opacity-10 border-primary' : ''}`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleSelectDiscurso(d.id)}
                                >
                                    <div className="d-flex align-items-center gap-3">
                                        <span className={`badge rounded-pill ${selectedDiscurso?.id === d.id ? 'bg-primary' : 'bg-secondary'}`} style={{ width: '45px', fontSize: '1rem' }}>
                                            {d.number}
                                        </span>
                                        <div>
                                            <div className="fw-bold">{d.theme}</div>
                                            <div className="small text-muted">
                                                {getCategory(d.theme)}
                                                {restricted && (
                                                    <span className="ms-3 text-warning">
                                                        <FaExclamationTriangle className="me-1" />
                                                        Não usar até {new Date(d.doNotUseUntil! + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-sm btn-light text-primary" onClick={(e) => { e.stopPropagation(); handleOpenSpeechModal(d); }}>
                                            <FaEdit />
                                        </button>
                                        <button className="btn btn-sm btn-light text-danger" onClick={(e) => { e.stopPropagation(); handleDeleteSpeech(d.id); }}>
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {selectedDiscurso && (
                <div className="row g-4">
                    <div className="col-lg-4">
                        <div className="card h-100 border-0 shadow-sm">
                            <div className="card-header bg-white py-3">
                                <h5 className="mb-0">Detalhes do Esboço</h5>
                            </div>
                            <div className="card-body">
                                <div className="text-center mb-4">
                                    <div className="display-4 fw-bold text-primary mb-2">#{selectedDiscurso.number}</div>
                                    <h4 className="px-3">{selectedDiscurso.theme}</h4>
                                    <span className="badge bg-light text-dark border">{getCategory(selectedDiscurso.theme)}</span>
                                </div>
                                <hr />
                                <h6>Oradores Preparados:</h6>
                                <div className="d-flex flex-wrap gap-2 mt-2">
                                    {oradoresQualificados.length > 0 ? oradoresQualificados.map((name, i) => (
                                        <span key={i} className="badge bg-info-subtle text-info border border-info-subtle">{name}</span>
                                    )) : <span className="text-muted small">Nenhum orador logado com este tema.</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-8">
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">Registrar Apresentação</h5>
                            </div>
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold">Orador</label>
                                        <input list="oradores-list" className="form-control" value={formData.orador} onChange={e => setFormData({ ...formData, orador: e.target.value })} />
                                        <datalist id="oradores-list">{oradoresList.map((n, i) => <option key={i} value={n} />)}</datalist>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label small fw-bold">Data</label>
                                        <input type="date" className="form-control" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} />
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label small fw-bold">Congregação</label>
                                        <select className="form-select" value={formData.congregacao} onChange={e => setFormData({ ...formData, congregacao: e.target.value })}>
                                            <option value="">Selecione...</option>
                                            {congregacoesCadastradas.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button className="btn btn-primary mt-3 w-100" onClick={handleAddHistorico}>Registrar Localmente</button>
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">Histórico do Tema</h5>
                                <select className="form-select form-select-sm w-auto" value={filterCongregacao} onChange={e => setFilterCongregacao(e.target.value)}>
                                    <option value="todas">Todas as congregações</option>
                                    {congregacoesCadastradas.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-3">Data</th>
                                                <th>Orador</th>
                                                <th>Local</th>
                                                <th className="text-end pe-3">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historicoFiltrado.map(h => (
                                                <tr key={h.id}>
                                                    <td className="ps-3">{new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                                    <td>{h.speakerName}</td>
                                                    <td>{h.congregation}</td>
                                                    <td className="text-end pe-3">
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteHistorico(h.id)}><FaTrash /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {historicoFiltrado.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-muted">Sem registros para este tema.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Discurso */}
            <Modal
                isOpen={showSpeechModal}
                onClose={() => setShowSpeechModal(false)}
                title={editingSpeech ? "Editar Esboço" : "Novo Esboço"}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowSpeechModal(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleSaveSpeech}>Salvar</button>
                    </>
                }
            >
                <div className="mb-3">
                    <label className="form-label fw-bold">Número do Esboço</label>
                    <input type="number" className="form-control" value={speechFormData.number} onChange={e => setSpeechFormData({ ...speechFormData, number: parseInt(e.target.value) })} />
                </div>
                <div className="mb-3">
                    <label className="form-label fw-bold">Tema do Discurso</label>
                    <input type="text" className="form-control" value={speechFormData.theme} onChange={e => setSpeechFormData({ ...speechFormData, theme: e.target.value })} />
                </div>
                <div className="mb-3">
                    <label className="form-label fw-bold">Não usar até (Opcional)</label>
                    <input type="date" className="form-control" value={speechFormData.doNotUseUntil} onChange={e => setSpeechFormData({ ...speechFormData, doNotUseUntil: e.target.value })} />
                    <small className="text-muted">Aviso visual será exibido se a data for futura.</small>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Excluir Histórico"
                message="Deseja remover este registro de apresentação?"
                onConfirm={confirmDeleteHistorico}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmText="Excluir"
                variant="danger"
            />

            <ConfirmDialog
                isOpen={showDeleteSpeechConfirm}
                title="Excluir Esboço"
                message="Isso removerá o esboço do sistema. O histórico será mantido mas não estará vinculado a este item."
                onConfirm={confirmDeleteSpeech}
                onCancel={() => setShowDeleteSpeechConfirm(false)}
                confirmText="Excluir Definitivamente"
                variant="danger"
            />
        </div>
    );
};
