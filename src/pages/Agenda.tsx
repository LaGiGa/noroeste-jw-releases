import React, { useState, useEffect, useMemo } from 'react';
import { FaPlus, FaEdit, FaTrash, FaFilePdf, FaCalendarAlt, FaHistory, FaBook, FaUsers, FaCalendarCheck } from 'react-icons/fa';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { exportAgendaPDF } from '../services/pdfExport';
import { showSuccess, showError } from '../utils/toast';
import { Discursos } from './Discursos';
import { Historico } from './Historico';
import { Oradores } from './Oradores';
import { EventosEspeciais } from './EventosEspeciais';
import { db } from '../services/database';
import type { ScheduleItem, Speaker, Congregation, Speech, SpecialEvent } from '../services/database';

const AgendaMain: React.FC = () => {
    const [oradores, setOradores] = useState<Speaker[]>([]);
    const [agendamentos, setAgendamentos] = useState<ScheduleItem[]>([]);
    const [congregacoes, setCongregacoes] = useState<Congregation[]>([]);
    const [speeches, setSpeeches] = useState<Speech[]>([]);
    const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>([]);

    const [showModal, setShowModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingAgendamento, setEditingAgendamento] = useState<ScheduleItem | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Filtros
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        speaker: '',
        congregation: '', // Congregação de destino (Local)
    });

    const [formData, setFormData] = useState({
        data: '',
        horario: '09:30',
        tema: '',
        orador: '',
        congregacao: '', // Origem
        location: '',    // Destino
        host: '',
        speechNumber: 0 as string | number
    });

    // Carregar dados do banco
    useEffect(() => {
        Promise.resolve().then(() => {
            setOradores(db.getSpeakers());
            setAgendamentos(db.getSchedule());
            setCongregacoes(db.getCongregations());
            setSpeeches(db.getSpeeches());
            setSpecialEvents(db.getSpecialEvents());
        });
    }, []);

    const handleOpenModal = (agendamento?: ScheduleItem) => {
        if (agendamento) {
            setEditingAgendamento(agendamento);
            setFormData({
                data: agendamento.date,
                horario: agendamento.time,
                tema: agendamento.speechTheme,
                orador: agendamento.speakerName,
                congregacao: agendamento.congregation,
                location: agendamento.location || '',
                host: agendamento.host || '',
                speechNumber: agendamento.speechNumber
            });
        } else {
            setEditingAgendamento(null);
            setFormData({
                data: '',
                horario: '09:30',
                tema: '',
                orador: '',
                congregacao: '',
                location: '',
                host: '',
                speechNumber: 0
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingAgendamento(null);
        setFormData({ data: '', horario: '09:30', tema: '', orador: '', congregacao: '', location: '', host: '', speechNumber: 0 });
    };

    const handleSave = () => {
        if (!formData.data) {
            showError('Data é obrigatória');
            return;
        }

        // Verificar se a data está bloqueada por um evento especial
        const selectedDate = new Date(formData.data + 'T00:00:00');
        const blockedEvent = specialEvents.find(event => {
            const startDate = new Date(event.startDate + 'T00:00:00');
            const endDate = new Date(event.endDate + 'T00:00:00');
            return selectedDate >= startDate && selectedDate <= endDate;
        });

        if (blockedEvent) {
            showError(`Não é possível agendar nesta data. Evento: ${blockedEvent.description} (${new Date(blockedEvent.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(blockedEvent.endDate + 'T00:00:00').toLocaleDateString('pt-BR')})`);
            return;
        }

        if (!formData.tema.trim()) {
            showError('Tema não pode estar vazio');
            return;
        }

        if (!formData.orador.trim()) {
            showError('Orador não pode estar vazio');
            return;
        }

        const itemData: Omit<ScheduleItem, 'id'> = {
            date: formData.data,
            time: formData.horario,
            speechNumber: formData.speechNumber,
            speechTheme: formData.tema,
            speakerName: formData.orador,
            congregation: formData.congregacao,
            location: formData.location || undefined,
            host: formData.host || undefined,
            meetingTime: formData.horario // Salvando o horário da reunião da cong. de destino
        };

        if (editingAgendamento) {
            db.updateScheduleItem(editingAgendamento.id, itemData);
            showSuccess('Agendamento atualizado com sucesso!');
        } else {
            db.addScheduleItem(itemData);
            showSuccess('Agendamento criado com sucesso!');
        }

        setAgendamentos(db.getSchedule());
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        setDeletingId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        if (deletingId) {
            db.deleteScheduleItem(deletingId);
            setAgendamentos(db.getSchedule());
            showSuccess('Agendamento excluído com sucesso!');
        }
        setShowDeleteConfirm(false);
        setDeletingId(null);
    };

    const filteredAgendamentos = agendamentos.filter(a => {
        if (filters.startDate && a.date < filters.startDate) return false;
        if (filters.endDate && a.date > filters.endDate) return false;
        if (filters.speaker && a.speakerName !== filters.speaker) return false;
        if (filters.congregation && (a.location || a.congregation) !== filters.congregation) return false;
        return true;
    });

    const handleExportPDF = () => {
        const dataForPdf = filteredAgendamentos.map(a => {
            const getCongCity = (name: string) => {
                const cong = congregacoes.find(c => c.name === name);
                return cong?.city ? ` - ${cong.city}` : '';
            };

            return {
                data: a.date,
                horario: a.time,
                tema: a.speechTheme,
                orador: a.speakerName,
                congregacao: a.congregation + getCongCity(a.congregation),
                local: (a.location || a.congregation) + getCongCity(a.location || a.congregation),
                anfitrao: a.host
            };
        });

        const periodLabel = filters.startDate && filters.endDate
            ? `${new Date(filters.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(filters.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
            : 'Geral';

        exportAgendaPDF(dataForPdf, periodLabel);
        showSuccess('PDF exportado com sucesso!');
    };

    const sortedAgendamentos = [...filteredAgendamentos].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Combinar agendamentos e eventos especiais para exibição
    const combinedItems = useMemo(() => {
        const items: Array<{ type: 'agendamento' | 'evento', data: ScheduleItem | SpecialEvent, date: string }> = [];

        // Adicionar agendamentos
        sortedAgendamentos.forEach(ag => {
            items.push({ type: 'agendamento', data: ag, date: ag.date });
        });

        // Adicionar eventos especiais (filtrados se houver filtro de data)
        specialEvents.forEach(ev => {
            const eventStart = new Date(ev.startDate);
            const eventEnd = new Date(ev.endDate);

            // Aplicar filtros de data se existirem
            let shouldInclude = true;
            if (filters.startDate) {
                const filterStart = new Date(filters.startDate);
                if (eventEnd < filterStart) shouldInclude = false;
            }
            if (filters.endDate) {
                const filterEnd = new Date(filters.endDate);
                if (eventStart > filterEnd) shouldInclude = false;
            }

            if (shouldInclude) {
                items.push({ type: 'evento', data: ev, date: ev.startDate });
            }
        });

        // Ordenar por data
        return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [sortedAgendamentos, specialEvents, filters.startDate, filters.endDate]);


    // Encontrar orador selecionado para obter discursos e telefone
    const selectedSpeaker = oradores.find(s => s.name === formData.orador);

    // Obter discursos preparados do orador selecionado
    const discursosPreparados = useMemo(() => {
        if (!selectedSpeaker) return [];

        return speeches.filter(d => {
            // Verifica se o orador tem esse discurso (comparando como string e number)
            const matchesSpeaker = selectedSpeaker.qualifiedSpeeches.includes(d.number as number) ||
                selectedSpeaker.qualifiedSpeeches.map(String).includes(String(d.number));

            // Verifica regra de "Não usar até"
            let isRestricted = false;
            if (d.doNotUseUntil && formData.data) {
                isRestricted = new Date(d.doNotUseUntil) > new Date(formData.data);
            }

            return matchesSpeaker && !isRestricted;
        });
    }, [selectedSpeaker, speeches, formData.data]);

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">Agenda</h2>
                <div className="d-flex gap-2">
                    <button className="btn btn-outline-primary" onClick={handleExportPDF}>
                        <FaFilePdf /> Exportar PDF
                    </button>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <FaPlus /> Novo Agendamento
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="card mb-4 shadow-sm border-0">
                <div className="card-body bg-light rounded">
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label small fw-bold">Data Início</label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small fw-bold">Data Fim</label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small fw-bold">Orador</label>
                            <select
                                className="form-select form-select-sm"
                                value={filters.speaker}
                                onChange={(e) => setFilters({ ...filters, speaker: e.target.value })}
                            >
                                <option value="">Todos</option>
                                {oradores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small fw-bold">Local/Congregação</label>
                            <select
                                className="form-select form-select-sm"
                                value={filters.congregation}
                                onChange={(e) => setFilters({ ...filters, congregation: e.target.value })}
                            >
                                <option value="">Todas</option>
                                {congregacoes.map(c => (
                                    <option key={c.id} value={c.name}>
                                        {c.name}{c.city ? ` - ${c.city}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {(filters.startDate || filters.endDate || filters.speaker || filters.congregation) && (
                        <div className="mt-2 text-end">
                            <button
                                className="btn btn-link btn-sm text-muted"
                                onClick={() => setFilters({ startDate: '', endDate: '', speaker: '', congregation: '' })}
                            >
                                Limpar Filtros
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabela */}
            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle">
                            <thead className="table-header-gradient text-white">
                                <tr>
                                    <th className="ps-3">Data</th>
                                    <th>Horário</th>
                                    <th>Tema</th>
                                    <th>Orador / Origem</th>
                                    <th>Local do Discurso</th>
                                    <th>Anfitrião</th>
                                    <th className="text-end pe-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {combinedItems.map((item) => {
                                    if (item.type === 'evento') {
                                        const evento = item.data as SpecialEvent;
                                        const isSameDay = evento.startDate === evento.endDate;
                                        const getEventTypeLabel = (type: SpecialEvent['type']): string => {
                                            const labels: Record<SpecialEvent['type'], string> = {
                                                VISITA_SUPERINTENDENTE: 'Visita do Superintendente',
                                                ASSEMBLEIA: 'Assembleia',
                                                CONGRESSO: 'Congresso',
                                                CELEBRACAO: 'Celebração',
                                                OUTRO: 'Outro'
                                            };
                                            return labels[type];
                                        };
                                        const getEventTypeBadgeClass = (type: SpecialEvent['type']): string => {
                                            const classes: Record<SpecialEvent['type'], string> = {
                                                VISITA_SUPERINTENDENTE: 'bg-primary',
                                                ASSEMBLEIA: 'bg-success',
                                                CONGRESSO: 'bg-info',
                                                CELEBRACAO: 'bg-warning',
                                                OUTRO: 'bg-secondary'
                                            };
                                            return classes[type];
                                        };

                                        return (
                                            <tr key={`evento-${evento.id}`} className="table-warning bg-opacity-10">
                                                <td className="ps-3 fw-bold">
                                                    {new Date(evento.startDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                    {!isSameDay && (
                                                        <div className="small text-muted">
                                                            até {new Date(evento.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td colSpan={2}>
                                                    <span className={`badge ${getEventTypeBadgeClass(evento.type)} me-2`}>
                                                        {evento.customTypeName || getEventTypeLabel(evento.type)}
                                                    </span>
                                                    <span className="fw-bold">{evento.description}</span>
                                                </td>
                                                <td>
                                                    {evento.speakerName || <span className="text-muted">-</span>}
                                                </td>
                                                <td colSpan={3} className="text-muted fst-italic">
                                                    Evento Especial - Sem agendamentos neste período
                                                </td>
                                            </tr>
                                        );
                                    } else {
                                        const agendamento = item.data as ScheduleItem;
                                        return (
                                            <tr key={agendamento.id}>
                                                <td className="ps-3 fw-bold">{new Date(agendamento.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                                <td>{agendamento.time}</td>
                                                <td>
                                                    <div className="fw-bold text-primary">#{agendamento.speechNumber}</div>
                                                    <div className="small text-wrap" style={{ maxWidth: '200px' }}>{agendamento.speechTheme}</div>
                                                </td>
                                                <td>
                                                    <div className="fw-bold">{agendamento.speakerName}</div>
                                                    <div className="small text-muted">{agendamento.congregation}</div>
                                                </td>
                                                <td>
                                                    <div className="fw-bold">
                                                        {agendamento.location || agendamento.congregation}
                                                        {(() => {
                                                            const name = agendamento.location || agendamento.congregation;
                                                            const cong = congregacoes.find(c => c.name === name);
                                                            return cong?.city ? ` - ${cong.city}` : '';
                                                        })()}
                                                    </div>
                                                    {agendamento.location === 'Noroeste' || (!agendamento.location && agendamento.congregation === 'Noroeste') ? (
                                                        <div className="badge bg-success-subtle text-success border border-success-subtle">Local</div>
                                                    ) : (
                                                        <div className="badge bg-info-subtle text-info border border-info-subtle">Fora</div>
                                                    )}
                                                </td>
                                                <td>{agendamento.host || '-'}</td>
                                                <td className="text-end pe-3">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary me-1 border-0"
                                                        onClick={() => handleOpenModal(agendamento)}
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger border-0"
                                                        onClick={() => handleDelete(agendamento.id)}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }
                                })}
                            </tbody>
                        </table>
                    </div>
                    {sortedAgendamentos.length === 0 && (
                        <div className="p-5 text-center">
                            <FaCalendarAlt size={48} className="text-muted mb-3 opacity-25" />
                            <p className="text-muted mb-0">Nenhum agendamento encontrado para os filtros selecionados</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Criar/Editar */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={editingAgendamento ? 'Editar Agendamento' : 'Novo Agendamento'}
                size="lg"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={handleCloseModal}>
                            Cancelar
                        </button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            {editingAgendamento ? 'Atualizar' : 'Salvar'}
                        </button>
                    </>
                }
            >
                <div className="row">
                    <div className="col-md-4 mb-3">
                        <label className="form-label fw-bold">Data *</label>
                        <input
                            type="date"
                            className="form-control"
                            value={formData.data}
                            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                        />
                        {formData.data && (() => {
                            const selectedDate = new Date(formData.data + 'T00:00:00');
                            const blockedEvent = specialEvents.find(event => {
                                const startDate = new Date(event.startDate + 'T00:00:00');
                                const endDate = new Date(event.endDate + 'T00:00:00');
                                return selectedDate >= startDate && selectedDate <= endDate;
                            });
                            if (blockedEvent) {
                                return (
                                    <small className="text-danger d-block mt-1">
                                        ⚠️ Data bloqueada: {blockedEvent.description}
                                    </small>
                                );
                            }
                            return null;
                        })()}
                    </div>
                    <div className="col-md-4 mb-3">
                        <label className="form-label fw-bold">Horário Reunião *</label>
                        <input
                            type="time"
                            className="form-control"
                            value={formData.horario}
                            onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                        />
                    </div>
                    <div className="col-md-4 mb-3">
                        <label className="form-label fw-bold">Anfitrião</label>
                        <input
                            type="text"
                            className="form-control"
                            value={formData.host}
                            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                            placeholder="Nome do anfitrião"
                        />
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6 mb-3">
                        <label className="form-label fw-bold">Orador *</label>
                        <select
                            className="form-select"
                            value={formData.orador}
                            onChange={(e) => {
                                const selectedOradorName = e.target.value;
                                const speaker = oradores.find(s => s.name === selectedOradorName);
                                setFormData({
                                    ...formData,
                                    orador: selectedOradorName,
                                    congregacao: speaker ? speaker.congregation : '',
                                    location: (speaker && (speaker.congregation !== 'Noroeste' || !speaker.approvedForOutside)) ? 'Noroeste' : '',
                                    tema: '', // Limpar tema ao trocar orador
                                    speechNumber: 0
                                });
                            }}
                        >
                            <option value="">Selecione um orador</option>
                            {[...oradores].sort((a, b) => a.name.localeCompare(b.name)).map(speaker => (
                                <option key={speaker.id} value={speaker.name}>
                                    {speaker.name} ({speaker.congregation})
                                </option>
                            ))}
                        </select>
                        {selectedSpeaker && (
                            <small className="text-muted d-block mt-1">
                                📞 {selectedSpeaker.phone || 'Sem telefone'} | Origem: {selectedSpeaker.congregation}
                            </small>
                        )}
                    </div>

                    <div className="col-md-6 mb-3">
                        <label className="form-label fw-bold">Local do Discurso *</label>
                        <select
                            className="form-select"
                            value={formData.location}
                            onChange={(e) => {
                                const loc = e.target.value;
                                const cong = congregacoes.find(c => c.name === loc);
                                setFormData({
                                    ...formData,
                                    location: loc,
                                    horario: cong?.meetingTime || formData.horario // Pega o horário da congregação se disponível
                                });
                            }}
                        >
                            <option value="">Selecione onde será o discurso</option>
                            {[...congregacoes]
                                .filter(c => {
                                    // Noroeste é SEMPRE uma opção (Local)
                                    if (c.name === 'Noroeste') return true;

                                    // Outras congregações apenas se o orador for DA Noroeste e estiver aprovado para fora
                                    return selectedSpeaker?.congregation === 'Noroeste' && selectedSpeaker?.approvedForOutside;
                                })
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(cong => (
                                    <option key={cong.id} value={cong.name}>
                                        {cong.name}{cong.city ? ` - ${cong.city}` : ''} {cong.meetingTime ? `(${cong.meetingTime})` : ''}
                                    </option>
                                ))}
                        </select>
                        <small className="text-muted d-block mt-1">
                            Selecione a congregação onde o orador fará o discurso.
                        </small>
                    </div>
                </div>

                <div className="mb-3">
                    <label className="form-label fw-bold">
                        Tema do Discurso *
                        {formData.orador && <small className="text-muted ms-2">({discursosPreparados.length} preparados)</small>}
                    </label>
                    <select
                        className="form-select"
                        value={formData.tema}
                        onChange={(e) => {
                            const selectedTheme = e.target.value;
                            const discurso = speeches.find(d => d.theme === selectedTheme);
                            setFormData({
                                ...formData,
                                tema: selectedTheme,
                                speechNumber: discurso ? discurso.number : 0
                            });
                        }}
                        disabled={!formData.orador}
                    >
                        <option value="">
                            {formData.orador ? 'Selecione um discurso preparado' : 'Selecione um orador primeiro'}
                        </option>
                        {discursosPreparados.map(discurso => (
                            <option key={discurso.id} value={discurso.theme}>
                                {discurso.number} - {discurso.theme}
                            </option>
                        ))}
                    </select>
                    {formData.orador && discursosPreparados.length === 0 && (
                        <small className="text-warning d-block mt-1">
                            ⚠️ Este orador não tem discursos preparados cadastrados. Mostrando lista completa.
                        </small>
                    )}
                </div>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Excluir Agendamento"
                message="Tem certeza que deseja excluir este agendamento?"
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmText="Excluir"
                variant="danger"
            />
        </div>
    );
};

export const Agenda: React.FC = () => {
    const [activeTab, setActiveTab] = useState('agenda');

    return (
        <div className="container-fluid p-0">
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'agenda' ? 'active' : ''}`}
                        onClick={() => setActiveTab('agenda')}
                    >
                        <FaCalendarAlt className="me-2" />
                        Agenda
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'eventos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('eventos')}
                    >
                        <FaCalendarCheck className="me-2" />
                        Eventos Especiais
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'oradores' ? 'active' : ''}`}
                        onClick={() => setActiveTab('oradores')}
                    >
                        <FaUsers className="me-2" />
                        Oradores
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'discursos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('discursos')}
                    >
                        <FaBook className="me-2" />
                        Discursos
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'historico' ? 'active' : ''}`}
                        onClick={() => setActiveTab('historico')}
                    >
                        <FaHistory className="me-2" />
                        Histórico
                    </button>
                </li>
            </ul>

            <div className="tab-content">
                {activeTab === 'agenda' && <AgendaMain />}
                {activeTab === 'eventos' && <EventosEspeciais />}
                {activeTab === 'oradores' && <Oradores />}
                {activeTab === 'discursos' && <Discursos />}
                {activeTab === 'historico' && <Historico />}
            </div>
        </div>
    );
};
