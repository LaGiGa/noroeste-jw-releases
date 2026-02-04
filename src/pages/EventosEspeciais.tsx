import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaCalendarCheck, FaExclamationTriangle } from 'react-icons/fa';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { showSuccess, showError } from '../utils/toast';
import { db } from '../services/database';
import type { SpecialEvent, Speaker } from '../services/database';

export const EventosEspeciais: React.FC = () => {
    const [eventos, setEventos] = useState<SpecialEvent[]>([]);
    const [speakers, setSpeakers] = useState<Speaker[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingEvento, setEditingEvento] = useState<SpecialEvent | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        description: '',
        type: 'OUTRO' as SpecialEvent['type'],
        customTypeName: '',
        speakerName: '',
        hostName: '',
        location: '',
        time: ''
    });

    // Carregar dados do banco
    useEffect(() => {
        loadEventos();
        setSpeakers(db.getSpeakers().sort((a, b) => a.name.localeCompare(b.name)));
    }, []);

    const loadEventos = () => {
        setEventos(db.getSpecialEvents());
    };

    const handleOpenModal = (evento?: SpecialEvent) => {
        if (evento) {
            setEditingEvento(evento);
            setFormData({
                startDate: evento.startDate,
                endDate: evento.endDate,
                description: evento.description,
                type: evento.type,
                customTypeName: evento.customTypeName || '',
                speakerName: evento.speakerName || '',
                hostName: evento.hostName || '',
                location: evento.location || '',
                time: evento.time || ''
            });
        } else {
            setEditingEvento(null);
            setFormData({
                startDate: '',
                endDate: '',
                description: '',
                type: 'OUTRO',
                customTypeName: '',
                speakerName: '',
                hostName: '',
                location: '',
                time: ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingEvento(null);
        setFormData({
            startDate: '',
            endDate: '',
            description: '',
            type: 'OUTRO',
            customTypeName: '',
            speakerName: '',
            hostName: '',
            location: '',
            time: ''
        });
    };

    const handleSave = () => {
        if (!formData.startDate) {
            showError('Data de início é obrigatória');
            return;
        }

        if (!formData.endDate) {
            showError('Data de término é obrigatória');
            return;
        }

        if (!formData.description.trim()) {
            showError('Descrição não pode estar vazia');
            return;
        }

        // Validar que data de término não é anterior à data de início
        if (new Date(formData.endDate) < new Date(formData.startDate)) {
            showError('Data de término não pode ser anterior à data de início');
            return;
        }

        const eventoData: Omit<SpecialEvent, 'id'> = {
            startDate: formData.startDate,
            endDate: formData.endDate,
            description: formData.description,
            type: formData.type,
            customTypeName: formData.customTypeName.trim() || undefined,
            speakerName: formData.speakerName.trim() || undefined,
            hostName: formData.hostName.trim() || undefined,
            location: formData.location.trim() || undefined,
            time: formData.time.trim() || undefined
        };

        if (editingEvento) {
            db.updateSpecialEvent(editingEvento.id, eventoData);
            showSuccess('Evento atualizado com sucesso!');
        } else {
            db.addSpecialEvent(eventoData);
            showSuccess('Evento criado com sucesso!');
        }

        loadEventos();
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        setDeletingId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        if (deletingId) {
            db.deleteSpecialEvent(deletingId);
            loadEventos();
            showSuccess('Evento excluído com sucesso!');
        }
        setShowDeleteConfirm(false);
        setDeletingId(null);
    };

    const getEventTypeLabel = (type: SpecialEvent['type']): string => {
        const labels: Record<SpecialEvent['type'], string> = {
            VISITA_SUPERINTENDENTE: 'Visita do Superintendente',
            ASSEMBLEIA: 'Assembleia',
            CONGRESSO: 'Congresso',
            CELEBRACAO: 'Celebração',
            DISCURSO_ESPECIAL: 'Discurso Especial',
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
            DISCURSO_ESPECIAL: 'bg-danger',
            OUTRO: 'bg-secondary'
        };
        return classes[type];
    };

    const sortedEventos = [...eventos].sort((a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-0">Eventos Especiais</h2>
                    <p className="text-muted mb-0 small">
                        <FaExclamationTriangle className="me-1" />
                        Eventos cadastrados bloqueiam automaticamente agendamentos nas datas correspondentes
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <FaPlus /> Novo Evento
                </button>
            </div>

            {/* Tabela */}
            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle">
                            <thead className="table-header-gradient text-white">
                                <tr>
                                    <th className="ps-3">Período</th>
                                    <th>Tipo</th>
                                    <th>Descrição</th>
                                    <th>Orador/Responsável</th>
                                    <th className="text-end pe-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedEventos.map((evento) => {
                                    const isSameDay = evento.startDate === evento.endDate;
                                    return (
                                        <tr key={evento.id}>
                                            <td className="ps-3">
                                                <div className="fw-bold">
                                                    {new Date(evento.startDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                </div>
                                                {!isSameDay && (
                                                    <div className="small text-muted">
                                                        até {new Date(evento.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`badge ${getEventTypeBadgeClass(evento.type)}`}>
                                                    {evento.customTypeName || getEventTypeLabel(evento.type)}
                                                </span>
                                            </td>
                                            <td>{evento.description}</td>
                                            <td>
                                                {evento.speakerName || <span className="text-muted">-</span>}
                                            </td>
                                            <td className="text-end pe-3">
                                                <button
                                                    className="btn btn-sm btn-outline-primary me-1 border-0"
                                                    onClick={() => handleOpenModal(evento)}
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-danger border-0"
                                                    onClick={() => handleDelete(evento.id)}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {sortedEventos.length === 0 && (
                        <div className="p-5 text-center">
                            <FaCalendarCheck size={48} className="text-muted mb-3 opacity-25" />
                            <p className="text-muted mb-0">Nenhum evento especial cadastrado</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Criar/Editar */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={editingEvento ? 'Editar Evento Especial' : 'Novo Evento Especial'}
                size="md"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={handleCloseModal}>
                            Cancelar
                        </button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            {editingEvento ? 'Atualizar' : 'Salvar'}
                        </button>
                    </>
                }
            >
                <div className="mb-3">
                    <label className="form-label fw-bold">Tipo de Evento *</label>
                    <select
                        className="form-select"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as SpecialEvent['type'] })}
                    >
                        <option value="VISITA_SUPERINTENDENTE">Visita do Superintendente</option>
                        <option value="ASSEMBLEIA">Assembleia</option>
                        <option value="CONGRESSO">Congresso</option>
                        <option value="CELEBRACAO">Celebração</option>
                        <option value="DISCURSO_ESPECIAL">Discurso Especial</option>
                        <option value="OUTRO">Outro</option>
                    </select>
                </div>

                <div className="mb-3">
                    <label className="form-label fw-bold">Nome Personalizado do Tipo (Opcional)</label>
                    <input
                        type="text"
                        className="form-control"
                        value={formData.customTypeName}
                        onChange={(e) => setFormData({ ...formData, customTypeName: e.target.value })}
                        placeholder={`Ex: ${getEventTypeLabel(formData.type)} Regional`}
                    />
                    <small className="text-muted">
                        Se preenchido, este nome será exibido no lugar de "{getEventTypeLabel(formData.type)}"
                    </small>
                </div>

                <div className="mb-3">
                    <label className="form-label fw-bold">Descrição/Nome do Evento *</label>
                    <input
                        type="text"
                        className="form-control"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Ex: Assembleia Regional 2026"
                    />
                </div>

                {(formData.type === 'ASSEMBLEIA' || formData.type === 'CONGRESSO' || formData.type === 'VISITA_SUPERINTENDENTE' || formData.type === 'CELEBRACAO' || formData.type === 'DISCURSO_ESPECIAL') && (
                    <div className="mb-3">
                        <label className="form-label fw-bold">
                            {formData.type === 'VISITA_SUPERINTENDENTE' ? 'Superintendente' : 'Orador Principal'}
                            {' (Opcional)'}
                        </label>
                        <select
                            className="form-select"
                            value={formData.speakerName}
                            onChange={(e) => setFormData({ ...formData, speakerName: e.target.value })}
                        >
                            <option value="">
                                {formData.type === 'VISITA_SUPERINTENDENTE'
                                    ? 'Selecione o superintendente'
                                    : 'Selecione um orador (opcional)'}
                            </option>
                            {speakers
                                .filter(s => {
                                    if (formData.type === 'CELEBRACAO') {
                                        return s.specialAssignments?.includes('CELEBRACAO');
                                    }
                                    if (formData.type === 'DISCURSO_ESPECIAL') {
                                        return s.specialAssignments?.includes('DISCURSO_ESPECIAL');
                                    }
                                    return true; // Para outros tipos, mostrar lista completa por enquanto
                                })
                                .map(speaker => (
                                    <option key={speaker.id} value={speaker.name}>
                                        {speaker.name} ({speaker.congregation})
                                    </option>
                                ))}
                        </select>
                        {(formData.type === 'CELEBRACAO' || formData.type === 'DISCURSO_ESPECIAL') && (
                            <small className="text-muted d-block mt-1">
                                Apenas oradores com a atribuição "{getEventTypeLabel(formData.type)}" configurada aparecem aqui.
                            </small>
                        )}
                    </div>
                )}

                {(formData.type === 'CELEBRACAO' || formData.type === 'DISCURSO_ESPECIAL') && (
                    <div className="mb-3">
                        <label className="form-label fw-bold">Anfitrião (Opcional)</label>
                        <select
                            className="form-select"
                            value={formData.hostName}
                            onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                        >
                            <option value="">Selecione um anfitrião</option>
                            {speakers
                                .filter(s => s.specialAssignments?.includes('ANFITRIAO'))
                                .map(s => (
                                    <option key={s.id} value={s.name}>
                                        {s.name} ({s.congregation})
                                    </option>
                                ))}
                        </select>
                        <small className="text-muted d-block mt-1">
                            Apenas oradores com a atribuição "Anfitrião" configurada aparecem aqui.
                        </small>
                    </div>
                )}

                <div className="row">
                    <div className="col-md-8 mb-3">
                        <label className="form-label fw-bold">Local (Opcional)</label>
                        <input
                            type="text"
                            className="form-control"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="Ex: Salão do Reino / Local Externo"
                        />
                    </div>
                    <div className="col-md-4 mb-3">
                        <label className="form-label fw-bold">Horário (Opcional)</label>
                        <input
                            type="text"
                            className="form-control"
                            value={formData.time}
                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            placeholder="Ex: 19:30"
                        />
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6 mb-3">
                        <label className="form-label fw-bold">Data de Início *</label>
                        <input
                            type="date"
                            className="form-control"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                    </div>
                    <div className="col-md-6 mb-3">
                        <label className="form-label fw-bold">Data de Término *</label>
                        <input
                            type="date"
                            className="form-control"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        />
                    </div>
                </div>

                <div className="alert alert-info mb-0">
                    <small>
                        <FaExclamationTriangle className="me-1" />
                        Durante o período deste evento, não será possível agendar discursos públicos.
                    </small>
                </div>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Excluir Evento Especial"
                message="Tem certeza que deseja excluir este evento? Após a exclusão, será possível agendar discursos nas datas deste evento."
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmText="Excluir"
                variant="danger"
            />
        </div>
    );
};
