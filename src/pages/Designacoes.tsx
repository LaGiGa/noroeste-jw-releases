import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaRandom, FaFilePdf, FaFilter, FaEye, FaFileImage } from 'react-icons/fa';
import { DISCURSOS_COMPLETOS } from '../data/discursos';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { showSuccess, showError, showInfo } from '../utils/toast';
import { db } from '../services/database';
import type { Person, IndicatorAssignment } from '../services/database';
import { IndicatorExportPreview } from '../components/IndicatorExportPreview';
import { PersonSelector } from '../components/PersonSelector';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const Designacoes: React.FC = () => {
    const location = useLocation();
    const initialTab = (() => {
        try {
            const params = new URLSearchParams(location.search);
            const tab = params.get('tab') as 'designacoes' | 'sortear' | null;
            if (tab === 'sortear' || tab === 'designacoes') return tab;
        } catch { void 0; }
        return 'designacoes';
    })();
    const [activeTab, setActiveTab] = useState<'designacoes' | 'sortear'>(initialTab);
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());

    // State for Modals and Actions
    const [showModal, setShowModal] = useState(false);
    const [showSpecialEventModal, setShowSpecialEventModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingDesignacao, setEditingDesignacao] = useState<IndicatorAssignment | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [specialEventData, setSpecialEventData] = useState({
        date: '',
        name: 'ASSEMBLEIA DE CIRCUITO'
    });

    const [formData, setFormData] = useState<Partial<IndicatorAssignment>>({
        date: '',
        type: 'domingo',
        theme: '',
        speaker: '',
        president: '',
        reader: '',
        hospitality: '',
        entranceIndicator: '',
        auditoriumIndicator: '',
        audio: '',
        video: '',
        mic1: '',
        mic2: ''
    });

    const [pessoas, setPessoas] = useState<Person[]>([]);
    const [designacoes, setDesignacoes] = useState<IndicatorAssignment[]>([]);

    useEffect(() => {
        setPessoas(db.getPersons().sort((a, b) => a.name.localeCompare(b.name)));
        setDesignacoes(db.getIndicatorAssignments());
    }, []);

    // Handlers for Designacoes
    const handleOpenModal = (designacao?: IndicatorAssignment) => {
        if (designacao) {
            setEditingDesignacao(designacao);
            setFormData({ ...designacao });
        } else {
            setEditingDesignacao(null);
            setFormData({
                date: '',
                type: 'domingo',
                theme: '',
                speaker: '',
                president: '',
                reader: '',
                hospitality: '',
                entranceIndicator: '',
                auditoriumIndicator: '',
                audio: '',
                video: '',
                mic1: '',
                mic2: ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingDesignacao(null);
    };

    const handleSave = () => {
        if (!formData.date || !formData.theme) {
            showError('Data e Tema são obrigatórios');
            return;
        }

        if (editingDesignacao) {
            db.updateIndicatorAssignment(editingDesignacao.id, formData);
            showSuccess('Designação atualizada com sucesso!');
        } else {
            db.addIndicatorAssignment(formData as Omit<IndicatorAssignment, 'id'>);
            showSuccess('Designação criada com sucesso!');
        }
        setDesignacoes(db.getIndicatorAssignments());
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        setDeletingId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        if (deletingId) {
            db.deleteIndicatorAssignment(deletingId);
            setDesignacoes(db.getIndicatorAssignments());
            showSuccess('Designação excluída com sucesso!');
        }
        setShowDeleteConfirm(false);
        setDeletingId(null);
    };

    const sortearDesignacoes = () => {
        const datas = gerarDatasReunioes(mes, ano);
        let count = 0;
        const lastUsedMaps = getLastUsedMap();

        datas.forEach(({ data, tipo }) => {
            const designacaoExistente = designacoes.find(d => d.date === data);

            // Se não existe ou se existe mas está vazia (sem pessoas escaladas)
            const isEmpty = !designacaoExistente || (
                !designacaoExistente.speaker &&
                !designacaoExistente.president &&
                !designacaoExistente.reader &&
                !designacaoExistente.audio &&
                !designacaoExistente.video &&
                !designacaoExistente.mic1 &&
                !designacaoExistente.mic2
            );

            if (isEmpty) {
                const designacao = sortearDesignacaoParaData(data, tipo, lastUsedMaps);
                if (designacao) {
                    if (designacaoExistente) {
                        db.updateIndicatorAssignment(designacaoExistente.id, designacao);
                    } else {
                        db.addIndicatorAssignment(designacao);
                    }
                    count++;
                }
            }
        });

        setDesignacoes(db.getIndicatorAssignments());
        if (count > 0) {
            showSuccess(`${count} designações sorteadas com sucesso!`);
        } else {
            showInfo('Nenhuma nova designação necessária para este mês.');
        }
    };

    const gerarDatasReunioes = (mes: number, ano: number) => {
        const datas: { data: string; tipo: 'domingo' | 'quarta' }[] = [];
        const diasNoMes = new Date(ano, mes, 0).getDate();

        for (let dia = 1; dia <= diasNoMes; dia++) {
            const data = new Date(ano, mes - 1, dia);
            const diaSemana = data.getDay();

            if (diaSemana === 0) {
                datas.push({ data: data.toISOString().split('T')[0], tipo: 'domingo' });
            } else if (diaSemana === 3) {
                datas.push({ data: data.toISOString().split('T')[0], tipo: 'quarta' });
            }
        }

        return datas;
    };

    const isPersonAvailable = (person: Person, targetDate: string): boolean => {
        if (!person.unavailability || person.unavailability.length === 0) return true;

        // Use string comparison for safety with YYYY-MM-DD format
        const target = targetDate;

        return !person.unavailability.some(u => {
            return target >= u.startDate && target <= u.endDate;
        });
    };

    const getLastUsedMap = () => {
        const maps = {
            all: new Map<string, number>() // Qualquer designação
        };

        const all = db.getIndicatorAssignments();
        all.forEach(a => {
            const time = new Date(a.date).getTime();
            const updateMap = (name?: string) => {
                if (!name) return;
                maps.all.set(name, Math.max(maps.all.get(name) ?? 0, time));
            };

            updateMap(a.speaker);
            updateMap(a.president);
            updateMap(a.reader);
            updateMap(a.hospitality);
            updateMap(a.entranceIndicator);
            updateMap(a.auditoriumIndicator);
            updateMap(a.audio);
            updateMap(a.video);
            updateMap(a.mic1);
            updateMap(a.mic2);
        });

        return maps;
    };

    const sortearDesignacaoParaData = (data: string, tipo: 'domingo' | 'quarta', lastUsedMaps: any): Omit<IndicatorAssignment, 'id'> | null => {
        const pessoasDisponiveis = pessoas.filter(p => p.active && !p.moved && isPersonAvailable(p, data));
        const pessoasUsadas = new Set<string>();

        const sortearParaFuncao = (funcao: string): string | undefined => {
            const checkRole = (p: Person, f: string) => {
                const a = p.assignments;
                const hasAssignments = a && Object.values(a).some(v => v === true);

                if (hasAssignments) {
                    switch (f) {
                        case 'Presidente': return !!a.president || !!a.publicMeetingPresident;
                        case 'Leitor': return !!a.reader || !!a.watchtowerReader;
                        case 'Orador': return !!a.publicTalkSpeaker; // No Indicators/School pool here
                        case 'Indicador': return !!a.indicator || !!a.indicatorEntrance || !!a.indicatorAuditorium;
                        case 'Áudio': return !!a.sound;
                        case 'Vídeo': return !!a.videoOperator || !!a.videoZoom;
                        case 'Mic. Volante': return !!a.mic;
                        case 'Hospitalidade': return !!a.hospitality;
                        default: return false;
                    }
                }

                // Fallback para roles legado
                return p.roles && p.roles.includes(f);
            };

            const pessoasAptas = pessoasDisponiveis.filter(
                pessoa => checkRole(pessoa, funcao) && !pessoasUsadas.has(pessoa.id)
            );

            if (pessoasAptas.length === 0) return undefined;

            const sorted = [...pessoasAptas].sort((a, b) => {
                const lastA = lastUsedMaps.all.get(a.name) ?? 0;
                const lastB = lastUsedMaps.all.get(b.name) ?? 0;
                if (lastA !== lastB) return lastA - lastB;
                return Math.random() - 0.5;
            });

            const pessoaSorteada = sorted[0];
            pessoasUsadas.add(pessoaSorteada.id);
            lastUsedMaps.all.set(pessoaSorteada.name, new Date(data).getTime());

            return pessoaSorteada.name;
        };

        const designacao: Omit<IndicatorAssignment, 'id'> = {
            date: data,
            type: tipo,
            theme: tipo === 'domingo' ? 'Tema a definir' : 'Vida e Ministério'
        };

        if (tipo === 'domingo') {
            designacao.speaker = sortearParaFuncao('Orador');
            designacao.president = sortearParaFuncao('Presidente');
            designacao.reader = sortearParaFuncao('Leitor');
        } else {
            designacao.president = sortearParaFuncao('Presidente');
            designacao.reader = sortearParaFuncao('Leitor');
        }

        designacao.hospitality = sortearParaFuncao('Hospitalidade');
        designacao.entranceIndicator = sortearParaFuncao('Indicador');
        designacao.auditoriumIndicator = sortearParaFuncao('Indicador');
        designacao.audio = sortearParaFuncao('Áudio');
        designacao.video = sortearParaFuncao('Vídeo');
        designacao.mic1 = sortearParaFuncao('Mic. Volante');
        designacao.mic2 = sortearParaFuncao('Mic. Volante');

        return designacao;
    };

    const formatarData = (dataStr: string) => {
        const [year, month, day] = dataStr.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0).toLocaleDateString('pt-BR');
    };

    const handleAddSpecialEvent = () => {
        if (!specialEventData.date || !specialEventData.name) {
            showError('Data e Nome do Evento são obrigatórios');
            return;
        }

        const [y, m, d] = specialEventData.date.split('-').map(Number);
        const domingo = new Date(y, m - 1, d, 12, 0, 0);

        const quarta = new Date(domingo);
        quarta.setDate(domingo.getDate() - 4);

        const dataDom = domingo.toISOString().split('T')[0];
        const dataQua = quarta.toISOString().split('T')[0];

        const eventUpper = specialEventData.name.toUpperCase();

        db.addIndicatorAssignment({
            date: dataQua,
            type: 'quarta',
            theme: `NÃO HAVERÁ REUNIÃO - ${eventUpper}`,
            speaker: '', president: '', reader: '', hospitality: '', entranceIndicator: '', auditoriumIndicator: '', audio: '', video: '', mic1: '', mic2: ''
        });

        db.addIndicatorAssignment({
            date: dataDom,
            type: 'domingo',
            theme: eventUpper,
            speaker: '', president: '', reader: '', hospitality: '', entranceIndicator: '', auditoriumIndicator: '', audio: '', video: '', mic1: '', mic2: ''
        });

        setDesignacoes(db.getIndicatorAssignments());
        setShowSpecialEventModal(false);
        showSuccess(`Evento "${specialEventData.name}" adicionado com sucesso!`);
    };

    const handleExportPDF = async () => {
        const element = document.getElementById('indicator-pdf-preview');
        if (!element) return;

        try {
            showSuccess('Gerando PDF (A4 Vertical), aguarde...');

            const widthPx = 794;  // 210mm
            const heightPx = 1123; // 297mm

            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = `${widthPx}px`;
            container.style.height = `${heightPx}px`;
            container.style.zIndex = '99999';
            container.style.backgroundColor = '#ffffff';
            container.style.opacity = '0';

            const clone = element.cloneNode(true) as HTMLElement;
            clone.style.margin = '0';
            clone.style.width = `${widthPx}px`;
            clone.style.height = `${heightPx}px`;
            clone.style.transform = 'none';

            container.appendChild(clone);
            document.body.appendChild(container);

            // Aumentar para 3 segundos para garantir fontes customizadas
            await new Promise(resolve => setTimeout(resolve, 3000));

            const canvas = await html2canvas(clone, {
                scale: 4,
                useCORS: true,
                logging: false,
                width: widthPx,
                height: heightPx,
                windowWidth: widthPx,
                windowHeight: heightPx,
                backgroundColor: '#ffffff',
                foreignObjectRendering: false
            });

            document.body.removeChild(container);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
            pdf.save(`designacoes_indicador_${mes}_${ano}.pdf`);
            showSuccess('PDF exportado com sucesso!');
        } catch (error) {
            console.error(error);
            showError('Erro ao exportar PDF');
            const container = document.querySelector('div[style*="z-index: 99999"]');
            if (container) document.body.removeChild(container);
        }
    };

    const handleExportPNG = async () => {
        const element = document.getElementById('indicator-export-preview');
        if (!element) return;

        try {
            showSuccess('Gerando PNG, aguarde...');

            const widthPx = 794; // Portrait width

            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = `${widthPx}px`;
            container.style.zIndex = '99999';
            container.style.backgroundColor = '#ffffff';
            container.style.opacity = '0';

            const clone = element.cloneNode(true) as HTMLElement;
            clone.style.margin = '0';
            clone.style.width = `${widthPx}px`;
            clone.style.height = 'auto'; // Garante que cresça conforme o conteúdo
            clone.style.transform = 'none';

            container.appendChild(clone);
            document.body.appendChild(container);

            await new Promise(resolve => setTimeout(resolve, 3000));

            const canvas = await html2canvas(clone, {
                scale: 4,
                useCORS: true,
                logging: false,
                width: widthPx,
                backgroundColor: '#ffffff',
                foreignObjectRendering: false
            });

            document.body.removeChild(container);

            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            link.download = `designacoes_indicador_${mes}_${ano}.png`;
            link.click();
            showSuccess('PNG exportado com sucesso!');
        } catch (error) {
            console.error(error);
            showError('Erro ao exportar PNG');
            const container = document.querySelector('div[style*="z-index: 99999"]');
            if (container) document.body.removeChild(container);
        }
    };

    const designacoesFiltradas = designacoes.filter(d => {
        const dataObj = new Date(d.date);
        return dataObj.getMonth() + 1 === mes && dataObj.getFullYear() === ano;
    });

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">Indicador - Congregação Noroeste</h2>
                <div className="btn-group">
                    <button
                        className={`btn ${activeTab === 'designacoes' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setActiveTab('designacoes')}
                    >
                        Designações
                    </button>
                    <button
                        className={`btn ${activeTab === 'sortear' ? 'btn-success' : 'btn-outline-success'}`}
                        onClick={() => setActiveTab('sortear')}
                    >
                        <FaRandom className="me-2" /> Sortear
                    </button>
                    <button
                        className="btn btn-outline-danger"
                        onClick={() => setShowPreviewModal(true)}
                    >
                        <FaEye className="me-2" /> Visualizar / Exportar
                    </button>
                </div>
            </div>

            {/* Tab: Designações */}
            {activeTab === 'designacoes' && (
                <div>
                    <div className="card mb-4 border-0 shadow-sm">
                        <div className="card-body">
                            <div className="row g-3 align-items-end">
                                <div className="col-md-3">
                                    <label className="form-label text-muted small fw-bold text-uppercase">Mês</label>
                                    <select className="form-select" value={mes} onChange={(e) => setMes(parseInt(e.target.value))}>
                                        {[...Array(12)].map((_, i) => (
                                            <option key={i + 1} value={i + 1}>
                                                {new Date(2025, i).toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label text-muted small fw-bold text-uppercase">Ano</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={ano}
                                        onChange={(e) => setAno(parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label text-muted small fw-bold text-uppercase">Congregação</label>
                                    <select className="form-select" disabled>
                                        <option>Congregação Noroeste</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-outline-warning w-100" onClick={() => {
                                            setSpecialEventData({ date: `${ano}-${String(mes).padStart(2, '0')}-01`, name: 'ASSEMBLEIA DE CIRCUITO' });
                                            setShowSpecialEventModal(true);
                                        }}>
                                            <FaPlus /> Evento
                                        </button>
                                        <button className="btn btn-primary w-100" onClick={() => handleOpenModal()}>
                                            <FaPlus /> Novo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabela */}
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="mb-0 text-primary">
                                    <FaFilter className="me-2" />
                                    Designações de {new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long' })}/{ano}
                                </h5>
                                <span className="badge bg-light text-dark border">
                                    Total: {designacoesFiltradas.length}
                                </span>
                            </div>

                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="border-0 rounded-start">Data</th>
                                            <th className="border-0">Tipo</th>
                                            <th className="border-0">Tema</th>
                                            <th className="border-0">Equipe Principal</th>
                                            <th className="border-0">Indicadores</th>
                                            <th className="border-0">Mic. Volantes</th>
                                            <th className="border-0">Áudio/Vídeo</th>
                                            <th className="border-0 rounded-end text-end">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {designacoesFiltradas.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="text-center py-5 text-muted">
                                                    <div className="mb-3">
                                                        <FaRandom size={32} className="opacity-25" />
                                                    </div>
                                                    <p className="mb-0">Nenhuma designação encontrada.</p>
                                                    <small>Use a aba "Sortear" para gerar automaticamente ou o botão "Novo" para adicionar manualmente.</small>
                                                </td>
                                            </tr>
                                        ) : (
                                            designacoesFiltradas.map(d => (
                                                <tr key={d.id}>
                                                    <td className="fw-bold text-nowrap">{formatarData(d.date)}</td>
                                                    <td>
                                                        <span className={`badge ${d.type === 'domingo' ? 'bg-primary' : 'bg-info'} bg-opacity-10 text-${d.type === 'domingo' ? 'primary' : 'info'} border border-${d.type === 'domingo' ? 'primary' : 'info'} border-opacity-25`}>
                                                            {d.type === 'domingo' ? 'Domingo' : 'Quarta'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="small text-wrap" style={{ maxWidth: '200px' }}>{d.theme}</div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex flex-column gap-1 small">
                                                            {d.speaker && <div><span className="text-muted">Orador:</span> {d.speaker}</div>}
                                                            {d.president && <div><span className="text-muted">Pres:</span> {d.president}</div>}
                                                            {d.reader && <div><span className="text-muted">Leitor:</span> {d.reader}</div>}
                                                            {d.hospitality && <div><span className="text-muted">Hosp:</span> {d.hospitality}</div>}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex flex-column gap-1 small">
                                                            {d.entranceIndicator && <div><span className="text-muted">Entrada:</span> {d.entranceIndicator}</div>}
                                                            {d.auditoriumIndicator && <div><span className="text-muted">Auditório:</span> {d.auditoriumIndicator}</div>}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex flex-column gap-1 small">
                                                            {d.mic1 && <div>1: {d.mic1}</div>}
                                                            {d.mic2 && <div>2: {d.mic2}</div>}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex flex-column gap-1 small">
                                                            {d.audio && <div><span className="text-muted">Som:</span> {d.audio}</div>}
                                                            {d.video && <div><span className="text-muted">Vídeo:</span> {d.video}</div>}
                                                        </div>
                                                    </td>
                                                    <td className="text-end">
                                                        <div className="btn-group">
                                                            <button className="btn btn-sm btn-outline-primary" onClick={() => handleOpenModal(d)} title="Editar">
                                                                <FaEdit />
                                                            </button>
                                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(d.id)} title="Excluir">
                                                                <FaTrash />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Sortear */}
            {activeTab === 'sortear' && (
                <div className="row justify-content-center">
                    <div className="col-md-8">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body p-4">
                                <div className="text-center mb-4">
                                    <div className="bg-success bg-opacity-10 text-success rounded-circle d-inline-flex p-3 mb-3">
                                        <FaRandom size={32} />
                                    </div>
                                    <h4>Sortear Designações Automaticamente</h4>
                                    <p className="text-muted">Gere a escala do mês inteiro com um clique</p>
                                </div>

                                <div className="row g-3 mb-4 justify-content-center">
                                    <div className="col-md-5">
                                        <label className="form-label fw-bold text-muted small text-uppercase">Mês</label>
                                        <select className="form-select form-select-lg" value={mes} onChange={(e) => setMes(parseInt(e.target.value))}>
                                            {[...Array(12)].map((_, i) => (
                                                <option key={i + 1} value={i + 1}>
                                                    {new Date(2025, i).toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-5">
                                        <label className="form-label fw-bold text-muted small text-uppercase">Ano</label>
                                        <input
                                            type="number"
                                            className="form-control form-select-lg"
                                            value={ano}
                                            onChange={(e) => setAno(parseInt(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div className="alert alert-light border-0 bg-light rounded-3 p-4 mb-4">
                                    <h6 className="fw-bold mb-3 text-primary"><i className="fas fa-info-circle me-2"></i>Como funciona o sorteio:</h6>
                                    <ul className="list-unstyled mb-0 d-grid gap-2">
                                        <li className="d-flex align-items-center"><span className="text-success me-2">✓</span> A mesma pessoa NÃO pode ter múltiplas funções no mesmo dia</li>
                                        <li className="d-flex align-items-center"><span className="text-success me-2">✓</span> Distribuição mais aleatória entre todos os participantes</li>
                                        <li className="d-flex align-items-center"><span className="text-success me-2">✓</span> Considera as funções que cada pessoa pode exercer</li>
                                        <li className="d-flex align-items-center"><span className="text-success me-2">✓</span> Gera designações para todas as quartas e domingos do mês</li>
                                        <li className="d-flex align-items-center"><span className="text-success me-2">✓</span> Prioriza pessoas que não foram designadas recentemente</li>
                                    </ul>
                                </div>

                                <div className="d-grid">
                                    <button className="btn btn-success btn-lg py-3 fw-bold" onClick={sortearDesignacoes}>
                                        <FaRandom className="me-2" /> Sortear Designações
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Designações Noroeste */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={editingDesignacao ? 'Editar Designação' : 'Nova Designação'}
                size="lg"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={handleCloseModal}>
                            Cancelar
                        </button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            {editingDesignacao ? 'Atualizar' : 'Salvar'}
                        </button>
                    </>
                }
            >
                <div className="row g-3">
                    <div className="col-md-4">
                        <label className="form-label text-uppercase text-muted fw-bold small">Data *</label>
                        <input
                            type="date"
                            className="form-select"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label text-uppercase text-muted fw-bold small">Tipo</label>
                        <select
                            className="form-select"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'domingo' | 'quarta' })}
                        >
                            <option value="domingo">Domingo</option>
                            <option value="quarta">Quarta-feira</option>
                        </select>
                    </div>
                    <div className="col-md-4">
                        <label className="form-label text-uppercase text-muted fw-bold small">Tema *</label>
                        {formData.type === 'domingo' ? (
                            <select
                                className="form-select"
                                value={formData.theme}
                                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                            >
                                <option value="">Selecione um tema...</option>
                                {DISCURSOS_COMPLETOS.map(d => (
                                    <option key={d.numero} value={`${d.numero}. ${d.tema}`}>
                                        {d.numero}. {d.tema}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                className="form-control"
                                value={formData.theme}
                                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                            />
                        )}
                    </div>

                    {/* Orador / Presidente / Leitor */}
                    <div className="col-md-4">
                        <label className="form-label text-uppercase text-muted fw-bold small">Presidente</label>
                        <PersonSelector
                            value={formData.president || ''}
                            onChange={(name) => setFormData({ ...formData, president: name })}
                            source="all"
                            assignmentFilter={formData.type === 'domingo' ? 'publicMeetingPresident' : 'president'}
                            label="Presidente"
                            date={formData.date}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label text-uppercase text-muted fw-bold small">Leitor</label>
                        <PersonSelector
                            value={formData.reader || ''}
                            onChange={(name) => setFormData({ ...formData, reader: name })}
                            source="all"
                            assignmentFilter={formData.type === 'domingo' ? 'watchtowerReader' : 'reader'}
                            label="Leitor"
                            date={formData.date}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label text-uppercase text-muted fw-bold small">Orador</label>
                        <PersonSelector
                            value={formData.speaker || ''}
                            onChange={(name) => setFormData({ ...formData, speaker: name })}
                            source="all"
                            assignmentFilter="publicTalkSpeaker"
                            label="Orador"
                            placeholder={formData.type === 'quarta' ? 'Não aplicável' : 'Selecione...'}
                            date={formData.date}
                        />
                    </div>

                    {/* Indicadores */}
                    <div className="col-md-6">
                        <label className="form-label text-uppercase text-muted fw-bold small">Indicador Entrada</label>
                        <PersonSelector
                            value={formData.entranceIndicator || ''}
                            onChange={(name) => setFormData({ ...formData, entranceIndicator: name })}
                            source="all"
                            assignmentFilter="indicator"
                            label="Indicador Entrada"
                            date={formData.date}
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label text-uppercase text-muted fw-bold small">Indicador Auditório</label>
                        <PersonSelector
                            value={formData.auditoriumIndicator || ''}
                            onChange={(name) => setFormData({ ...formData, auditoriumIndicator: name })}
                            source="all"
                            assignmentFilter="indicator"
                            label="Indicador Auditório"
                            date={formData.date}
                        />
                    </div>

                    {/* Mics */}
                    <div className="col-md-6">
                        <label className="form-label text-uppercase text-muted fw-bold small">Mic. Volante 1</label>
                        <PersonSelector
                            value={formData.mic1 || ''}
                            onChange={(name) => setFormData({ ...formData, mic1: name })}
                            source="all"
                            assignmentFilter="mic"
                            label="Mic. Volante 1"
                            date={formData.date}
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label text-uppercase text-muted fw-bold small">Mic. Volante 2</label>
                        <PersonSelector
                            value={formData.mic2 || ''}
                            onChange={(name) => setFormData({ ...formData, mic2: name })}
                            source="all"
                            assignmentFilter="mic"
                            label="Mic. Volante 2"
                            date={formData.date}
                        />
                    </div>

                    {/* Audio / Video / Hospitalidade */}
                    <div className="col-md-4">
                        <label className="form-label text-uppercase text-muted fw-bold small">Áudio</label>
                        <PersonSelector
                            value={formData.audio || ''}
                            onChange={(name) => setFormData({ ...formData, audio: name })}
                            source="all"
                            assignmentFilter="sound"
                            label="Operador de Áudio"
                            date={formData.date}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label text-uppercase text-muted fw-bold small">Vídeo</label>
                        <PersonSelector
                            value={formData.video || ''}
                            onChange={(name) => setFormData({ ...formData, video: name })}
                            source="all"
                            assignmentFilter="videoOperator"
                            label="Operador de Vídeo"
                            date={formData.date}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label text-uppercase text-muted fw-bold small">Hospitalidade</label>
                        <PersonSelector
                            value={formData.hospitality || ''}
                            onChange={(name) => setFormData({ ...formData, hospitality: name })}
                            source="all"
                            assignmentFilter="hospitality"
                            label="Hospitalidade"
                            date={formData.date}
                        />
                    </div>
                </div>
            </Modal >

            {/* Preview Modal */}
            < Modal
                isOpen={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                title="Visualizar e Exportar"
                size="xl"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowPreviewModal(false)}>
                            Fechar
                        </button>
                        <button className="btn btn-success" onClick={handleExportPNG}>
                            <FaFileImage /> Baixar PNG
                        </button>
                        <button className="btn btn-danger" onClick={handleExportPDF}>
                            <FaFilePdf /> Baixar PDF
                        </button>
                    </>
                }
            >
                <div className="bg-light border p-4 rounded text-center d-flex justify-content-center overflow-auto">
                    <div className="shadow-lg d-inline-block bg-white">
                        <IndicatorExportPreview
                            month={mes}
                            year={ano}
                            assignments={designacoesFiltradas}
                            orientation="portrait"
                        />
                    </div>
                </div>

                {/* Hidden Portrait Preview for PDF */}
                <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
                    <IndicatorExportPreview
                        id="indicator-pdf-preview"
                        month={mes}
                        year={ano}
                        assignments={designacoesFiltradas}
                        orientation="portrait"
                    />
                </div>
            </Modal >

            {/* Modal: Evento Especial */}
            < Modal
                isOpen={showSpecialEventModal}
                onClose={() => setShowSpecialEventModal(false)}
                title="Adicionar Evento Especial"
            >
                <div className="mb-3">
                    <label className="form-label text-uppercase text-muted fw-bold small">Data do Domingo do Evento:</label>
                    <input
                        type="date"
                        className="form-control"
                        value={specialEventData.date}
                        onChange={(e) => setSpecialEventData({ ...specialEventData, date: e.target.value })}
                    />
                    <div className="form-text">O sistema criará automaticamente a "Não haverá reunião" na quarta anterior.</div>
                </div>
                <div className="mb-4">
                    <label className="form-label text-uppercase text-muted fw-bold small">Nome do Evento:</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Ex: ASSEMBLEIA DE CIRCUITO"
                        value={specialEventData.name}
                        onChange={(e) => setSpecialEventData({ ...specialEventData, name: e.target.value })}
                    />
                </div>
                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn-secondary" onClick={() => setShowSpecialEventModal(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleAddSpecialEvent}>Salvar Evento</button>
                </div>
            </Modal >

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onCancel={() => setShowDeleteConfirm(false)}
                onConfirm={confirmDelete}
                title="Excluir Designação"
                message="Tem certeza que deseja excluir esta designação?"
                confirmText="Excluir"
                variant="danger"
            />
        </div >
    );
};
