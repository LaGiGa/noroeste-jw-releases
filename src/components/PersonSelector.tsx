import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from './ui/Modal';
import { db } from '../services/database';
import type { Person } from '../services/database';
import { FaUserClock, FaCheck, FaArrowLeft, FaHistory, FaCalendarAlt, FaSearch } from 'react-icons/fa';

interface PersonSelectorProps {
    value: string;
    onChange: (name: string) => void;
    label?: string; // e.g. "Presidente"
    source: 'students' | 'speakers' | 'all'; // Who to list
    roleFilter?: string; // Optional: only show people with this role (e.g. "Leitor")
    assignmentFilter?: keyof NonNullable<Person['assignments']> | (keyof NonNullable<Person['assignments']>)[]; // Optional: only show people with this assignment
    placeholder?: string;
    genderFilter?: 'M' | 'F' | 'all';
    date?: string; // Optional: date to check for unavailability
}

interface Candidate {
    id: string;
    name: string;
    lastDate: string | null; // Date string or null
    history: string[]; // List of recent assignment descriptions
    roles: string[]; // For filtering if needed
    gender?: 'M' | 'F';
}

type SortOption = 'last_used' | 'recent_assignments' | 'alpha';
type GenderFilter = 'all' | 'M' | 'F';

export const PersonSelector: React.FC<PersonSelectorProps> = ({
    value,
    onChange,
    label,
    source,
    roleFilter,
    assignmentFilter,
    placeholder = 'Selecione...',
    genderFilter: initialGenderFilter,
    date
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'list' | 'details'>('list');
    const [detailsCandidate, setDetailsCandidate] = useState<Candidate | null>(null);

    // Default filters
    const [sortOption, setSortOption] = useState<SortOption>('last_used');
    const [genderFilter, setGenderFilter] = useState<GenderFilter>(initialGenderFilter || 'all');
    const [searchTerm, setSearchTerm] = useState('');

    const [candidates, setCandidates] = useState<Candidate[]>([]);

    const loadCandidates = useCallback(() => {
        const assignments = db.getSchoolAssignments();
        let pool: (Partial<Person> & { id: string; name: string })[] = [];

        if (source === 'students') {
            pool = db.getPersons().filter(p => p.active && (p.assignments?.bibleReading || p.assignments?.studentTalk || p.assignments?.startingConversations || p.assignments?.cultivatingInterest || p.assignments?.makingDisciples || p.assignments?.explainingBeliefs || p.assignments?.assistant));
        } else if (source === 'speakers') {
            pool = db.getPersons().filter(p => p.active && p.assignments?.publicTalkSpeaker);
        } else {
            pool = db.getPersons().filter(p => p.active);
        }

        // Apply role filter if present
        if (roleFilter) {
            pool = pool.filter(p => p.roles && p.roles.includes(roleFilter));
        }

        // Apply assignment filter if present
        if (assignmentFilter) {
            pool = pool.filter(p => {
                if (!p.assignments) return false;
                if (Array.isArray(assignmentFilter)) {
                    return assignmentFilter.some(f => p.assignments[f as keyof typeof p.assignments] === true);
                }
                return p.assignments[assignmentFilter as keyof typeof p.assignments] === true;
            });
        }

        // Apply Unavailability Filter
        if (date) {
             pool = pool.filter(p => {
                if (!p.unavailability || p.unavailability.length === 0) return true;
                const target = date;
                const isUnavailable = p.unavailability.some(u => target >= u.startDate && target <= u.endDate);
                return !isUnavailable;
            });
        }

        const computed: Candidate[] = pool.map(p => {
            // Find assignments for this person
            const pAssignments = assignments
                .filter(a =>
                    a.studentName === p.name ||
                    a.assistant === p.name ||
                    a.president === p.name ||
                    a.speaker === p.name ||
                    a.bibleReader === p.name ||
                    a.conductor === p.name ||
                    a.bibleStudyConductor === p.name ||
                    a.bibleStudyReader === p.name
                );

            // Group by date to avoid duplicates from multiple entries per meeting
            const historyMap = new Map<string, string[]>();

            pAssignments.forEach(a => {
                const dateKey = a.date;
                if (!historyMap.has(dateKey)) {
                    historyMap.set(dateKey, []);
                }
                const parts = historyMap.get(dateKey)!;

                // Add specific role/part description
                if (a.president === p.name) parts.push(`Presidente`);
                if (a.speaker === p.name) parts.push(`Orador (${a.point || 'Parte'})`);
                if (a.conductor === p.name) parts.push(`Condutor (${a.point || 'Parte'})`);
                if (a.bibleReader === p.name) parts.push(`Leitura`);
                if (a.studentName === p.name) parts.push(`${a.point} (${a.room})`);
                if (a.assistant === p.name) parts.push(`Ajudante de ${a.studentName}`);
                if (a.bibleStudyConductor === p.name) parts.push(`Condutor Estudo`);
                if (a.bibleStudyReader === p.name) parts.push(`Leitor Estudo`);
            });

            // Sort dates descending (Newest first) for history display
            const sortedDates = Array.from(historyMap.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

            const lastDate = sortedDates.length > 0 ? sortedDates[0] : null;

            // Generate history strings
            const historyStrings = sortedDates.map(date => {
                const parts = historyMap.get(date)!;
                const uniqueParts = [...new Set(parts)];
                const dateStr = new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                return `${dateStr}: ${uniqueParts.join(', ')}`;
            });

            return {
                id: p.id,
                name: p.name,
                lastDate,
                history: historyStrings,
                roles: p.roles || [],
                gender: p.gender
            };
        });

        setCandidates(computed);
    }, [source, roleFilter, assignmentFilter, date]);

    // Load data when modal opens
    useEffect(() => {
        if (isOpen) {
            loadCandidates();
            setView('list');
            setDetailsCandidate(null);
            setSearchTerm('');
            if (initialGenderFilter) setGenderFilter(initialGenderFilter);
        }
    }, [isOpen, source, value, roleFilter, assignmentFilter, initialGenderFilter, date, loadCandidates]);

    const sortedCandidates = useMemo(() => {
        let list = [...candidates];

        // 0. Filter by Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            list = list.filter(c => c.name.toLowerCase().includes(lower));
        }

        // 1. Filter by Gender
        if (genderFilter !== 'all') {
            list = list.filter(c => c.gender === genderFilter);
        }

        // 2. Sort
        if (sortOption === 'alpha') {
            list.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortOption === 'last_used') {
            // Usado por Último
            list.sort((a, b) => {
                if (!a.lastDate && !b.lastDate) return a.name.localeCompare(b.name);
                if (!a.lastDate) return -1; // A never used -> Top
                if (!b.lastDate) return 1;  // B never used -> Bottom (relative to A)
                return new Date(a.lastDate).getTime() - new Date(b.lastDate).getTime();
            });
        } else if (sortOption === 'recent_assignments') {
            // Designações Recentes
            list.sort((a, b) => {
                if (!a.lastDate && !b.lastDate) return a.name.localeCompare(b.name);
                if (!a.lastDate) return 1; // Put never used at bottom
                if (!b.lastDate) return -1;
                return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
            });
        }

        return list;
    }, [candidates, sortOption, genderFilter, searchTerm]);

    const handleSelectCandidate = (candidateName: string) => {
        onChange(candidateName);
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange('');
        setIsOpen(false);
    };

    const viewCandidateDetails = (candidate: Candidate) => {
        setDetailsCandidate(candidate);
        setView('details');
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Disponível';
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getTimeAgo = (dateStr: string | null) => {
        if (!dateStr) return 'Sem registro recente';
        const d = new Date(dateStr);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 7) return `${diffDays} dias atrás`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem. atrás`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
        return 'Mais de um ano';
    };

    return (
        <>
            {/* Trigger Input */}
            <div className="input-group input-group-sm" onClick={() => setIsOpen(true)} style={{ cursor: 'pointer' }}>
                <input
                    type="text"
                    className="form-control form-control-sm bg-white"
                    value={value}
                    readOnly
                    placeholder={placeholder}
                    style={{ cursor: 'pointer' }}
                />
                <button className="btn btn-outline-secondary" type="button">
                    <FaUserClock />
                </button>
            </div>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title={view === 'details' ? 'Histórico de Designações' : (label || 'Selecionar Participante')}
                size="lg"
                footer={
                    view === 'list' ? (
                        <div className="d-flex justify-content-between w-100">
                            <button className="btn btn-outline-danger" onClick={handleClear}>Limpar Seleção</button>
                            <button className="btn btn-secondary" onClick={() => setIsOpen(false)}>Cancelar</button>
                        </div>
                    ) : (
                        <div className="d-flex justify-content-between w-100">
                            <button className="btn btn-outline-secondary" onClick={() => setView('list')}>
                                <FaArrowLeft className="me-1" /> Voltar
                            </button>
                            {detailsCandidate && (
                                <button className="btn btn-primary px-4" onClick={() => handleSelectCandidate(detailsCandidate.name)}>
                                    <FaCheck className="me-1" /> Confirmar: {detailsCandidate.name}
                                </button>
                            )}
                        </div>
                    )
                }
            >
                {view === 'list' && (
                    <>
                        {/* Search Bar */}
                        <div className="mb-3">
                            <div className="input-group">
                                <span className="input-group-text bg-body-tertiary border-end-0">
                                    <FaSearch className="text-muted" />
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-start-0 ps-0 shadow-none"
                                    placeholder="Buscar participante..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Filters Header */}
                        <div className="mb-3 border-bottom pb-3">
                            <div className="row g-3">
                                <div className="col-md-7">
                                    <label className="form-label small fw-bold text-muted">Classificar:</label>
                                    <div className="btn-group btn-group-sm w-100" role="group">
                                        <input type="radio" className="btn-check" name={`sort-${label}`} id={`sort-last-${label}`} checked={sortOption === 'last_used'} onChange={() => setSortOption('last_used')} />
                                        <label className="btn btn-outline-secondary" htmlFor={`sort-last-${label}`}>Disponibilidade</label>

                                        <input type="radio" className="btn-check" name={`sort-${label}`} id={`sort-recent-${label}`} checked={sortOption === 'recent_assignments'} onChange={() => setSortOption('recent_assignments')} />
                                        <label className="btn btn-outline-secondary" htmlFor={`sort-recent-${label}`}>Recentes</label>

                                        <input type="radio" className="btn-check" name={`sort-${label}`} id={`sort-alpha-${label}`} checked={sortOption === 'alpha'} onChange={() => setSortOption('alpha')} />
                                        <label className="btn btn-outline-secondary" htmlFor={`sort-alpha-${label}`}>A-Z</label>
                                    </div>
                                </div>
                                <div className="col-md-5">
                                    <label className="form-label small fw-bold text-muted">Filtrar:</label>
                                    <div className="btn-group btn-group-sm w-100" role="group">
                                        <input type="radio" className="btn-check" name={`gender-${label}`} id={`gender-all-${label}`} checked={genderFilter === 'all'} onChange={() => setGenderFilter('all')} />
                                        <label className="btn btn-outline-secondary" htmlFor={`gender-all-${label}`}>Todos</label>

                                        <input type="radio" className="btn-check" name={`gender-${label}`} id={`gender-m-${label}`} checked={genderFilter === 'M'} onChange={() => setGenderFilter('M')} />
                                        <label className="btn btn-outline-secondary" htmlFor={`gender-m-${label}`}>Irmãos</label>

                                        <input type="radio" className="btn-check" name={`gender-${label}`} id={`gender-f-${label}`} checked={genderFilter === 'F'} onChange={() => setGenderFilter('F')} />
                                        <label className="btn btn-outline-secondary" htmlFor={`gender-f-${label}`}>Irmãs</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Candidates List - Improved Layout */}
                        <div className="list-group list-group-flush border rounded overflow-auto" style={{ maxHeight: '50vh' }}>
                            {sortedCandidates.length === 0 ? (
                                <div className="text-center py-5 text-muted">Nenhum resultado encontrado.</div>
                            ) : (
                                sortedCandidates.map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3 ${value === c.name ? 'bg-light' : ''}`}
                                        onClick={() => viewCandidateDetails(c)}
                                    >
                                        {/* Left: Name */}
                                        <div className="d-flex align-items-center">
                                            <div className="avatar me-3 bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '42px', height: '42px', fontSize: '1.2rem' }}>
                                                {c.name.charAt(0)}
                                            </div>
                                            <div className='text-start'>
                                                <div className="fw-bold text-dark" style={{ fontSize: '1.05rem' }}>{c.name}</div>
                                                {value === c.name && <span className="badge bg-primary mt-1">Selecionado Atual</span>}
                                            </div>
                                        </div>

                                        {/* Center/Right: Date Status */}
                                        <div className="text-end" style={{ minWidth: '130px' }}>
                                            {c.lastDate ? (
                                                <>
                                                    <div className="fw-bold text-dark">{formatDate(c.lastDate)}</div>
                                                    <div className="small text-muted">{getTimeAgo(c.lastDate)}</div>
                                                </>
                                            ) : (
                                                <span className="badge bg-success rounded-pill px-3 py-2">Sem histórico</span>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="mt-2 text-end text-muted small">
                            Total: {sortedCandidates.length}
                        </div>
                    </>
                )}

                {view === 'details' && detailsCandidate && (
                    <div className="animate-fade-in">
                        {/* Header Details */}
                        <div className="d-flex align-items-center mb-4 p-3 bg-light rounded shadow-sm">
                            <div className="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '64px', height: '64px', fontSize: '2rem' }}>
                                {detailsCandidate.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="mb-0 fw-bold">{detailsCandidate.name}</h3>
                                <div className="text-muted d-flex align-items-center mt-1 small">
                                    <FaHistory className="me-2" />
                                    Histórico Completo
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="position-relative ps-3 ms-2" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                            {detailsCandidate.history.length === 0 ? (
                                <div className="text-muted fst-italic py-4 text-center border rounded bg-white">
                                    <FaCalendarAlt className="mb-2 d-block mx-auto" size={24} />
                                    Nenhuma designação recente encontrada no histórico.
                                </div>
                            ) : (
                                <div className="timeline-container">
                                    {detailsCandidate.history.map((h, i) => {
                                        const [datePart, ...descParts] = h.split(':');
                                        const desc = descParts.join(':');

                                        return (
                                            <div key={i} className="d-flex mb-3">
                                                <div className="me-3 d-flex flex-column align-items-center">
                                                    <div className="rounded-circle bg-primary" style={{ width: '10px', height: '10px', marginTop: '6px' }}></div>
                                                    {i < detailsCandidate.history.length - 1 && <div className="bg-light flex-grow-1" style={{ width: '2px', marginTop: '4px' }}></div>}
                                                </div>
                                                <div className="flex-grow-1">
                                                    <div className="card shadow-sm border-0">
                                                        <div className="card-body py-2 px-3">
                                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                                <strong className="text-primary d-flex align-items-center">
                                                                    {datePart}
                                                                </strong>
                                                            </div>
                                                            <div className="text-dark small">
                                                                {desc}
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
                    </div>
                )}
            </Modal>
        </>
    );
};
