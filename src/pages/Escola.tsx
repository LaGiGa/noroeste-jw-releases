import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaSearch, FaCalendarAlt, FaUserTie, FaChalkboardTeacher, FaBookOpen } from 'react-icons/fa';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { showSuccess, showError } from '../utils/toast';
import { ProgramaVidaMinisterio } from '../components/ProgramaVidaMinisterio';
import { PersonSelector } from '../components/PersonSelector';
import { db } from '../services/database';
import type { SchoolAssignment, Person } from '../services/database';
export const Escola: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'designacoes' | 'programa' | 'historico'>('designacoes');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [designacoes, setDesignacoes] = useState<SchoolAssignment[]>([]);
    const [pessoas, setPessoas] = useState<Person[]>([]);
    const [showDesignacaoModal, setShowDesignacaoModal] = useState(false);
    const [editingDesignacao, setEditingDesignacao] = useState<SchoolAssignment | null>(null);
    const [historyView, setHistoryView] = useState<'student' | 'date'>('student');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'upcoming' | 'all' | 'past'>('upcoming');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedHistoryItems, setExpandedHistoryItems] = useState<number[]>([]);

    const toggleHistoryItem = (index: number) => {
        setExpandedHistoryItems(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const [designacaoFormData, setDesignacaoFormData] = useState({
        data: '',
        estudante: '',
        ponto: '',
        sala: 'Principal' as 'Principal' | 'Sala B',
        ajudante: '',
        presidente: '',
        orador: '',
        leitorBiblia: '',
        condutor: '',
        condutorEstudoBiblico: '',
        leitorEstudoBiblico: ''
    });

    useEffect(() => {
        setDesignacoes(db.getSchoolAssignments());
        setPessoas(db.getPersons().sort((a, b) => a.name.localeCompare(b.name)));
    }, []);

    const getPersonName = (idOrName: string | undefined) => {
        if (!idOrName || idOrName === '0' || idOrName === '-') return '-';

        // 1. Tentar encontrar por ID interno (UUID)
        const personById = pessoas.find(p => p.id === idOrName);
        if (personById) return personById.name;

        // 2. Tentar encontrar por ID do KHS (se for um número salvo como nome)
        if (idOrName.match(/^\d+$/)) {
            const personByKhsId = pessoas.find(p => p.khsId === idOrName);
            if (personByKhsId) return personByKhsId.name;
        }

        // 3. Retornar o valor original se não encontrar
        return idOrName;
    };

    const handleOpenDesignacaoModal = (designacao?: SchoolAssignment) => {
        if (designacao) {
            setEditingDesignacao(designacao);
            setDesignacaoFormData({
                data: designacao.date,
                estudante: getPersonName(designacao.studentName),
                ponto: designacao.point,
                sala: designacao.room,
                ajudante: getPersonName(designacao.assistant) === '-' ? '' : getPersonName(designacao.assistant),
                presidente: designacao.president || '',
                orador: designacao.speaker || '',
                leitorBiblia: designacao.bibleReader || '',
                condutor: designacao.conductor || '',
                condutorEstudoBiblico: designacao.bibleStudyConductor || '',
                leitorEstudoBiblico: designacao.bibleStudyReader || ''
            });
        } else {
            setEditingDesignacao(null);
            setDesignacaoFormData({
                data: '',
                estudante: '',
                ponto: '',
                sala: 'Principal',
                ajudante: '',
                presidente: '',
                orador: '',
                leitorBiblia: '',
                condutor: '',
                condutorEstudoBiblico: '',
                leitorEstudoBiblico: ''
            });
        }
        setShowDesignacaoModal(true);
    };

    const handleSaveDesignacao = () => {
        if (!designacaoFormData.data || !designacaoFormData.estudante || !designacaoFormData.ponto) {
            showError('Preencha os campos obrigatórios');
            return;
        }

        const selectedStudent = pessoas.find(p => p.name === designacaoFormData.estudante);
        const studentId = selectedStudent ? selectedStudent.id : '';

        const assignmentData = {
            date: designacaoFormData.data,
            studentId,
            studentName: designacaoFormData.estudante,
            point: designacaoFormData.ponto,
            room: designacaoFormData.sala,
            assistant: designacaoFormData.ajudante,
            president: designacaoFormData.presidente,
            speaker: designacaoFormData.orador,
            bibleReader: designacaoFormData.leitorBiblia,
            conductor: designacaoFormData.condutor,
            bibleStudyConductor: designacaoFormData.condutorEstudoBiblico,
            bibleStudyReader: designacaoFormData.leitorEstudoBiblico
        };

        if (editingDesignacao) {
            db.updateSchoolAssignment(editingDesignacao.id, assignmentData);
            showSuccess('Atualizada!');
        } else {
            db.addSchoolAssignment(assignmentData);
            showSuccess('Criada!');
        }

        setDesignacoes(db.getSchoolAssignments());
        setShowDesignacaoModal(false);
    };

    const handleDelete = (id: string) => {
        setDeletingId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        if (deletingId) {
            db.deleteSchoolAssignment(deletingId);
            setDesignacoes(db.getSchoolAssignments());
            showSuccess('Excluída!');
        }
        setShowDeleteConfirm(false);
    };

    const pontos = [
        'Presidente',
        'Oração Inicial',
        'Oração Final',
        'Tesouros - Discurso',
        'Tesouros - Joias Espirituais',
        'Leitura da Bíblia',
        'Iniciando conversas',
        'Fazendo discípulos',
        'Cultivando o interesse',
        'Explicando suas crenças',
        'Discurso',
        'NVC - Parte 1',
        'NVC - Parte 2',
        'NVC - Necessidades Locais',
        'Estudo Bíblico de Congregação',
        'Leitor',
        'Oração'
    ];
    const availableYears = Array.from(new Set(designacoes.map(d => parseInt(d.date.split('-')[0])))).sort((a, b) => b - a);
    if (availableYears.length === 0) availableYears.push(new Date().getFullYear());

    // Allow viewing all years if selectedYear is -1 (Todos)
    const filteredDesignacoes = selectedYear === -1
        ? designacoes
        : designacoes.filter(d => parseInt(d.date.split('-')[0]) === selectedYear);

    const assignmentsByStudent = pessoas.map(p => ({
        estudante: p.name,
        // For student history, we show ALL assignments regardless of year filter, unless strictly desired.
        // But to follow the UI filter logic, let's respect filteredDesignacoes for now, 
        // OR better: The user wants "full history". Let's make Student View show ALL history always.
        assignments: designacoes // Use all designacoes for student view to show full history
            .filter(d => d.studentName === p.name || d.studentName === p.id)
            .sort((a, b) => b.date.localeCompare(a.date))
    })).filter(g => g.assignments.length > 0);

    const assignmentsByDate = Array.from(new Set(filteredDesignacoes.map(d => d.date)))
        .sort((a, b) => b.localeCompare(a))
        .map(date => ({
            date,
            assignments: filteredDesignacoes.filter(d => d.date === date)
        }));

    const today = new Date().toISOString().split('T')[0];

    const designacoesList = designacoes
        .filter(d => {
            // Filter by type
            if (filterType === 'upcoming' && d.date < today) return false;
            if (filterType === 'past' && d.date >= today) return false;

            // Filter by search
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const studentName = getPersonName(d.studentName).toLowerCase();
                const assistantName = getPersonName(d.assistant).toLowerCase();
                return studentName.includes(searchLower) || assistantName.includes(searchLower);
            }

            return true;
        })
        .sort((a, b) => {
            if (filterType === 'past') return b.date.localeCompare(a.date);
            return a.date.localeCompare(b.date);
        });

    const stats = {
        upcoming: designacoes.filter(d => d.date >= today).length,
        uniqueStudents: new Set(designacoes.map(d => d.studentName)).size,
        salaB: designacoes.filter(d => d.room === 'Sala B').length,
        total: designacoes.length
    };

    return (
        <div className="container-fluid pb-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">Nossa Vida e Ministério Cristão</h2>
                    <p className="text-muted small mb-0">Gerenciamento de designações</p>
                </div>
            </div>

            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button className={`nav-link ${activeTab === 'designacoes' ? 'active' : ''}`} onClick={() => setActiveTab('designacoes')}>
                        Designações
                    </button>
                </li>
                <li className="nav-item">
                    <button className={`nav-link ${activeTab === 'historico' ? 'active' : ''}`} onClick={() => setActiveTab('historico')}>
                        Histórico
                    </button>
                </li>
                <li className="nav-item">
                    <button className={`nav-link ${activeTab === 'programa' ? 'active' : ''}`} onClick={() => setActiveTab('programa')}>
                        Programa VM
                    </button>
                </li>
            </ul>

            {activeTab === 'designacoes' && (
                <div className="fade-in">
                    {/* Header & Stats */}
                    <div className="row g-4 mb-4">
                        <div className="col-md-8">
                            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #1e222d 0%, #2c3e50 100%)', color: 'white' }}>
                                <div className="card-body d-flex flex-column justify-content-center">
                                    <h4 className="fw-bold mb-1">Visão Geral</h4>
                                    <p className="mb-0 opacity-75">Gerencie as designações da escola</p>
                                    <div className="d-flex gap-4 mt-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="rounded-circle bg-white bg-opacity-25 p-2">
                                                <FaCalendarAlt />
                                            </div>
                                            <div>
                                                <div className="small opacity-75">Próximas</div>
                                                <div className="fw-bold fs-5">{stats.upcoming}</div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="rounded-circle bg-white bg-opacity-25 p-2">
                                                <FaUserTie />
                                            </div>
                                            <div>
                                                <div className="small opacity-75">Estudantes</div>
                                                <div className="fw-bold fs-5">{stats.uniqueStudents}</div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="rounded-circle bg-white bg-opacity-25 p-2">
                                                <FaChalkboardTeacher />
                                            </div>
                                            <div>
                                                <div className="small opacity-75">Sala B</div>
                                                <div className="fw-bold fs-5">{stats.salaB}</div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="rounded-circle bg-white bg-opacity-25 p-2">
                                                <FaChalkboardTeacher />
                                            </div>
                                            <div>
                                                <div className="small opacity-75">Total</div>
                                                <div className="fw-bold fs-5">{stats.total}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body d-flex flex-column justify-content-center align-items-center text-center">
                                    <button
                                        className="btn btn-primary btn-lg w-100 mb-2 shadow-lg"
                                        style={{ background: 'linear-gradient(45deg, #0d6efd, #0dcaf0)', border: 'none' }}
                                        onClick={() => handleOpenDesignacaoModal()}
                                    >
                                        <span className="d-flex align-items-center justify-content-center gap-2">
                                            <span className="fs-4">+</span> Nova Designação
                                        </span>
                                    </button>
                                    <small className="text-muted">Adicionar nova designação para a escola</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3 bg-body-tertiary p-3 rounded shadow-sm">
                        <div className="d-flex gap-2">
                            <button
                                className={`btn btn-sm rounded-pill px-3 ${filterType === 'upcoming' ? 'btn-info text-white fw-bold' : 'btn-outline-secondary'}`}
                                onClick={() => setFilterType('upcoming')}
                            >
                                Futuras
                            </button>
                            <button
                                className={`btn btn-sm rounded-pill px-3 ${filterType === 'all' ? 'btn-info text-white fw-bold' : 'btn-outline-secondary'}`}
                                onClick={() => setFilterType('all')}
                            >
                                Todas
                            </button>
                            <button
                                className={`btn btn-sm rounded-pill px-3 ${filterType === 'past' ? 'btn-info text-white fw-bold' : 'btn-outline-secondary'}`}
                                onClick={() => setFilterType('past')}
                            >
                                Passadas
                            </button>
                        </div>
                        <div className="input-group" style={{ maxWidth: '300px' }}>
                            <span className="input-group-text"><FaSearch /></span>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Buscar estudante..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Cards Grid */}
                    {designacoesList.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <FaChalkboardTeacher size={48} className="mb-3 opacity-25" />
                            <p>Nenhuma designação encontrada para este filtro.</p>
                        </div>
                    ) : (
                        <div className="row g-3">
                            {designacoesList.map(d => {
                                // const isFuture = d.date >= new Date().toISOString().split('T')[0];
                                const dateObj = new Date(d.date + 'T00:00:00');
                                const day = dateObj.getDate();
                                const month = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
                                const year = dateObj.getFullYear();
                                const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });

                                return (
                                    <div key={d.id} className="col-lg-6 col-xl-4">
                                        <div className="card h-100 border-0 shadow-sm position-relative overflow-hidden"
                                            style={{
                                                borderLeft: `4px solid ${d.room === 'Principal' ? '#0d6efd' : '#6c757d'}`,
                                                transition: 'transform 0.2s',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                            onClick={() => handleOpenDesignacaoModal(d)}
                                        >
                                            <div className="card-body p-3">
                                                <div className="d-flex gap-3">
                                                    {/* Date Box */}
                                                    <div className="d-flex flex-column align-items-center justify-content-center bg-secondary bg-opacity-10 rounded p-2 text-body border" style={{ minWidth: '70px', height: '85px' }}>
                                                        <span className="h4 mb-0 fw-bold">{day}</span>
                                                        <span className="small text-uppercase opacity-75" style={{ fontSize: '0.7rem' }}>{month}</span>
                                                        <span className="small opacity-50" style={{ fontSize: '0.65rem' }}>{year}</span>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                                            <span className="badge bg-secondary bg-opacity-25 text-body border border-secondary border-opacity-25">
                                                                {weekday}
                                                            </span>
                                                            <div className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                                <button
                                                                    className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center"
                                                                    style={{ width: '32px', height: '32px' }}
                                                                    onClick={() => handleOpenDesignacaoModal(d)}
                                                                    title="Editar"
                                                                >
                                                                    <FaEdit size={14} />
                                                                </button>
                                                                <button
                                                                    className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center"
                                                                    style={{ width: '32px', height: '32px' }}
                                                                    onClick={() => handleDelete(d.id)}
                                                                    title="Excluir"
                                                                >
                                                                    <FaTrash size={14} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <h6 className="fw-bold text-body mb-1 d-flex align-items-center gap-2">
                                                            <FaUserTie className="text-primary" size={14} />
                                                            {getPersonName(d.studentName)}
                                                        </h6>
                                                        {d.assistant && (
                                                            <div className="small text-muted d-flex align-items-center gap-2 mb-2">
                                                                <FaUserTie className="text-secondary" size={12} />
                                                                {getPersonName(d.assistant)} <span className="badge bg-secondary bg-opacity-25 text-secondary border border-secondary border-opacity-25" style={{ fontSize: '0.6rem' }}>Ajudante</span>
                                                            </div>
                                                        )}
                                                        {d.president && (
                                                            <div className="small text-muted d-flex align-items-center gap-2 mb-2">
                                                                <FaUserTie className="text-info" size={12} />
                                                                {getPersonName(d.president)} <span className="badge bg-info bg-opacity-25 text-info border border-info border-opacity-25" style={{ fontSize: '0.6rem' }}>{d.room === 'Sala B' ? 'Conselheiro' : 'Presidente'}</span>
                                                            </div>
                                                        )}

                                                        <div className="mt-3 d-flex justify-content-between align-items-center">
                                                            <div className="d-flex align-items-center gap-1 text-info small">
                                                                <FaBookOpen size={12} />
                                                                <span className="text-truncate" style={{ maxWidth: '150px' }} title={d.point}>{d.point}</span>
                                                            </div>
                                                            <span className={`badge ${d.room === 'Principal' ? 'bg-primary' : 'bg-secondary'} bg-opacity-75 rounded-pill`}>
                                                                {d.room === 'Principal' ? 'S. Principal' : 'Sala B'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'programa' && <ProgramaVidaMinisterio />}

            {activeTab === 'historico' && (
                <div className="card shadow-sm">
                    <div className="card-header d-flex justify-content-between align-items-center">
                        <div className="d-flex gap-2">
                            <div className="btn-group btn-group-sm">
                                <button className={`btn btn-outline-secondary ${historyView === 'student' ? 'active' : ''}`} onClick={() => setHistoryView('student')}>Por Estudante</button>
                                <button className={`btn btn-outline-secondary ${historyView === 'date' ? 'active' : ''}`} onClick={() => setHistoryView('date')}>Por Data</button>
                            </div>
                            <select className="form-select form-select-sm" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="card-body p-0">
                        <div className="accordion accordion-flush" id="histAccordion">
                            {(historyView === 'student' ? assignmentsByStudent : assignmentsByDate).map((group: any, idx: number) => {
                                const isExpanded = expandedHistoryItems.includes(idx);
                                return (
                                    <div className="accordion-item bg-transparent border-bottom border-secondary border-opacity-25" key={idx}>
                                        <h2 className="accordion-header">
                                            <button
                                                className={`accordion-button ${!isExpanded ? 'collapsed' : ''} bg-transparent text-body shadow-none`}
                                                type="button"
                                                onClick={() => toggleHistoryItem(idx)}
                                                style={{ boxShadow: 'none' }}
                                            >
                                                <div className="d-flex justify-content-between w-100 align-items-center pe-3">
                                                    <strong className="text-body">{historyView === 'student' ? group.estudante : new Date(group.date + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                                                    <span className="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-25 rounded-pill">{group.assignments.length}</span>
                                                </div>
                                            </button>
                                        </h2>
                                        <div className={`accordion-collapse collapse ${isExpanded ? 'show' : ''}`}>
                                            <div className="accordion-body p-0">
                                                <table className="table table-sm table-hover mb-0 small">
                                                    <thead>
                                                        <tr>
                                                            <th className="text-muted text-uppercase" style={{ fontSize: '0.75rem' }}>{historyView === 'student' ? 'Data' : 'Participante'}</th>
                                                            <th className="text-muted text-uppercase" style={{ fontSize: '0.75rem' }}>Ponto</th>
                                                            <th className="text-muted text-uppercase" style={{ fontSize: '0.75rem' }}>Detalhes</th>
                                                            <th className="text-muted text-uppercase" style={{ fontSize: '0.75rem' }}>Sala</th>
                                                            <th className="text-muted text-uppercase text-end" style={{ fontSize: '0.75rem' }}>Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.assignments.map((a: any) => (
                                                            <tr key={a.id} className="align-middle">
                                                                <td>{historyView === 'student' ? new Date(a.date + 'T00:00:00').toLocaleDateString('pt-BR') : getPersonName(a.studentName)}</td>
                                                                <td>{a.point}</td>
                                                                <td>
                                                                    <div className="d-flex flex-column small">
                                                                        {a.assistant && <span className="text-muted"><FaUserTie size={10} /> Ajud: {getPersonName(a.assistant)}</span>}
                                                                        {a.president && <span className="text-info"><FaUserTie size={10} /> {a.room === 'Sala B' ? 'Cons:' : 'Pres:'} {getPersonName(a.president)}</span>}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className={`badge ${a.room === 'Principal' ? 'bg-primary' : 'bg-secondary'} bg-opacity-25 text-${a.room === 'Principal' ? 'primary' : 'light'} border border-${a.room === 'Principal' ? 'primary' : 'secondary'} border-opacity-25`}>
                                                                        {a.room === 'Principal' ? 'Principal' : 'Sala B'}
                                                                    </span>
                                                                </td>
                                                                <td className="text-end">
                                                                    <div className="d-flex justify-content-end gap-2">
                                                                        <button
                                                                            className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center p-1"
                                                                            style={{ width: '24px', height: '24px' }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleOpenDesignacaoModal(a);
                                                                            }}
                                                                            title="Editar"
                                                                        >
                                                                            <FaEdit size={12} />
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center p-1"
                                                                            style={{ width: '24px', height: '24px' }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDelete(a.id);
                                                                            }}
                                                                            title="Excluir"
                                                                        >
                                                                            <FaTrash size={12} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <Modal isOpen={showDesignacaoModal} onClose={() => setShowDesignacaoModal(false)} title={editingDesignacao ? 'Editar' : 'Nova'}>
                <div className="p-3">
                    <div className="mb-3">
                        <label className="form-label">Data</label>
                        <input type="date" className="form-control" value={designacaoFormData.data} onChange={e => setDesignacaoFormData({ ...designacaoFormData, data: e.target.value })} />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Estudante</label>
                        <PersonSelector
                            value={designacaoFormData.estudante}
                            onChange={v => setDesignacaoFormData({ ...designacaoFormData, estudante: v })}
                            source={['Presidente', 'Oração', 'Oração Inicial', 'Oração Final', 'Tesouros - Discurso', 'Tesouros - Joias Espirituais', 'Estudo Bíblico de Congregação', 'Leitor', 'NVC - Parte 1', 'NVC - Parte 2', 'NVC - Necessidades Locais'].some(exclude => designacaoFormData.ponto.includes(exclude)) ? 'all' : 'students'}
                            label="Participante"
                            assignmentFilter={(() => {
                                const p = designacaoFormData.ponto;
                                if (!p) return undefined;
                                if (p === 'Discurso') return ['studentTalk'];
                                if (p === 'Leitura da Bíblia') return ['bibleReading'];
                                if (p === 'Iniciando conversas') return ['startingConversations'];
                                if (p === 'Cultivando o interesse') return ['cultivatingInterest'];
                                if (p === 'Fazendo discípulos') return ['makingDisciples'];
                                if (p === 'Explicando suas crenças') return ['explainingBeliefs'];
                                return undefined;
                            })()}
                            genderFilter={(() => {
                                const p = designacaoFormData.ponto;
                                if (['Presidente', 'Oração', 'Oração Inicial', 'Oração Final', 'Tesouros - Discurso', 'Tesouros - Joias Espirituais', 'Leitura da Bíblia', 'Discurso', 'Leitor', 'Estudo Bíblico de Congregação'].some(x => p.includes(x))) return 'M';
                                return 'all';
                            })()}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Ajudante</label>
                        <PersonSelector value={designacaoFormData.ajudante} onChange={v => setDesignacaoFormData({ ...designacaoFormData, ajudante: v })} source="students" label="Ajudante" />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Ponto</label>
                        <select className="form-select" value={designacaoFormData.ponto} onChange={e => setDesignacaoFormData({ ...designacaoFormData, ponto: e.target.value })}>
                            <option value="">Selecione...</option>
                            {pontos.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Sala</label>
                        <select className="form-select" value={designacaoFormData.sala} onChange={e => setDesignacaoFormData({ ...designacaoFormData, sala: e.target.value as any })}>
                            <option value="Principal">Principal</option>
                            <option value="Sala B">Sala B</option>
                        </select>
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-4">
                        <button className="btn btn-secondary" onClick={() => setShowDesignacaoModal(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleSaveDesignacao}>Salvar</button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Excluir"
                message="Confirmar exclusão?"
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    );
};
