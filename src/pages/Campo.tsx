import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlus, FaEdit, FaTrash, FaUserTie, FaMapMarkedAlt, FaUsers, FaClipboardList, FaArrowLeft, FaFilePdf, FaMagic, FaImage, FaEye } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import { useJsApiLoader } from '@react-google-maps/api';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { showSuccess, showError } from '../utils/toast';
import { MapaTerritorio } from '../components/MapaTerritorio';
import { PersonSelector } from '../components/PersonSelector';
import { exportCampoPDF } from '../services/campoPDF';
import { db } from '../services/database';
import type { Person, ServiceGroup, Quadra } from '../services/database';

type Grupo = ServiceGroup;

const libraries: ("drawing" | "geometry" | "places" | "visualization")[] = ["drawing", "geometry"];

interface TrabalhoTerritorio {
    id: number;
    grupoId: string;
    data: string;
    area: string;
    observacoes: string;
    lines?: google.maps.LatLngLiteral[][];
}

interface DesignacaoCampo {
    id: string;
    data: string;
    diaSemana: string;
    hora: string;
    territorio: string;
    local: string;
    dirigente: string;
}

const PrintableSchedule = ({ designacoes, selectedMonth }: { designacoes: DesignacaoCampo[], selectedMonth: string }) => {
    return (
        <>
            <h3 className="text-center fw-bold mb-4" style={{ borderBottom: '2px solid #000', paddingBottom: '10px' }}>
                PROGRAMAÇÃO DE SAÍDA DE CAMPO - {new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
            </h3>

            {/* Morning Table */}
            <table className="table table-bordered border-dark mb-0" style={{ border: '2px solid #000', fontSize: '14px' }}>
                <thead className="table-header-gradient">
                    <tr className="text-center align-middle" style={{ height: '40px' }}>
                        <th style={{ width: '15%', border: '1px solid #000' }}>DIA</th>
                        <th style={{ width: '15%', border: '1px solid #000' }}>TERRITÓRIO</th>
                        <th style={{ width: '10%', border: '1px solid #000' }}>HORÁRIO</th>
                        <th style={{ width: '35%', border: '1px solid #000' }}>LOCAL DE SAÍDA</th>
                        <th style={{ width: '25%', border: '1px solid #000' }}>DIRIGENTE</th>
                    </tr>
                </thead>
                <tbody>
                    {designacoes
                        .filter(d => d.data.startsWith(selectedMonth))
                        .filter(d => parseInt(d.hora.split(':')[0]) < 18)
                        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
                        .map((d, index) => {
                            const isWeekend = d.diaSemana.includes('Sábado') || d.diaSemana.includes('Domingo');
                            return (
                                <tr key={index} style={{ border: '1px solid #000' }}>
                                    <td className="text-center align-middle" style={{ border: '1px solid #000', fontWeight: isWeekend ? 'bold' : 'normal' }}>
                                        {new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')} <br /> <span className="small">{d.diaSemana}</span>
                                    </td>
                                    <td className="text-center align-middle" style={{ border: '1px solid #000', fontWeight: isWeekend ? 'bold' : 'normal' }}>{d.territorio}</td>
                                    <td className="text-center align-middle" style={{ border: '1px solid #000', fontWeight: isWeekend ? 'bold' : 'normal' }}>{d.hora}</td>
                                    <td className="text-center align-middle" style={{ border: '1px solid #000', fontWeight: isWeekend ? 'bold' : 'normal' }}>{d.local}</td>
                                    <td className="text-center align-middle" style={{ border: '1px solid #000', fontWeight: isWeekend ? 'bold' : 'normal' }}>{d.dirigente}</td>
                                </tr>
                            );
                        })}
                    {/* Sunday Footer */}
                    <tr className="fw-bold" style={{ backgroundColor: '#f8f9fa', borderTop: '2px solid #000' }}>
                        <td className="text-center align-middle" style={{ border: '1px solid #000' }}>Domingo</td>
                        <td className="text-center align-middle" style={{ border: '1px solid #000' }}></td>
                        <td className="text-center align-middle" style={{ border: '1px solid #000' }}>08:30</td>
                        <td colSpan={2} className="text-center align-middle" style={{ border: '1px solid #000' }}>Cada publicador no seu respectivo grupo</td>
                    </tr>
                </tbody>
            </table>

            {/* Evening Section */}
            {designacoes.filter(d => d.data.startsWith(selectedMonth) && parseInt(d.hora.split(':')[0]) >= 18).length > 0 && (
                <div className="text-center">
                    <h4 className="fw-bold mt-4 mb-2" style={{ textTransform: 'uppercase', display: 'inline-block', padding: '0 20px' }}>CAMPO À NOITE</h4>

                    <table className="table table-bordered border-dark" style={{ border: '2px solid #000', fontSize: '14px', width: '100%' }}>
                        <thead className="table-header-gradient">
                            <tr className="text-center align-middle" style={{ height: '40px' }}>
                                <th style={{ width: '15%', border: '1px solid #000' }}>DIA</th>
                                <th style={{ width: '15%', border: '1px solid #000' }}>TERRITÓRIO</th>
                                <th style={{ width: '10%', border: '1px solid #000' }}>HORÁRIO</th>
                                <th style={{ width: '35%', border: '1px solid #000' }}>LOCAL DE SAÍDA</th>
                                <th style={{ width: '25%', border: '1px solid #000' }}>DIRIGENTE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {designacoes
                                .filter(d => d.data.startsWith(selectedMonth))
                                .filter(d => parseInt(d.hora.split(':')[0]) >= 18)
                                .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
                                .map((d, index) => (
                                    <tr key={index} style={{ border: '1px solid #000' }}>
                                        <td className="text-center align-middle" style={{ border: '1px solid #000' }}>
                                            {new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')} <br /> <span className="small">{d.diaSemana}</span>
                                        </td>
                                        <td className="text-center align-middle" style={{ border: '1px solid #000' }}>{d.territorio}</td>
                                        <td className="text-center align-middle" style={{ border: '1px solid #000' }}>{d.hora}</td>
                                        <td className="text-center align-middle" style={{ border: '1px solid #000' }}>{d.local}</td>
                                        <td className="text-center align-middle" style={{ border: '1px solid #000' }}>{d.dirigente}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
};

export const Campo: React.FC = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey || '',
        libraries
    });

    // Abas
    const [activeTab, setActiveTab] = useState<'territorio' | 'grupos' | 'designacoes'>('grupos');

    // Estados para Grupos
    const [grupos, setGrupos] = useState<Grupo[]>(() => db.getServiceGroups());

    const [trabalhos, setTrabalhos] = useState<TrabalhoTerritorio[]>(() => {
        const saved = localStorage.getItem('campo_trabalhos');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null);
    const [newMemberName, setNewMemberName] = useState('');
    const [newQuadraNumero, setNewQuadraNumero] = useState('');

    // Estados para Designações de Campo
    const [designacoes, setDesignacoes] = useState<DesignacaoCampo[]>(() => {
        const saved = localStorage.getItem('campo_designacoes');
        return saved ? JSON.parse(saved) : [];
    });

    // Filtro de Mês para Designações
    const getCurrentMonthKey = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const [selectedMonth, setSelectedMonth] = useState(() => {
        return localStorage.getItem('campo_selectedMonth') || getCurrentMonthKey();
    });
    const printRef = React.useRef<HTMLDivElement>(null);


    const snapshotRef = useRef<HTMLDivElement>(null);

    const [showDesignacaoModal, setShowDesignacaoModal] = useState(false);
    const [designacaoForm, setDesignacaoForm] = useState<DesignacaoCampo>({
        id: '',
        data: new Date().toISOString().split('T')[0],
        diaSemana: 'Sábado',
        hora: '09:00',
        territorio: '',
        local: 'Salão do Reino',
        dirigente: ''
    });

    // Salvar efeitos
    useEffect(() => {
        // Sync grupos is handled by db methods now, but we keep state for UI
    }, [grupos]);
    useEffect(() => { localStorage.setItem('campo_trabalhos', JSON.stringify(trabalhos)); }, [trabalhos]);
    useEffect(() => { localStorage.setItem('campo_designacoes', JSON.stringify(designacoes)); }, [designacoes]);
    useEffect(() => { localStorage.setItem('campo_selectedMonth', selectedMonth); }, [selectedMonth]);

    const [showGrupoModal, setShowGrupoModal] = useState(false);
    const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null);
    const [grupoFormData, setGrupoFormData] = useState({
        nome: '',
        responsavel: '',
        assistente: '',
        territorio: '',
        cor: '#3b82f6'
    });

    const [showTrabalhoModal, setShowTrabalhoModal] = useState(false);
    const [editingTrabalhoId, setEditingTrabalhoId] = useState<number | null>(null);
    const [trabalhoFormData, setTrabalhoFormData] = useState({
        grupoId: '' as string,
        data: new Date().toISOString().split('T')[0],
        area: '',
        observacoes: '',
        lines: [] as google.maps.LatLngLiteral[][]
    });

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingId, setDeletingId] = useState<number | string | null>(null);
    const [deleteType, setDeleteType] = useState<'grupo' | 'trabalho' | 'membro' | 'designacao'>('grupo');
    const [memberToDelete, setMemberToDelete] = useState<{ grupoId: string, memberIndex: number } | null>(null);

    // --- Gerador Automático ---
    const [showGerarModal, setShowGerarModal] = useState(false);
    const [showPreviewExport, setShowPreviewExport] = useState(false);
    const [previewDesignacoes, setPreviewDesignacoes] = useState<DesignacaoCampo[]>([]);
    // Patterns requested by user
    const FIXED_CONDUCTORS = {
        Tuesday: 'Edilson Almeida',
        Wednesday: 'Dorivan Miranda',
        Thursday: 'Rafael Leão',
        Friday: 'Pedro Avelino',
        ThuEvening: 'Rafael Leão',
        FriEvening: 'Andre Almeida'
    };

    const [autoConfig, setAutoConfig] = useState(() => {
        const saved = localStorage.getItem('campo_autoConfig');
        return saved ? JSON.parse(saved) : {
            morningTime: '08:15',
            morningLocal: 'Salão do Reino',
            weeklyTerritories: { 1: '', 2: '', 3: '', 4: '', 5: '' } as Record<number, string>,
            weeklyLocals: { 1: '', 2: '', 3: '', 4: '', 5: '' } as Record<number, string>,
            eveningEnabled: true,
            eveningTime: '18:30',
            eveningLocal: 'Casa do Irmão Rafael Leão',
        };
    });

    useEffect(() => {
        localStorage.setItem('campo_autoConfig', JSON.stringify(autoConfig));
    }, [autoConfig]);

    // Cache for rotation
    // const [eligibleDirigentes, setEligibleDirigentes] = useState<Person[]>([]);
    const [eligibleOradores, setEligibleOradores] = useState<Person[]>([]);
    const [shuffledOradores, setShuffledOradores] = useState<Person[]>([]);

    useEffect(() => {
        const loadPeople = async () => {
            const all = db.getPersons();
            // Defensive: ensure we have an array and each person has roles array
            const people = Array.isArray(all) ? all : [];
            // setEligibleDirigentes(people.filter(p => Array.isArray(p?.roles) && p.roles.includes('Dirigente de Campo') && p.gender === 'M'));
            setEligibleOradores(people.filter(p => p && Array.isArray(p.roles) && p.roles.includes('Orador') && p.gender === 'M'));
        };
        loadPeople();
    }, []);

    // Shuffle only when modal opens
    useEffect(() => {
        if (showGerarModal) {
            const shuffle = (array: Person[]) => {
                let currentIndex = array.length, randomIndex;
                const newArr = [...array];
                while (currentIndex != 0) {
                    randomIndex = Math.floor(Math.random() * currentIndex);
                    currentIndex--;
                    [newArr[currentIndex], newArr[randomIndex]] = [newArr[randomIndex], newArr[currentIndex]];
                }
                return newArr;
            };
            setShuffledOradores(shuffle(eligibleOradores));
        }
    }, [showGerarModal, eligibleOradores]);

    // Effect to auto-generate when modal opens or config changes
    useEffect(() => {
        if (showGerarModal) {
            handlePreview();
        }
    }, [showGerarModal, autoConfig, shuffledOradores, selectedMonth]);

    const handlePreview = () => {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1;

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const newDesignacoes: DesignacaoCampo[] = [];
        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

        const rotationOradores = shuffledOradores;
        let oraIdx = 0;

        // Helper to check availability
        const isPersonAvailable = (person: Person, targetDate: string): boolean => {
            if (!person.unavailability || person.unavailability.length === 0) return true;
            return !person.unavailability.some(u => {
                return targetDate >= u.startDate && targetDate <= u.endDate;
            });
        };

        // Helper to get week number relative to the month (1-5)
        const getMonthWeek = (date: Date) => {
            const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const dayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
            const offsetDate = date.getDate() + dayOfWeek - 1;
            return Math.floor(offsetDate / 7) + 1;
        };

        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);
            const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const diaSemana = days[dayOfWeek];
            const weekNum = getMonthWeek(dateObj);
            const territory = autoConfig.weeklyTerritories[weekNum] || '';
            const weekLocal = autoConfig.weeklyLocals[weekNum];

            // Morning (Tue-Sat)
            if (dayOfWeek >= 2 && dayOfWeek <= 6) {
                let conductor = '';
                let time = autoConfig.morningTime;

                if (dayOfWeek === 6) { // Saturday -> Oradores
                    if (rotationOradores.length > 0) {
                        // Try to find an available orator
                        let found = false;
                        let attempts = 0;
                        const initialIdx = oraIdx;

                        while (!found && attempts < rotationOradores.length) {
                            const candidate = rotationOradores[oraIdx % rotationOradores.length];
                            if (isPersonAvailable(candidate, dateStr)) {
                                conductor = candidate.name;
                                found = true;
                                oraIdx++; // Move to next for next Saturday
                            } else {
                                oraIdx++; // Skip unavailable person
                            }
                            attempts++;
                        }

                        if (!found) {
                            conductor = "Nenhum orador disponível";
                            oraIdx = initialIdx; // Reset or keep incremented? Keep incremented to avoid stuck.
                        }
                    }
                    time = '08:30';
                } else { // Weekdays -> Fixed Patterns
                    if (dayOfWeek === 2) conductor = FIXED_CONDUCTORS.Tuesday;
                    if (dayOfWeek === 3) conductor = FIXED_CONDUCTORS.Wednesday;
                    if (dayOfWeek === 4) conductor = FIXED_CONDUCTORS.Thursday;
                    if (dayOfWeek === 5) conductor = FIXED_CONDUCTORS.Friday;
                }

                newDesignacoes.push({
                    id: `auto-${dateStr}-morning`,
                    data: dateStr,
                    diaSemana,
                    hora: time,
                    local: weekLocal || autoConfig.morningLocal,
                    territorio: territory,
                    dirigente: conductor
                });
            }

            // Evening (Thu=4, Fri=5) -> Fixed Patterns
            if (dayOfWeek === 4 || dayOfWeek === 5) {
                if (autoConfig.eveningEnabled) {
                    let conductor = '';
                    if (dayOfWeek === 4) conductor = FIXED_CONDUCTORS.ThuEvening;
                    if (dayOfWeek === 5) conductor = FIXED_CONDUCTORS.FriEvening;

                    newDesignacoes.push({
                        id: `auto-${dateStr}-evening`,
                        data: dateStr,
                        diaSemana,
                        hora: autoConfig.eveningTime,
                        local: 'Casa do Irmão Rafael Leão', // Fixed per user request
                        territorio: 'Arno 61', // Fixed per user request
                        dirigente: conductor
                    });
                }
            }
        }
        setPreviewDesignacoes(newDesignacoes);
    };

    const confirmGeracao = () => {
        // Ensure we are saving to the correct month
        // const [y, m] = selectedMonth.split('-');
        // const targetMonth = `${y}-${m}`;

        // Remove existing auto-generated entries for this month to avoid duplicates/stale data
        // We keep manual entries if they don't collide, or we can just replace all for this month?
        // User behavior implies "I want to generate the schedule for this month".
        // Safer approach: Remove ALL designations for this month and replace with preview.
        // But wait, what if they have manual ones they want to keep?
        // The previous logic was: replace by (date|time) key.

        const existing = [...designacoes];
        const newKeys = new Set(previewDesignacoes.map(p => `${p.data}|${p.hora}`));

        // Remove from existing ANY entry that matches the keys in the new set
        // (This effectively updates them)
        const keptExisting = existing.filter(e => !newKeys.has(`${e.data}|${e.hora}`));

        const finalDesignacoes = [...keptExisting, ...previewDesignacoes];

        console.log('Saving Designations:', finalDesignacoes.length);
        setDesignacoes(finalDesignacoes);
        setShowGerarModal(false);
        setPreviewDesignacoes([]);
        showSuccess(`Escala salva com sucesso!`);
    };

    // --- Funções Auxiliares: Designações ---
    const handleSaveDesignacao = () => {
        if (!designacaoForm.data || !designacaoForm.dirigente) {
            showError('Preencha a data e o dirigente.');
            return;
        }
        const nova = { ...designacaoForm, id: designacaoForm.id || Date.now().toString() };

        // Se for edição
        if (designacaoForm.id) {
            setDesignacoes(prev => prev.map(d => d.id === nova.id ? nova : d));
            showSuccess('Designação atualizada.');
        } else {
            setDesignacoes(prev => [...prev, nova]);
            showSuccess('Designação criada.');
        }
        setShowDesignacaoModal(false);
    };

    const handleEditDesignacao = (d: DesignacaoCampo) => {
        setDesignacaoForm(d);
        setShowDesignacaoModal(true);
    };

    /*
    const handleNewDesignacao = () => {
        setDesignacaoForm({
            id: '',
            data: new Date().toISOString().split('T')[0],
            diaSemana: 'Sábado',
            hora: '09:00',
            territorio: '',
            local: 'Salão do Reino',
            dirigente: ''
        });
        setShowDesignacaoModal(true);
    };
    */

    // --- Funções: Grupos ---
    const handleOpenGrupoModal = (grupo?: Grupo) => {
        if (grupo) {
            setEditingGrupo(grupo);
            setGrupoFormData({
                nome: grupo.nome,
                responsavel: grupo.responsavel,
                assistente: grupo.assistente,
                territorio: grupo.territorio,
                cor: grupo.cor
            });
        } else {
            setEditingGrupo(null);
            setGrupoFormData({ nome: '', responsavel: '', assistente: '', territorio: '', cor: '#3b82f6' });
        }
        setShowGrupoModal(true);
    };

    const handleSaveGrupo = () => {
        if (!grupoFormData.nome.trim()) {
            showError('Nome do grupo é obrigatório');
            return;
        }

        if (editingGrupo) {
            db.updateServiceGroup(editingGrupo.id, grupoFormData);
            setGrupos(db.getServiceGroups());
            showSuccess('Grupo atualizado com sucesso!');
        } else {
            db.addServiceGroup({
                ...grupoFormData,
                paths: [],
                membros: []
            });
            setGrupos(db.getServiceGroups());
            showSuccess('Grupo cadastrado com sucesso!');
        }

        setShowGrupoModal(false);
        setEditingGrupo(null);
    };

    const handleUpdateTerritorio = useCallback((grupoId: string, newPaths: google.maps.LatLngLiteral[][], newLines?: google.maps.LatLngLiteral[][]) => {
        db.updateServiceGroup(grupoId, { paths: newPaths, lines: newLines });
        setGrupos(db.getServiceGroups());
        showSuccess('Território atualizado!');
    }, []);

    // --- Funções: Quadras ---
    const getPolygonCenter = (path: { lat: number, lng: number }[]) => {
        if (!path || path.length === 0) return { lat: -10.169, lng: -48.331 };
        const lat = path.reduce((sum, p) => sum + p.lat, 0) / path.length;
        const lng = path.reduce((sum, p) => sum + p.lng, 0) / path.length;
        return { lat, lng };
    };

    const handleAddQuadra = (grupoId: string) => {
        if (!newQuadraNumero.trim()) return;
        const grupo = grupos.find(g => g.id === grupoId);
        if (grupo) {
            let initialPos = { lat: -10.169, lng: -48.331 };
            if (grupo.paths && grupo.paths.length > 0 && grupo.paths[0].length > 0) {
                initialPos = getPolygonCenter(grupo.paths[0]);
            } else if (grupo.lines && grupo.lines.length > 0 && grupo.lines[0].length > 0) {
                initialPos = getPolygonCenter(grupo.lines[0]);
            }

            const newQuadra: Quadra = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                numero: newQuadraNumero.trim(),
                status: 'nao_trabalhada',
                lat: initialPos.lat,
                lng: initialPos.lng
            };
            const updatedQuadras = [...(grupo.quadras || []), newQuadra];
            db.updateServiceGroup(grupoId, { quadras: updatedQuadras });
            setGrupos(db.getServiceGroups());
        }
        setNewQuadraNumero('');
        showSuccess('Quadra adicionada!');
    };

    const handleMoveQuadra = (grupoId: string, quadraId: string, newLat: number, newLng: number) => {
        const grupo = grupos.find(g => g.id === grupoId);
        if (grupo && grupo.quadras) {
            const updatedQuadras = grupo.quadras.map(q =>
                q.id === quadraId
                    ? { ...q, lat: newLat, lng: newLng }
                    : q
            );
            db.updateServiceGroup(grupoId, { quadras: updatedQuadras });
            setGrupos(db.getServiceGroups());
        }
    };

    const handleToggleQuadraStatus = (grupoId: string, quadraId: string) => {
        const grupo = grupos.find(g => g.id === grupoId);
        if (grupo && grupo.quadras) {
            const updatedQuadras = grupo.quadras.map(q =>
                q.id === quadraId
                    ? { ...q, status: q.status === 'trabalhada' ? ('nao_trabalhada' as const) : ('trabalhada' as const) }
                    : q
            );
            db.updateServiceGroup(grupoId, { quadras: updatedQuadras });
            setGrupos(db.getServiceGroups());
        }
    };

    const handleAutoDetectQuadras = async (grupoId: string) => {
        const grupo = grupos.find(g => g.id === grupoId);
        if (!grupo || !grupo.paths || grupo.paths.length === 0 || grupo.paths[0].length === 0) {
            return showError('O grupo precisa ter um território desenhado (polígono).');
        }

        if (!confirm('Isso tentará detectar alamedas/ruas dentro do polígono usando o Google Maps. Isso pode levar alguns segundos. Continuar?')) return;

        try {
            const polygonPath = grupo.paths[0];
            let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
            const googlePath = polygonPath.map(p => {
                minLat = Math.min(minLat, p.lat);
                maxLat = Math.max(maxLat, p.lat);
                minLng = Math.min(minLng, p.lng);
                maxLng = Math.max(maxLng, p.lng);
                return new google.maps.LatLng(p.lat, p.lng);
            });

            const polygon = new google.maps.Polygon({ paths: googlePath });

            // Generate Grid (~45m step)
            const step = 0.0004;
            const pointsToCheck: google.maps.LatLng[] = [];

            for (let lat = minLat; lat <= maxLat; lat += step) {
                for (let lng = minLng; lng <= maxLng; lng += step) {
                    const p = new google.maps.LatLng(lat, lng);
                    if (google.maps.geometry.poly.containsLocation(p, polygon)) {
                        pointsToCheck.push(p);
                    }
                }
            }

            if (pointsToCheck.length === 0) return showError('Nenhum ponto encontrado dentro do polígono.');

            // Sample points (Limit to 15 to save quota/time)
            const sampleSize = 15;
            const samplePoints = pointsToCheck.sort(() => 0.5 - Math.random()).slice(0, sampleSize);

            const geocoder = new google.maps.Geocoder();
            const foundStreets: Record<string, { latSum: number, lngSum: number, count: number }> = {};

            showSuccess('Detectando ruas...');

            for (const p of samplePoints) {
                try {
                    const response = await geocoder.geocode({ location: p });
                    if (response.results && response.results.length > 0) {
                        const routeComp = response.results[0].address_components.find(c => c.types.includes('route'));
                        if (routeComp) {
                            const name = routeComp.short_name || routeComp.long_name;
                            if (name && !name.toLowerCase().includes('unnamed')) {
                                if (!foundStreets[name]) {
                                    foundStreets[name] = { latSum: 0, lngSum: 0, count: 0 };
                                }
                                foundStreets[name].latSum += p.lat();
                                foundStreets[name].lngSum += p.lng();
                                foundStreets[name].count++;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Geocoding error', e);
                }
                await new Promise(r => setTimeout(r, 250)); // Throttle
            }

            const newQuadras: Quadra[] = [];
            Object.keys(foundStreets).forEach(name => {
                if (grupo.quadras?.some(q => q.numero.toLowerCase() === name.toLowerCase())) return;

                const data = foundStreets[name];
                newQuadras.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    numero: name,
                    status: 'nao_trabalhada',
                    lat: data.latSum / data.count,
                    lng: data.lngSum / data.count
                });
            });

            if (newQuadras.length === 0) {
                return showError('Nenhuma alameda nova detectada com o nome legível.');
            }

            const updatedQuadras = [...(grupo.quadras || []), ...newQuadras];
            db.updateServiceGroup(grupoId, { quadras: updatedQuadras });
            setGrupos(db.getServiceGroups());
            showSuccess(`${newQuadras.length} alamedas adicionadas!`);

        } catch (err) {
            console.error(err);
            showError('Erro ao detectar alamedas.');
        }
    };

    const handleDeleteQuadra = (grupoId: string, quadraId: string) => {
        if (window.confirm('Tem certeza que deseja remover esta quadra?')) {
            const grupo = grupos.find(g => g.id === grupoId);
            if (grupo && grupo.quadras) {
                const updatedQuadras = grupo.quadras.filter(q => q.id !== quadraId);
                db.updateServiceGroup(grupoId, { quadras: updatedQuadras });
                setGrupos(db.getServiceGroups());
                showSuccess('Quadra removida!');
            }
        }
    };

    // --- Funções: Membros ---
    const handleAddMember = (grupoId: string) => {
        if (!newMemberName.trim()) return;

        const grupo = grupos.find(g => g.id === grupoId);
        if (grupo) {
            const updatedMembros = [...(grupo.membros || []), newMemberName.trim()];
            db.updateServiceGroup(grupoId, { membros: updatedMembros });
            setGrupos(db.getServiceGroups());
        }
        setNewMemberName('');
        showSuccess('Membro adicionado!');
    };

    const handleDeleteMember = (grupoId: string, memberIndex: number) => {
        setMemberToDelete({ grupoId, memberIndex });
        setDeleteType('membro');
        setShowDeleteConfirm(true);
    };

    // --- Funções: Trabalhos ---
    const handleOpenTrabalhoModal = (grupoId?: string, trabalho?: TrabalhoTerritorio) => {
        if (trabalho) {
            setTrabalhoFormData({
                grupoId: trabalho.grupoId,
                data: trabalho.data,
                area: trabalho.area,
                observacoes: trabalho.observacoes,
                lines: trabalho.lines || []
            });
            setEditingTrabalhoId(trabalho.id);
        } else {
            setTrabalhoFormData({
                grupoId: grupoId || (grupos[0]?.id || ''),
                data: new Date().toISOString().split('T')[0],
                area: '',
                observacoes: '',
                lines: []
            });
            setEditingTrabalhoId(null);
        }
        setShowTrabalhoModal(true);
    };

    const handleSaveTrabalho = () => {
        if (!trabalhoFormData.area.trim()) {
            showError('Área trabalhada é obrigatória');
            return;
        }

        if (editingTrabalhoId !== null) {
            setTrabalhos(prev => prev.map(t => t.id === editingTrabalhoId ? { ...t, ...trabalhoFormData, id: editingTrabalhoId } : t));
            showSuccess('Trabalho atualizado!');
        } else {
            const newId = Math.max(...trabalhos.map(t => t.id), 0) + 1;
            const newTrabalho = { id: newId, ...trabalhoFormData };
            setTrabalhos([...trabalhos, newTrabalho]);
            showSuccess('Trabalho registrado!');
        }
        setShowTrabalhoModal(false);
    };

    const handleDownloadSnapshot = async () => {
        if (!snapshotRef.current) return;
        try {
            const grupo = grupos.find(g => g.id === trabalhoFormData.grupoId);
            const canvas = await html2canvas(snapshotRef.current, {
                useCORS: true,
                scale: 2,
                backgroundColor: '#ffffff',
                ignoreElements: (element) => element.classList.contains('no-print')
            });
            const link = document.createElement('a');
            link.download = `Registro-${grupo?.nome || 'Grupo'}-${trabalhoFormData.data.replace(/\//g, '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showSuccess('Imagem gerada com sucesso!');
        } catch (err) {
            console.error(err);
            showError('Erro ao gerar imagem.');
        }
    };

    // --- Exclusão ---
    const handleDelete = (id: number | string, type: 'grupo' | 'trabalho' | 'designacao') => {
        setDeletingId(id);
        setDeleteType(type);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        if (deleteType === 'membro' && memberToDelete) {
            const grupo = grupos.find(g => g.id === memberToDelete.grupoId);
            if (grupo) {
                const newMembros = [...(grupo.membros || [])];
                newMembros.splice(memberToDelete.memberIndex, 1);
                db.updateServiceGroup(memberToDelete.grupoId, { membros: newMembros });
                setGrupos(db.getServiceGroups());
            }
            showSuccess('Membro removido!');
            setMemberToDelete(null);
        } else if (deletingId) {
            if (deleteType === 'grupo') {
                db.deleteServiceGroup(String(deletingId));
                setGrupos(db.getServiceGroups());
                showSuccess('Grupo excluído com sucesso!');
                if (selectedGrupoId === deletingId) setSelectedGrupoId(null);
            } else if (deleteType === 'trabalho') {
                setTrabalhos(trabalhos.filter(t => t.id !== deletingId));
                showSuccess('Registro de trabalho excluído com sucesso!');
            } else if (deleteType === 'designacao') {
                setDesignacoes(designacoes.filter(d => d.id !== deletingId));
                showSuccess('Designação excluída.');
            }
        }
        setShowDeleteConfirm(false);
        setDeletingId(null);
    };

    const selectedGrupo = grupos.find(g => g.id === selectedGrupoId);

    if (!apiKey) {
        return (
            <div className="alert alert-danger m-4">
                API Key do Google Maps não configurada. Adicione VITE_GOOGLE_MAPS_API_KEY no arquivo .env
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Carregando mapa...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid p-0">
            {/* Cabeçalho de Abas */}
            <div className="mb-4">
                <h2 className="mb-3">Campo e Território</h2>
                <ul className="nav nav-tabs">
                    <li className="nav-item">
                        <button
                            className={`nav-link d-flex align-items-center gap-2 ${activeTab === 'territorio' ? 'active fw-bold' : ''}`}
                            onClick={() => { setActiveTab('territorio'); setSelectedGrupoId(null); }}
                        >
                            <FaMapMarkedAlt /> Território da Congregação
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link d-flex align-items-center gap-2 ${activeTab === 'grupos' ? 'active fw-bold' : ''}`}
                            onClick={() => { setActiveTab('grupos'); setSelectedGrupoId(null); }}
                        >
                            <FaUsers /> Grupos de Campo
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link d-flex align-items-center gap-2 ${activeTab === 'designacoes' ? 'active fw-bold' : ''}`}
                            onClick={() => { setActiveTab('designacoes'); setSelectedGrupoId(null); }}
                        >
                            <FaClipboardList /> Designações do Mês
                        </button>
                    </li>
                </ul>
            </div>

            {/* Conteúdo das Abas */}
            <div className="tab-content border border-top-0 rounded-bottom p-4 shadow-sm" style={{ minHeight: '60vh' }}>

                {/* ABA 1: TERRITÓRIO */}
                {activeTab === 'territorio' && (
                    <div className="fade show active">
                        <h5 className="mb-3 text-secondary">Mapa Geral dos Territórios</h5>
                        <MapaTerritorio grupos={grupos} readOnly={true} />
                        <div className="mt-3 row g-2">
                            {grupos.map(g => (
                                <div key={g.id} className="col-auto d-flex align-items-center gap-1">
                                    <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: g.cor }}></span>
                                    <small>{g.nome}</small>
                                </div>
                            ))}
                        </div>

                        {/* Registro de Atividades da Congregação */}
                        <div className="card shadow-sm mt-5">
                            <div className="card-header bg-light d-flex justify-content-between align-items-center">
                                <span className="fw-bold">Atividades da Congregação (Meio de Semana)</span>
                                <button className="btn btn-sm btn-success" onClick={() => handleOpenTrabalhoModal('CONGREGACAO')}>
                                    <FaPlus /> Registrar
                                </button>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover mb-0 align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Data</th>
                                            <th>Área</th>
                                            <th>Observações</th>
                                            <th style={{ width: 50 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trabalhos
                                            .filter(t => t.grupoId === 'CONGREGACAO')
                                            .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                                            .map((t) => (
                                                <tr key={t.id}>
                                                    <td>{new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                                    <td>{t.area}</td>
                                                    <td className="small text-muted">{t.observacoes}</td>
                                                    <td>
                                                        <div className="d-flex gap-2 justify-content-end">
                                                            <button className="btn btn-link text-primary p-0" title="Ver/Editar e Gerar Imagem" onClick={() => handleOpenTrabalhoModal('CONGREGACAO', t)}>
                                                                <FaImage />
                                                            </button>
                                                            <button className="btn btn-link text-danger p-0" title="Excluir" onClick={() => handleDelete(t.id, 'trabalho')}>
                                                                <FaTrash />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        {trabalhos.filter(t => t.grupoId === 'CONGREGACAO').length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="text-center text-muted py-3">Nenhum registro.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ABA 2: GRUPOS */}
                {activeTab === 'grupos' && (
                    <div className="fade show active">
                        {!selectedGrupoId ? (
                            // Lista de Grupos
                            <div className="row g-4">
                                {grupos.map((grupo) => (
                                    <div key={grupo.id} className="col-md-6 col-lg-3">
                                        <div
                                            className="card h-100 shadow-sm hover-shadow border-0"
                                            style={{ cursor: 'pointer', transition: 'transform 0.2s', borderTop: `5px solid ${grupo.cor}` }}
                                            onClick={() => setSelectedGrupoId(grupo.id)}
                                        >
                                            <div className="card-body text-center">
                                                <div className="mb-3">
                                                    <span className="badge rounded-pill bg-light text-dark border display-6 p-3">
                                                        <FaUsers size={24} color={grupo.cor} />
                                                    </span>
                                                </div>
                                                <h5 className="card-title fw-bold">{grupo.nome}</h5>
                                                <p className="text-muted small mb-3">{grupo.territorio || 'Sem território definido'}</p>

                                                <div className="text-start bg-light p-2 rounded small mb-3">
                                                    <div className="d-flex justify-content-between mb-1">
                                                        <span className="text-muted">Responsável:</span>
                                                        <strong className="text-truncate" style={{ maxWidth: '100px' }} title={grupo.responsavel}>{grupo.responsavel || '-'}</strong>
                                                    </div>
                                                    <div className="d-flex justify-content-between">
                                                        <span className="text-muted">Membros:</span>
                                                        <strong>{grupo.membros?.length || 0}</strong>
                                                    </div>
                                                </div>

                                                <button className="btn btn-outline-primary btn-sm w-100">
                                                    Gerenciar Grupo
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="col-12 text-end">
                                    <button className="btn btn-success" onClick={() => handleOpenGrupoModal()}>
                                        <FaPlus /> Novo Grupo
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Detalhes do Grupo
                            <div>
                                <div className="d-flex align-items-center mb-4 border-bottom pb-3">
                                    <button className="btn btn-outline-secondary btn-sm me-3" onClick={() => setSelectedGrupoId(null)}>
                                        <FaArrowLeft /> Voltar
                                    </button>
                                    <div>
                                        <h3 className="mb-0 text-primary">{selectedGrupo?.nome}</h3>
                                        <span className="text-muted small">{selectedGrupo?.territorio}</span>
                                    </div>
                                    <div className="ms-auto">
                                        <button className="btn btn-outline-primary btn-sm" onClick={() => handleOpenGrupoModal(selectedGrupo)}>
                                            <FaEdit /> Editar Dados
                                        </button>
                                    </div>
                                </div>

                                <div className="row g-4">
                                    <div className="col-lg-8">
                                        {/* Mapa do Grupo */}
                                        <div className="card shadow-sm mb-4">
                                            <div className="card-header bg-light fw-bold">Território do Grupo</div>
                                            <div className="card-body p-0">
                                                <MapaTerritorio
                                                    grupos={grupos}
                                                    editingGrupoId={selectedGrupoId}
                                                    onUpdateTerritorio={handleUpdateTerritorio}
                                                    onQuadraMove={handleMoveQuadra}
                                                    onQuadraToggle={handleToggleQuadraStatus}
                                                />
                                            </div>
                                        </div>

                                        {/* Histórico */}
                                        <div className="card shadow-sm">
                                            <div className="card-header bg-light d-flex justify-content-between align-items-center">
                                                <span className="fw-bold">Registro de Atividades</span>
                                                <button className="btn btn-sm btn-success" onClick={() => handleOpenTrabalhoModal(selectedGrupoId)}>
                                                    <FaPlus /> Registrar
                                                </button>
                                            </div>
                                            <div className="table-responsive">
                                                <table className="table table-hover mb-0 align-middle">
                                                    <thead className="table-header-gradient">
                                                        <tr>
                                                            <th>Data</th>
                                                            <th>Área</th>
                                                            <th>Observações</th>
                                                            <th style={{ width: 50 }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {trabalhos
                                                            .filter(t => t.grupoId === selectedGrupoId)
                                                            .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                                                            .map((t) => (
                                                                <tr key={t.id}>
                                                                    <td>{new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                                                    <td>{t.area}</td>
                                                                    <td className="small text-muted">{t.observacoes}</td>
                                                                    <td>
                                                                        <div className="d-flex gap-2 justify-content-end">
                                                                            <button className="btn btn-link text-primary p-0" title="Ver/Editar e Gerar Imagem" onClick={() => handleOpenTrabalhoModal(selectedGrupoId, t)}>
                                                                                <FaImage />
                                                                            </button>
                                                                            <button className="btn btn-link text-danger p-0" title="Excluir" onClick={() => handleDelete(t.id, 'trabalho')}>
                                                                                <FaTrash />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        {trabalhos.filter(t => t.grupoId === selectedGrupoId).length === 0 && (
                                                            <tr>
                                                                <td colSpan={4} className="text-center text-muted py-3">Nenhum registro.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-lg-4">
                                        <div className="card shadow-sm mb-4">
                                            <div className="card-header bg-light fw-bold">Quadras Internas / Alamedas</div>
                                            <div className="card-body">
                                                <div className="input-group mb-3">
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Nº ou Nome (ex: Q1, AI-12)..."
                                                        value={newQuadraNumero}
                                                        onChange={(e) => setNewQuadraNumero(e.target.value)}
                                                        onKeyPress={(e) => e.key === 'Enter' && selectedGrupoId && handleAddQuadra(selectedGrupoId)}
                                                    />
                                                    <button className="btn btn-sm btn-primary" onClick={() => selectedGrupoId && handleAddQuadra(selectedGrupoId)} title="Adicionar Manual">
                                                        <FaPlus />
                                                    </button>
                                                    <button className="btn btn-sm btn-warning" onClick={() => selectedGrupoId && handleAutoDetectQuadras(selectedGrupoId)} title="Detectar Alamedas Automaticamente">
                                                        <FaMagic />
                                                    </button>
                                                </div>

                                                {(!selectedGrupo?.quadras || selectedGrupo.quadras.length === 0) && (
                                                    <div className="text-muted small text-center my-3">Nenhuma quadra cadastrada.</div>
                                                )}

                                                <div className="d-flex flex-wrap gap-2">
                                                    {selectedGrupo?.quadras?.map((q) => (
                                                        <div
                                                            key={q.id}
                                                            className={`border rounded p-2 d-flex align-items-center justify-content-between gap-2 ${q.status === 'trabalhada' ? 'bg-success text-white' : 'bg-light'}`}
                                                            style={{ minWidth: '45%', flex: '1 1 auto' }}
                                                        >
                                                            <div
                                                                className="d-flex flex-column"
                                                                style={{ cursor: 'pointer' }}
                                                                onClick={() => handleToggleQuadraStatus(selectedGrupoId!, q.id)}
                                                            >
                                                                <span className="fw-bold">{q.numero}</span>
                                                                <span className={`badge ${q.status === 'trabalhada' ? 'bg-light text-success' : 'bg-secondary'} rounded-pill`} style={{ fontSize: '0.6rem' }}>
                                                                    {q.status === 'trabalhada' ? 'TRABALHADA' : 'PENDENTE'}
                                                                </span>
                                                            </div>
                                                            <button
                                                                className={`btn btn-link p-0 ms-auto ${q.status === 'trabalhada' ? 'text-white' : 'text-danger'}`}
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteQuadra(selectedGrupoId!, q.id); }}
                                                                title="Remover"
                                                            >
                                                                <FaTrash size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="card shadow-sm">
                                            <div className="card-header bg-light fw-bold">Membros</div>
                                            <div className="card-body">
                                                <div className="input-group mb-3">
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Novo membro..."
                                                        value={newMemberName}
                                                        onChange={(e) => setNewMemberName(e.target.value)}
                                                        onKeyPress={(e) => e.key === 'Enter' && handleAddMember(selectedGrupoId!)}
                                                    />
                                                    <button className="btn btn-sm btn-primary" onClick={() => handleAddMember(selectedGrupoId!)}>Add</button>
                                                </div>
                                                <ul className="list-group list-group-flush">
                                                    <li className="list-group-item bg-light">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <FaUserTie className="text-primary" />
                                                            <div>
                                                                <div className="fw-bold small">Responsável</div>
                                                                <div>{selectedGrupo?.responsavel || '-'}</div>
                                                            </div>
                                                        </div>
                                                    </li>
                                                    <li className="list-group-item bg-light">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <FaUserTie className="text-secondary" />
                                                            <div>
                                                                <div className="fw-bold small">Assistente</div>
                                                                <div>{selectedGrupo?.assistente || '-'}</div>
                                                            </div>
                                                        </div>
                                                    </li>
                                                    {selectedGrupo?.membros?.map((m, idx) => (
                                                        <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                                                            <span>{m}</span>
                                                            <button className="btn btn-sm text-secondary hover-danger" onClick={() => handleDeleteMember(selectedGrupoId!, idx)}>&times;</button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ABA 3: DESIGNAÇÕES */}
                {activeTab === 'designacoes' && (
                    <div className="fade show active">
                        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                            <div>
                                <h5 className="mb-1 text-secondary">Escala para Saída de Campo</h5>
                                <p className="small text-muted mb-0">Gerencie as saídas diurnas e noturnas (Quinta/Sexta)</p>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                                <label className="fw-bold">Mês:</label>
                                <input
                                    type="month"
                                    className="form-control"
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(e.target.value)}
                                />
                            </div>

                            <div className="btn-group">
                                <button
                                    className="btn btn-outline-danger d-flex align-items-center gap-2"
                                    onClick={() => {
                                        if (designacoes.length === 0) return showError('Nenhuma designação para exportar.');
                                        const filtered = designacoes.filter(d => d.data.startsWith(selectedMonth));
                                        if (filtered.length === 0) {
                                            showError('Nenhuma designação neste mês para exportar.');
                                            return;
                                        }
                                        const [y, m] = selectedMonth.split('-');
                                        const dateObj = new Date(parseInt(y), parseInt(m) - 1);
                                        const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                                        exportCampoPDF(filtered, monthName);
                                        showSuccess('PDF Gerado com sucesso!');
                                    }}
                                >
                                    <FaFilePdf /> PDF
                                </button>
                                <button
                                    className="btn btn-outline-secondary d-flex align-items-center gap-2"
                                    onClick={() => setShowPreviewExport(true)}
                                >
                                    <FaEye /> Preview
                                </button>

                                <button
                                    className="btn btn-outline-secondary d-flex align-items-center gap-2"
                                    onClick={async () => {
                                        if (!printRef.current) return;
                                        const filtered = designacoes.filter(d => d.data.startsWith(selectedMonth));
                                        if (filtered.length === 0) {
                                            showError('Nenhuma designação neste mês para exportar.');
                                            return;
                                        }

                                        // Make it visible locally for capture if needed, or just capture it
                                        try {
                                            const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true });
                                            const link = document.createElement('a');
                                            link.download = `Campo-${selectedMonth}.png`;
                                            link.href = canvas.toDataURL('image/png');
                                            link.click();
                                            showSuccess('Imagem gerada com sucesso!');
                                        } catch (err) {
                                            console.error(err);
                                            showError('Erro ao gerar imagem.');
                                        }
                                    }}
                                >
                                    <FaImage /> PNG
                                </button>
                            </div>

                            <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowGerarModal(true)}>
                                <FaMagic /> Criar
                            </button>
                        </div>

                        {/* Hidden Print Container for PNG Generation */}
                        <div style={{ position: 'absolute', top: -9999, left: -9999, width: '1200px', backgroundColor: 'white' }}>
                            <div ref={printRef} className="p-5 bg-white text-dark" style={{ fontFamily: 'Arial, sans-serif' }}>
                                <PrintableSchedule designacoes={designacoes} selectedMonth={selectedMonth} />
                            </div>
                        </div>

                        <div className="table-responsive section-to-print">
                            <table className="table table-bordered table-hover align-middle shadow-sm bg-white">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '12%' }}>Data</th>
                                        <th style={{ width: '10%' }}>Dia</th>
                                        <th style={{ width: '8%' }}>Hora</th>
                                        <th style={{ width: '15%' }}>Território</th>
                                        <th style={{ width: '25%' }}>Local</th>
                                        <th style={{ width: '20%' }}>Dirigente</th>
                                        <th style={{ width: '10%' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {designacoes
                                        .filter(d => d.data.startsWith(selectedMonth))
                                        .sort((a, b) => new Date(a.data + 'T' + a.hora).getTime() - new Date(b.data + 'T' + b.hora).getTime())
                                        .map((d) => (
                                            <tr key={d.id}>
                                                <td>{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                                <td>{d.diaSemana}</td>
                                                <td>{d.hora}</td>
                                                <td>{d.territorio}</td>
                                                <td>{d.local}</td>
                                                <td className="fw-bold text-primary">{d.dirigente}</td>
                                                <td>
                                                    <div className="d-flex gap-2">
                                                        <button className="btn btn-sm btn-outline-primary" onClick={() => handleEditDesignacao(d)} title="Editar">
                                                            <FaEdit />
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(d.id, 'designacao')} title="Excluir">
                                                            <FaTrash />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    {designacoes.filter(d => d.data.startsWith(selectedMonth)).length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-5 text-muted">
                                                Nenhuma designação encontrada para este mês.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>


            {/* Modais de Edição */}
            <Modal
                isOpen={showGrupoModal}
                onClose={() => setShowGrupoModal(false)}
                title={editingGrupo ? 'Editar Grupo' : 'Novo Grupo'}
                size="md"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowGrupoModal(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleSaveGrupo}>{editingGrupo ? 'Atualizar' : 'Salvar'}</button>
                    </>
                }
            >
                <div className="mb-3">
                    <label className="form-label">Nome do Grupo</label>
                    <input type="text" className="form-control" value={grupoFormData.nome} onChange={e => setGrupoFormData({ ...grupoFormData, nome: e.target.value })} />
                </div>
                <div className="mb-3">
                    <label className="form-label">Responsável</label>
                    <PersonSelector value={grupoFormData.responsavel} onChange={v => setGrupoFormData({ ...grupoFormData, responsavel: v })} source="speakers" label="Responsável" genderFilter="M" />
                </div>
                <div className="mb-3">
                    <label className="form-label">Assistente</label>
                    <PersonSelector value={grupoFormData.assistente} onChange={v => setGrupoFormData({ ...grupoFormData, assistente: v })} source="speakers" label="Assistente" genderFilter="M" />
                </div>
                <div className="mb-3">
                    <label className="form-label">Território</label>
                    <input type="text" className="form-control" value={grupoFormData.territorio} onChange={e => setGrupoFormData({ ...grupoFormData, territorio: e.target.value })} placeholder="Area Central" />
                </div>
                <div className="mb-3">
                    <label className="form-label">Cor</label>
                    <input type="color" className="form-control form-control-color" value={grupoFormData.cor} onChange={e => setGrupoFormData({ ...grupoFormData, cor: e.target.value })} />
                </div>
            </Modal>

            <Modal
                isOpen={showTrabalhoModal}
                onClose={() => setShowTrabalhoModal(false)}
                title={editingTrabalhoId ? "Editar Registro de Trabalho" : "Registrar Trabalho"}
                size="xl"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowTrabalhoModal(false)}>Fechar</button>
                        <button className="btn btn-outline-primary" onClick={handleDownloadSnapshot}>
                            <FaImage className="me-2" /> Baixar Foto
                        </button>
                        <button className="btn btn-success" onClick={handleSaveTrabalho}>Salvar</button>
                    </>
                }
            >
                <div className="row g-3 mb-3">
                    <div className="col-md-3">
                        <label className="form-label">Data</label>
                        <input type="date" className="form-control" value={trabalhoFormData.data} onChange={e => setTrabalhoFormData({ ...trabalhoFormData, data: e.target.value })} />
                    </div>
                    <div className="col-md-5">
                        <label className="form-label">Área Trabalhada (Descrição)</label>
                        <input type="text" className="form-control" value={trabalhoFormData.area} onChange={e => setTrabalhoFormData({ ...trabalhoFormData, area: e.target.value })} placeholder="Ex: Quadra 10, Alameda 5..." />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Observações</label>
                        <input type="text" className="form-control" value={trabalhoFormData.observacoes} onChange={e => setTrabalhoFormData({ ...trabalhoFormData, observacoes: e.target.value })} placeholder="Opcional" />
                    </div>
                </div>

                <div className="alert alert-info small py-2 mb-2 no-print">
                    <FaMagic className="me-2" />
                    Use o lápis para desenhar no mapa a área trabalhada. O desenho será salvo com o registro.
                </div>

                <div ref={snapshotRef} className="bg-white p-2 border rounded position-relative">
                    <div className="card mb-2 shadow-sm border-primary" style={{ borderLeft: '5px solid #0d6efd' }}>
                        <div className="card-body py-2">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 className="mb-0 fw-bold text-primary">Registro de Atividade</h5>
                                    <small className="text-secondary">{trabalhoFormData.grupoId === 'CONGREGACAO' ? 'Congregação (Meio de Semana)' : grupos.find(g => g.id === trabalhoFormData.grupoId)?.nome}</small>
                                </div>
                                <div className="text-end">
                                    <div className="fw-bold">{new Date(trabalhoFormData.data + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                                </div>
                            </div>
                            <hr className="my-1" />
                            <div>
                                <span className="fw-bold small text-uppercase text-muted me-2">Área:</span>
                                <span className="fs-6">{trabalhoFormData.area || '...'}</span>
                            </div>
                            {trabalhoFormData.observacoes && (
                                <div className="mt-1">
                                    <span className="fw-bold small text-uppercase text-muted me-2">Obs:</span>
                                    <span className="small">{trabalhoFormData.observacoes}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ height: '500px', border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden' }}>
                        <MapaTerritorio
                            grupos={grupos}
                            editingGrupoId={trabalhoFormData.grupoId === 'CONGREGACAO' ? null : trabalhoFormData.grupoId}
                            readOnly={false}
                            onUpdateTerritorio={undefined}
                            extraPolylines={trabalhoFormData.lines}
                            onCustomPolylineComplete={(path) => setTrabalhoFormData(prev => ({ ...prev, lines: [...(prev.lines || []), path] }))}
                            onExtraPolylinesChange={(path) => setTrabalhoFormData(prev => ({ ...prev, lines: path }))} // Callback para apagar linhas
                            hideExistingTerritories={trabalhoFormData.grupoId === 'CONGREGACAO' ? false : true}
                        />
                    </div>
                </div>
                <div className="mt-2 text-end no-print">
                    <button className="btn btn-outline-danger btn-sm" onClick={() => setTrabalhoFormData(prev => ({ ...prev, lines: [] }))}>
                        <FaTrash className="me-1" /> Limpar Desenho
                    </button>
                </div>
            </Modal>

            <Modal
                isOpen={showDesignacaoModal}
                onClose={() => setShowDesignacaoModal(false)}
                title={designacaoForm.id ? "Editar Designação" : "Nova Designação"}
                size="md"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowDesignacaoModal(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleSaveDesignacao}>Salvar</button>
                    </>
                }
            >
                <div className="row g-2">
                    <div className="col-md-6 mb-3">
                        <label className="form-label">Data</label>
                        <input type="date" className="form-control" value={designacaoForm.data} onChange={e => {
                            const date = new Date(e.target.value + 'T00:00:00');
                            const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                            setDesignacaoForm({ ...designacaoForm, data: e.target.value, diaSemana: days[date.getDay()] || '' });
                        }} />
                    </div>
                    <div className="col-md-6 mb-3">
                        <label className="form-label">Dia</label>
                        <input type="text" className="form-control bg-light" value={designacaoForm.diaSemana} readOnly />
                    </div>
                </div>
                <div className="mb-3">
                    <label className="form-label">Hora</label>
                    <input type="time" className="form-control" value={designacaoForm.hora} onChange={e => setDesignacaoForm({ ...designacaoForm, hora: e.target.value })} />
                </div>
                <div className="mb-3">
                    <label className="form-label">Local</label>
                    <input type="text" className="form-control" value={designacaoForm.local} onChange={e => setDesignacaoForm({ ...designacaoForm, local: e.target.value })} />
                </div>
                <div className="mb-3">
                    <label className="form-label">Território</label>
                    <input type="text" className="form-control" value={designacaoForm.territorio} onChange={e => setDesignacaoForm({ ...designacaoForm, territorio: e.target.value })} placeholder="Ex: ARNO 72" />
                </div>
                <div className="mb-3">
                    <label className="form-label">Dirigente</label>
                    <PersonSelector
                        value={designacaoForm.dirigente}
                        onChange={v => setDesignacaoForm({ ...designacaoForm, dirigente: v })}
                        source="all"
                        label="Dirigente"
                        genderFilter="M"
                        roleFilter="Dirigente de Campo"
                    />
                </div>
            </Modal>

            {/* Modal Gerar Escala Automática */}
            <Modal
                isOpen={showGerarModal}
                onClose={() => setShowGerarModal(false)}
                title={`Gerar Escala - ${new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
                size="xl"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowGerarModal(false)}>Cancelar</button>
                        <button className="btn btn-success" onClick={confirmGeracao}>Salvar Escala</button>
                    </>
                }
            >
                <div className="row mb-3 align-items-end">
                    <div className="col-md-2">
                        <label className="form-label small fw-bold">Mês de Referência</label>
                        <input
                            type="month"
                            className="form-control form-control-sm mb-1"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                        />
                    </div>
                    {[1, 2, 3, 4, 5].map(week => (
                        <div key={week} className="col-md-2">
                            <label className="form-label small fw-bold">Semana {week}</label>
                            <input
                                type="text"
                                className="form-control form-control-sm mb-1"
                                placeholder="Território..."
                                value={autoConfig.weeklyTerritories[week] || ''}
                                onChange={e => setAutoConfig((c: typeof autoConfig) => ({ ...c, weeklyTerritories: { ...c.weeklyTerritories, [week]: e.target.value } }))}
                            />
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Local..."
                                value={autoConfig.weeklyLocals[week] || ''}
                                onChange={e => setAutoConfig((c: typeof autoConfig) => ({ ...c, weeklyLocals: { ...c.weeklyLocals, [week]: e.target.value } }))}
                            />
                        </div>
                    ))}
                    <div className="col-md-2">
                        <button className="btn btn-primary btn-sm w-100" onClick={handlePreview}>Aplicar</button>
                    </div>
                </div>

                <div>
                    <div className="alert alert-info small mb-2 p-2">
                        <strong>Escala Gerada:</strong> Os dirigentes foram preenchidos conforme padrão. Você pode editar qualquer célula abaixo antes de salvar.
                    </div>

                    <div className="table-responsive border rounded mb-4" style={{ maxHeight: '400px' }}>
                        <table className="table table-sm table-striped mb-0 align-middle">
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th style={{ width: '20%' }} className="text-center">DIA</th>
                                    <th style={{ width: '20%' }} className="text-center">TERRITÓRIO</th>
                                    <th style={{ width: '10%' }} className="text-center">HORÁRIO</th>
                                    <th style={{ width: '25%' }} className="text-center">LOCAL DE SAÍDA</th>
                                    <th style={{ width: '25%' }} className="text-center">DIRIGENTE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewDesignacoes
                                    .filter(d => parseInt(d.hora.split(':')[0]) < 18)
                                    .map((d) => {
                                        const originalIndex = previewDesignacoes.findIndex(p => p.id === d.id);
                                        return (
                                            <tr key={d.id}>
                                                <td className="text-center">
                                                    <div className="fw-bold">{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                                                    <div className="small text-muted">{d.diaSemana}</div>
                                                </td>
                                                <td className="text-center">
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm border-0 bg-transparent text-center"
                                                        value={d.territorio}
                                                        placeholder="Definir Território..."
                                                        onChange={e => {
                                                            const updated = [...previewDesignacoes];
                                                            updated[originalIndex].territorio = e.target.value; // Update safe index
                                                            setPreviewDesignacoes(updated);
                                                        }}
                                                    />
                                                </td>
                                                <td className="text-center">{d.hora}</td>
                                                <td className="text-center">{d.local}</td>
                                                <td className="text-center">
                                                    <PersonSelector
                                                        value={d.dirigente}
                                                        onChange={v => {
                                                            const updated = [...previewDesignacoes];
                                                            updated[originalIndex].dirigente = v;
                                                            setPreviewDesignacoes(updated);
                                                        }}
                                                        source="all"
                                                        label="Selecione..."
                                                        genderFilter="M"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                {/* Footer Domingo */}
                                <tr className="fw-bold bg-light">
                                    <td className="text-center">Domingo</td>
                                    <td className="text-center"></td>
                                    <td className="text-center">08:30</td>
                                    <td colSpan={2} className="text-center">Cada publicador no seu respectivo grupo</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h5 className="text-center fw-bold text-danger mt-4 mb-2">CAMPO À NOITE</h5>
                    <div className="table-responsive border rounded" style={{ maxHeight: '300px' }}>
                        <table className="table table-sm table-striped mb-0 align-middle">
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th style={{ width: '20%' }} className="text-center">DIA</th>
                                    <th style={{ width: '20%' }} className="text-center">TERRITÓRIO</th>
                                    <th style={{ width: '10%' }} className="text-center">HORÁRIO</th>
                                    <th style={{ width: '25%' }} className="text-center">LOCAL DE SAÍDA</th>
                                    <th style={{ width: '25%' }} className="text-center">DIRIGENTE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewDesignacoes
                                    .filter(d => parseInt(d.hora.split(':')[0]) >= 18)
                                    .map((d) => {
                                        const originalIndex = previewDesignacoes.findIndex(p => p.id === d.id);
                                        return (
                                            <tr key={d.id}>
                                                <td className="text-center">
                                                    <div className="fw-bold">{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                                                    <div className="small text-muted">{d.diaSemana}</div>
                                                </td>
                                                <td className="text-center">
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm border-0 bg-transparent text-center"
                                                        value={d.territorio}
                                                        placeholder="Definir Território..."
                                                        onChange={e => {
                                                            const updated = [...previewDesignacoes];
                                                            updated[originalIndex].territorio = e.target.value;
                                                            setPreviewDesignacoes(updated);
                                                        }}
                                                    />
                                                </td>
                                                <td className="text-center">{d.hora}</td>
                                                <td className="text-center">{d.local}</td>
                                                <td className="text-center">
                                                    <PersonSelector
                                                        value={d.dirigente}
                                                        onChange={v => {
                                                            const updated = [...previewDesignacoes];
                                                            updated[originalIndex].dirigente = v;
                                                            setPreviewDesignacoes(updated);
                                                        }}
                                                        source="all"
                                                        label="Selecione..."
                                                        genderFilter="M"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Confirmar Exclusão"
                message={deleteType === 'membro' ? "Remover este membro?" : "Tem certeza que deseja excluir?"}
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmText="Excluir"
                variant="danger"
            />

            {/* Preview Export Modal */}
            <Modal
                isOpen={showPreviewExport}
                onClose={() => setShowPreviewExport(false)}
                title="Visualização para Impressão"
                size="xl"
                footer={<button className="btn btn-secondary" onClick={() => setShowPreviewExport(false)}>Fechar</button>}
            >
                <div className="p-4 bg-white text-dark border">
                    <PrintableSchedule designacoes={designacoes} selectedMonth={selectedMonth} />
                </div>
            </Modal>


        </div >
    );
};

export default Campo;
