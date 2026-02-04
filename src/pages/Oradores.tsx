import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye, FaFilePdf, FaList, FaBuilding, FaCalendarCheck } from 'react-icons/fa';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { exportOradoresPDF, exportOradoresAprovadosPDF } from '../services/pdfExport';
import { showSuccess, showError } from '../utils/toast';
import { DISCURSOS_COMPLETOS } from '../data/discursos';
import { db } from '../services/database';
import type { Speaker, Congregation, Speech } from '../services/database';

export const Oradores: React.FC = () => {
    const [oradores, setOradores] = useState<Speaker[]>([]);
    const [congregacoes, setCongregacoes] = useState<Congregation[]>([]);
    const [dbSpeeches, setDbSpeeches] = useState<Speech[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDiscursosModal, setShowDiscursosModal] = useState(false);
    const [showEditDiscursosModal, setShowEditDiscursosModal] = useState(false);
    const [showEditEventosModal, setShowEditEventosModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingOrador, setEditingOrador] = useState<Speaker | null>(null);
    const [viewingOrador, setViewingOrador] = useState<Speaker | null>(null);
    const [editingDiscursosOrador, setEditingDiscursosOrador] = useState<Speaker | null>(null);
    const [editingEventosOrador, setEditingEventosOrador] = useState<Speaker | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedDiscursos, setSelectedDiscursos] = useState<number[]>([]);
    const [selectedAssignments, setSelectedAssignments] = useState<('ANFITRIAO' | 'CELEBRACAO' | 'DISCURSO_ESPECIAL' | 'OUTROS' | 'ASSEMBLEIA' | 'CONGRESSO')[]>([]);
    const [formData, setFormData] = useState({
        nome: '',
        telefone: '',
        congregacao: '',
        aprovadoFora: false,
        privilege: '' as 'A' | 'SM' | '',
        unavailablePeriods: [] as { startDate: string, endDate: string, reason?: string }[],
        discursos: [] as number[]
    });

    const [filterCongregacao, setFilterCongregacao] = useState('');
    const [filterAprovadoFora, setFilterAprovadoFora] = useState<boolean | null>(null);

    // Carregar dados do banco
    useEffect(() => {
        Promise.resolve().then(() => {
            setOradores(db.getSpeakers().sort((a, b) => a.name.localeCompare(b.name)));
            setCongregacoes(db.getCongregations());
            setDbSpeeches(db.getSpeeches());
        });
    }, []);

    // Combinar discursos padrão com discursos personalizados do banco
    const allDiscursos = React.useMemo(() => {
        // Converter discursos do banco para o formato esperado
        const customSpeeches = dbSpeeches.map(speech => ({
            numero: typeof speech.number === 'number' ? speech.number : speech.number,
            tema: speech.theme
        }));

        // Criar um Map para evitar duplicatas (prioriza discursos do banco)
        const discursosMap = new Map();

        // Adicionar discursos padrão primeiro
        DISCURSOS_COMPLETOS.forEach(d => {
            discursosMap.set(d.numero.toString(), d);
        });

        // Sobrescrever/adicionar discursos personalizados
        customSpeeches.forEach(d => {
            discursosMap.set(d.numero.toString(), d);
        });

        return Array.from(discursosMap.values()).sort((a, b) => {
            const numA = typeof a.numero === 'number' ? a.numero : parseInt(String(a.numero)) || 0;
            const numB = typeof b.numero === 'number' ? b.numero : parseInt(String(b.numero)) || 0;
            return numA - numB;
        });
    }, [dbSpeeches]);

    const getCongLabel = (name: string): string => {
        const c = congregacoes.find(x => x.name === name);
        const city = c?.city;
        return city ? `${name} - ${city}` : name;
    };

    const handleOpenModal = (orador?: Speaker) => {
        if (orador) {
            setEditingOrador(orador);
            setFormData({
                nome: orador.name,
                telefone: orador.phone,
                congregacao: orador.congregation,
                aprovadoFora: !!orador.approvedForOutside,
                privilege: orador.privilege || '',
                unavailablePeriods: orador.unavailablePeriods || [],
                discursos: orador.qualifiedSpeeches
            });
        } else {
            setEditingOrador(null);
            setFormData({
                nome: '',
                telefone: '',
                congregacao: '',
                aprovadoFora: false,
                privilege: '',
                unavailablePeriods: [],
                discursos: []
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingOrador(null);
        setFormData({
            nome: '',
            telefone: '',
            congregacao: '',
            aprovadoFora: false,
            privilege: '',
            unavailablePeriods: [],
            discursos: []
        });
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
            privilege: formData.privilege || undefined,
            unavailablePeriods: formData.unavailablePeriods,
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

    const handleEditAtribuicoes = (orador: Speaker) => {
        setEditingEventosOrador(orador);
        setSelectedAssignments([...(orador.specialAssignments || [])]);
        setShowEditEventosModal(true);
    };

    const handleToggleAssignment = (tipo: 'ANFITRIAO' | 'CELEBRACAO' | 'DISCURSO_ESPECIAL' | 'OUTROS' | 'ASSEMBLEIA' | 'CONGRESSO') => {
        setSelectedAssignments(prev =>
            prev.includes(tipo)
                ? prev.filter(t => t !== tipo)
                : [...prev, tipo]
        );
    };

    const handleSaveAssignments = () => {
        if (editingEventosOrador) {
            db.updateSpeaker(editingEventosOrador.id, {
                specialAssignments: selectedAssignments.length > 0 ? selectedAssignments : undefined
            });
            setOradores(db.getSpeakers().sort((a, b) => a.name.localeCompare(b.name)));
            showSuccess('Atribuições atualizadas com sucesso!');
            setShowEditEventosModal(false);
            setEditingEventosOrador(null);
            setSelectedAssignments([]);
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
            .filter(o => o.approvedForOutside && o.congregation === 'Noroeste')
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

    const filteredOradores = oradores.filter(o => {
        const matchesSearch = o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.congregation.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCong = !filterCongregacao || o.congregation === filterCongregacao;
        const matchesAprovado = filterAprovadoFora === null || o.approvedForOutside === filterAprovadoFora;

        return matchesSearch && matchesCong && matchesAprovado;
    });

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

            {/* Busca e Filtros */}
            <div className="card mb-4 border-0 shadow-sm">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-6">
                            <label className="form-label small fw-bold">Buscar</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Buscar por nome ou congregação..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small fw-bold">Congregação</label>
                            <select className="form-select" value={filterCongregacao} onChange={e => setFilterCongregacao(e.target.value)}>
                                <option value="">Todas</option>
                                {congregacoes.map(c => (
                                    <option key={c.id} value={c.name}>
                                        {c.name}{c.city ? ` - ${c.city}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small fw-bold">Discurso Fora?</label>
                            <select className="form-select" value={filterAprovadoFora === null ? '' : String(filterAprovadoFora)} onChange={e => setFilterAprovadoFora(e.target.value === '' ? null : e.target.value === 'true')}>
                                <option value="">Todos</option>
                                <option value="true">Apenas Aprovados</option>
                                <option value="false">Apenas Não Aprovados</option>
                            </select>
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
                                    <th>Nome / Privilégio</th>
                                    <th>Telefone</th>
                                    <th>Congregação</th>
                                    <th>Status</th>
                                    <th className="text-end">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOradores.map((orador) => (
                                    <tr key={orador.id}>
                                        <td>
                                            <div className="fw-bold">{orador.name}</div>
                                            {orador.privilege && (
                                                <span className={`badge ${orador.privilege === 'A' ? 'bg-primary' : 'bg-info'} x-small`}>
                                                    {orador.privilege === 'A' ? 'Ancião' : 'Servo Ministerial'}
                                                </span>
                                            )}
                                        </td>
                                        <td>{orador.phone || '-'}</td>
                                        <td>{getCongLabel(orador.congregation)}</td>
                                        <td>
                                            <div className="d-flex flex-column gap-1">
                                                {orador.approvedForOutside ? (
                                                    <span className="badge bg-success" style={{ width: 'fit-content' }}>Aprovado Fora</span>
                                                ) : (
                                                    <span className="badge bg-secondary opacity-50" style={{ width: 'fit-content' }}>Local</span>
                                                )}
                                                {orador.unavailablePeriods && orador.unavailablePeriods.some(p => {
                                                    const now = new Date();
                                                    return now >= new Date(p.startDate) && now <= new Date(p.endDate);
                                                }) && (
                                                        <span className="badge bg-danger" style={{ width: 'fit-content' }}>Indisponível Agora</span>
                                                    )}
                                            </div>
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
                                                className="btn btn-sm btn-outline-warning me-1"
                                                onClick={() => handleEditAtribuicoes(orador)}
                                                title="Editar atribuições especiais"
                                            >
                                                <FaCalendarCheck />
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
                <div className="row">
                    <div className="col-md-8 mb-3">
                        <label className="form-label fw-bold">Nome *</label>
                        <input
                            type="text"
                            className="form-control"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            placeholder="Nome completo"
                        />
                    </div>
                    <div className="col-md-4 mb-3">
                        <label className="form-label fw-bold">Privilégio</label>
                        <select className="form-select" value={formData.privilege} onChange={e => setFormData({ ...formData, privilege: e.target.value as any })}>
                            <option value="">Selecione...</option>
                            <option value="A">Ancião</option>
                            <option value="SM">Servo Ministerial</option>
                        </select>
                    </div>
                </div>
                <div className="row">
                    <div className="col-md-6 mb-3">
                        <label className="form-label fw-bold">Telefone</label>
                        <input
                            type="text"
                            className="form-control"
                            value={formData.telefone}
                            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                            placeholder="(00) 00000-0000"
                        />
                    </div>
                    <div className="col-md-6 mb-3">
                        <label className="form-label fw-bold">
                            <FaBuilding className="me-1" />
                            Congregação *
                        </label>
                        <select
                            className="form-select"
                            value={formData.congregacao}
                            onChange={(e) => setFormData({ ...formData, congregacao: e.target.value })}
                        >
                            <option value="">Selecione...</option>
                            {[...congregacoes].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })).map((cong) => (
                                <option key={cong.id} value={cong.name}>{getCongLabel(cong.name)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mb-4">
                    <div className="form-check form-switch p-3 bg-light rounded border">
                        <input
                            className="form-check-input ms-0 me-3"
                            type="checkbox"
                            id="aprovadoFora"
                            checked={formData.aprovadoFora}
                            onChange={(e) => setFormData({ ...formData, aprovadoFora: e.target.checked })}
                        />
                        <label className="form-check-label fw-bold" htmlFor="aprovadoFora">
                            Aprovado para fazer discursos fora
                        </label>
                    </div>
                </div>

                <div className="card mb-3 border-danger bg-danger bg-opacity-10">
                    <div className="card-header bg-danger text-white py-2">
                        <h6 className="mb-0 small fw-bold">Período de Indisponibilidade (ex: Férias)</h6>
                    </div>
                    <div className="card-body">
                        <div className="row g-2 align-items-end">
                            <div className="col-md-5">
                                <label className="form-label x-small fw-bold">Início</label>
                                <input type="date" className="form-control form-control-sm" id="unavail-start" />
                            </div>
                            <div className="col-md-5">
                                <label className="form-label x-small fw-bold">Fim</label>
                                <input type="date" className="form-control form-control-sm" id="unavail-end" />
                            </div>
                            <div className="col-md-2">
                                <button className="btn btn-sm btn-danger w-100" onClick={() => {
                                    const start = (document.getElementById('unavail-start') as HTMLInputElement).value;
                                    const end = (document.getElementById('unavail-end') as HTMLInputElement).value;
                                    if (start && end) {
                                        setFormData({
                                            ...formData,
                                            unavailablePeriods: [...formData.unavailablePeriods, { startDate: start, endDate: end }]
                                        });
                                        (document.getElementById('unavail-start') as HTMLInputElement).value = '';
                                        (document.getElementById('unavail-end') as HTMLInputElement).value = '';
                                    } else {
                                        showError('Selecione as datas de início e fim');
                                    }
                                }}>Add</button>
                            </div>
                        </div>

                        {formData.unavailablePeriods.length > 0 && (
                            <div className="mt-2">
                                {formData.unavailablePeriods.map((p, i) => (
                                    <div key={i} className="badge bg-white text-danger border border-danger d-flex justify-content-between align-items-center mb-1 p-2">
                                        <span>{new Date(p.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} - {new Date(p.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                        <button className="btn btn-sm btn-link text-danger p-0 ms-2" onClick={() => {
                                            const newPeriods = [...formData.unavailablePeriods];
                                            newPeriods.splice(i, 1);
                                            setFormData({ ...formData, unavailablePeriods: newPeriods });
                                        }}><FaTrash size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
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
                                    const tema = allDiscursos.find(d => d.numero.toString() === num.toString())?.tema || '';
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
                            {allDiscursos.map(discurso => (
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

            {/* Modal Editar Eventos Especiais */}
            <Modal
                isOpen={showEditEventosModal}
                onClose={() => setShowEditEventosModal(false)}
                title={`Atribuições - ${editingEventosOrador?.name}`}
                size="md"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowEditEventosModal(false)}>
                            Cancelar
                        </button>
                        <button className="btn btn-primary" onClick={handleSaveAssignments}>
                            Salvar
                        </button>
                    </>
                }
            >
                <div className="alert alert-info mb-3">
                    <small>
                        <FaCalendarCheck className="me-1" />
                        Selecione as atribuições que este orador está aprovado para realizar.
                    </small>
                </div>

                <div className="row">
                    <div className="col-md-6 mb-3">
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="attr-anfitrao"
                                checked={selectedAssignments.includes('ANFITRIAO')}
                                onChange={() => handleToggleAssignment('ANFITRIAO')}
                            />
                            <label className="form-check-label" htmlFor="attr-anfitrao">
                                <strong>Anfitrião</strong>
                                <div className="small text-muted">Aprovado para ser anfitrião</div>
                            </label>
                        </div>
                    </div>
                    <div className="col-md-6 mb-3">
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="attr-celebra"
                                checked={selectedAssignments.includes('CELEBRACAO')}
                                onChange={() => handleToggleAssignment('CELEBRACAO')}
                            />
                            <label className="form-check-label" htmlFor="attr-celebra">
                                <strong>Orador Celebração</strong>
                                <div className="small text-muted">Aprovado para o discurso da Celebração</div>
                            </label>
                        </div>
                    </div>
                    <div className="col-md-6 mb-3">
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="attr-especial"
                                checked={selectedAssignments.includes('DISCURSO_ESPECIAL')}
                                onChange={() => handleToggleAssignment('DISCURSO_ESPECIAL')}
                            />
                            <label className="form-check-label" htmlFor="attr-especial">
                                <strong>Orador Discurso Especial</strong>
                                <div className="small text-muted">Aprovado para Discursos Especiais</div>
                            </label>
                        </div>
                    </div>
                    <div className="col-md-6 mb-3">
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="attr-outros"
                                checked={selectedAssignments.includes('OUTROS')}
                                onChange={() => handleToggleAssignment('OUTROS')}
                            />
                            <label className="form-check-label" htmlFor="attr-outros">
                                <strong>Outros Eventos</strong>
                                <div className="small text-muted">Outros eventos especiais</div>
                            </label>
                        </div>
                    </div>
                </div>

                <hr />
                <h6 className="mb-3 small text-muted">Assembleias e Congressos (Legado)</h6>
                <div className="row">
                    <div className="col-md-6 mb-3">
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="attr-assem"
                                checked={selectedAssignments.includes('ASSEMBLEIA')}
                                onChange={() => handleToggleAssignment('ASSEMBLEIA')}
                            />
                            <label className="form-check-label" htmlFor="attr-assem">
                                <strong>Assembleia</strong>
                            </label>
                        </div>
                    </div>
                    <div className="col-md-6 mb-3">
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="attr-cong"
                                checked={selectedAssignments.includes('CONGRESSO')}
                                onChange={() => handleToggleAssignment('CONGRESSO')}
                            />
                            <label className="form-check-label" htmlFor="attr-cong">
                                <strong>Congresso</strong>
                            </label>
                        </div>
                    </div>
                </div>

                {selectedAssignments.length === 0 && (
                    <div className="alert alert-warning mb-0">
                        <small>Nenhuma atribuição especial selecionada.</small>
                    </div>
                )}
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
