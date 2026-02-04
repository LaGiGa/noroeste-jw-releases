import React, { useState } from 'react';
import { FaFilePdf, FaCalendarAlt, FaUsers, FaHistory } from 'react-icons/fa';
import { exportDesignacoesPDF, exportOradoresPDF, exportAgendaPDF, exportOradoresAprovadosPDF } from '../services/pdfExport';
import { showSuccess, showError } from '../utils/toast';
import { db } from '../services/database';

export const RelatoriosPDF: React.FC = () => {
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());

    // Filtros para Relatório de Discursos Públicos
    const [publicFilter, setPublicFilter] = useState({
        startDate: '',
        endDate: '',
        speaker: '',
        locationType: 'all' as 'all' | 'local' | 'away',
        originCongregation: '',
        includeSpecialEvents: 'none' as 'none' | 'only' | 'all',
        specialEventType: 'all' as 'all' | 'VISITA_SUPERINTENDENTE' | 'ASSEMBLEIA' | 'CONGRESSO' | 'CELEBRACAO' | 'DISCURSO_ESPECIAL' | 'OUTRO'
    });

    const congregacoes = db.getCongregations();
    const oradores = db.getSpeakers();

    const handleExportDesignacoes = () => {
        const designacoes = db.getIndicatorAssignments().map(a => ({
            date: a.date,
            type: a.type,
            theme: a.theme,
            speaker: a.speaker,
            president: a.president,
            reader: a.reader,
            hospitality: a.hospitality,
            entranceIndicator: a.entranceIndicator,
            auditoriumIndicator: a.auditoriumIndicator,
            audio: a.audio,
            video: a.video,
            mic1: a.mic1,
            mic2: a.mic2
        })).filter(a => {
            const d = new Date(a.date + 'T00:00:00');
            return d.getMonth() + 1 === mes && d.getFullYear() === ano;
        });

        if (designacoes.length === 0) {
            showError('Nenhuma designação encontrada para o período selecionado.');
            return;
        }

        exportDesignacoesPDF(designacoes, mes, ano);
        showSuccess('Relatório de Designações gerado com sucesso!');
    };

    const handleExportOradores = () => {
        const oradores = db.getSpeakers().map(o => ({
            nome: o.name,
            telefone: o.phone,
            congregacao: o.congregation
        }));

        if (oradores.length === 0) {
            showError('Nenhum orador encontrado.');
            return;
        }

        exportOradoresPDF(oradores);
        showSuccess('Relatório de Oradores gerado com sucesso!');
    };

    const handleExportOradoresAprovados = () => {
        const oradores = db.getSpeakers()
            .filter(o => o.approvedForOutside && o.congregation === 'Noroeste')
            .map(o => ({
                id: o.id,
                nome: o.name,
                telefone: o.phone,
                congregacao: o.congregation,
                qualifiedSpeeches: o.qualifiedSpeeches
            }));

        if (oradores.length === 0) {
            showError('Nenhum orador habilitado para discursos fora encontrado.');
            return;
        }

        exportOradoresAprovadosPDF(oradores);
        showSuccess('Relatório de Oradores Aprovados gerado com sucesso!');
    };

    const handleExportAgenda = () => {
        const agendamentos = db.getSchedule();
        const agenda = agendamentos.map(a => {
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
        }).filter(a => {
            const d = new Date(a.data + 'T00:00:00');
            return d.getFullYear() === ano;
        });

        if (agenda.length === 0) {
            showError('Nenhum agendamento encontrado para o ano selecionado.');
            return;
        }

        exportAgendaPDF(agenda, String(ano));
        showSuccess('Relatório de Agenda gerado com sucesso!');
    };

    const handleExportPublicTalks = () => {
        const agendamentos = db.getSchedule();
        const specialEvents = db.getSpecialEvents ? db.getSpecialEvents() : [];

        let items: any[] = [];

        // Adicionar Agendamentos se não for "apenas eventos"
        if (publicFilter.includeSpecialEvents !== 'only') {
            const filteredAgendamentos = agendamentos.filter(a => {
                if (publicFilter.startDate && a.date < publicFilter.startDate) return false;
                if (publicFilter.endDate && a.date > publicFilter.endDate) return false;
                if (publicFilter.speaker && a.speakerName !== publicFilter.speaker) return false;
                if (publicFilter.originCongregation && a.congregation !== publicFilter.originCongregation) return false;

                const isLocal = a.location === 'Noroeste' || (!a.location && a.congregation === 'Noroeste');
                if (publicFilter.locationType === 'local' && !isLocal) return false;
                if (publicFilter.locationType === 'away' && isLocal) return false;

                return true;
            });

            items = filteredAgendamentos.map(a => {
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
        }

        // Adicionar Eventos Especiais se solicitado
        if (publicFilter.includeSpecialEvents !== 'none') {
            const filteredEvents = specialEvents.filter(e => {
                if (publicFilter.startDate && e.startDate < publicFilter.startDate) return false;
                if (publicFilter.endDate && e.startDate > publicFilter.endDate) return false;
                if (publicFilter.specialEventType !== 'all' && e.type !== publicFilter.specialEventType) return false;

                // Se filtrou por orador, e o evento tem orador setado
                if (publicFilter.speaker && e.speakerName && e.speakerName !== publicFilter.speaker) return false;
                // Se filtrou por orador e o evento NÃO TEM orador setado, removemos se for "apenas eventos" filtrados
                if (publicFilter.speaker && !e.speakerName) return false;

                return true;
            });

            const eventItems = filteredEvents.map(e => {
                const getEventLabel = (type: string) => {
                    switch (type) {
                        case 'VISITA_SUPERINTENDENTE': return 'Visita do Super.';
                        case 'ASSEMBLEIA': return 'Assembleia';
                        case 'CONGRESSO': return 'Congresso';
                        case 'CELEBRACAO': return 'Celebração';
                        case 'DISCURSO_ESPECIAL': return 'Discurso Especial';
                        default: return e.customTypeName || 'Evento Especial';
                    }
                };

                return {
                    data: e.startDate,
                    horario: e.time || '-',
                    tema: `${getEventLabel(e.type)}${e.description ? `: ${e.description}` : ''}`,
                    orador: e.speakerName || '-',
                    congregacao: 'Noroeste',
                    local: e.location || 'Local',
                    anfitrao: e.hostName || '-'
                };
            });

            items = [...items, ...eventItems];
        }

        if (items.length === 0) {
            showError('Nenhum item encontrado com os filtros selecionados.');
            return;
        }

        // Ordenar por data
        items.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

        const periodLabel = publicFilter.startDate && publicFilter.endDate
            ? `${new Date(publicFilter.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(publicFilter.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
            : 'Personalizado';

        exportAgendaPDF(items, `Publicos_${periodLabel}`);
        showSuccess('Relatório de Discursos Públicos gerado com sucesso!');
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">Relatórios PDF</h2>
            </div>

            <div className="row g-4">
                {/* Relatório de Designações */}
                <div className="col-md-6">
                    <div className="card h-100 shadow-sm border-0">
                        <div className="card-body">
                            <div className="d-flex align-items-center mb-3">
                                <div className="p-3 bg-primary bg-opacity-10 rounded me-3">
                                    <FaCalendarAlt className="text-primary" size={32} />
                                </div>
                                <div>
                                    <h5 className="mb-0">Designações Mensais</h5>
                                    <p className="text-muted mb-0 small">Escala de indicadores e funções</p>
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-6">
                                    <label className="form-label small">Mês</label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={mes}
                                        onChange={(e) => setMes(parseInt(e.target.value))}
                                    >
                                        {[...Array(12)].map((_, i) => (
                                            <option key={i + 1} value={i + 1}>
                                                {new Date(2025, i).toLocaleDateString('pt-BR', { month: 'long' })}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-6">
                                    <label className="form-label small">Ano</label>
                                    <input
                                        type="number"
                                        className="form-control form-control-sm"
                                        value={ano}
                                        onChange={(e) => setAno(parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            <button
                                className="btn btn-primary w-100"
                                onClick={handleExportDesignacoes}
                            >
                                <FaFilePdf /> Gerar PDF
                            </button>
                        </div>
                    </div>
                </div>

                {/* Relatório de Oradores */}
                <div className="col-md-6">
                    <div className="card h-100 shadow-sm border-0">
                        <div className="card-body">
                            <div className="d-flex align-items-center mb-3">
                                <div className="p-3 bg-success bg-opacity-10 rounded me-3">
                                    <FaUsers className="text-success" size={32} />
                                </div>
                                <div>
                                    <h5 className="mb-0">Lista Geral de Oradores</h5>
                                    <p className="text-muted mb-0 small">Todos os oradores cadastrados</p>
                                </div>
                            </div>

                            <p className="text-muted small mb-3">
                                Gera um relatório com nome, telefone e congregação de todos os oradores.
                            </p>

                            <button
                                className="btn btn-success w-100"
                                onClick={handleExportOradores}
                            >
                                <FaFilePdf /> Gerar PDF
                            </button>
                        </div>
                    </div>
                </div>

                {/* Relatório de Oradores Aprovados */}
                <div className="col-md-6">
                    <div className="card h-100 shadow-sm border-0">
                        <div className="card-body">
                            <div className="d-flex align-items-center mb-3">
                                <div className="p-3 bg-info bg-opacity-10 rounded me-3">
                                    <FaFilePdf className="text-info" size={32} />
                                </div>
                                <div>
                                    <h5 className="mb-0">Oradores para Outras Cong.</h5>
                                    <p className="text-muted mb-0 small">Aprovados para fazer discursos fora</p>
                                </div>
                            </div>

                            <p className="text-muted small mb-3">
                                Lista especial de oradores com seus respectivos esboços preparados.
                            </p>

                            <button
                                className="btn btn-info w-100 text-white"
                                onClick={handleExportOradoresAprovados}
                            >
                                <FaFilePdf /> Gerar PDF
                            </button>
                        </div>
                    </div>
                </div>

                {/* Relatório de Agenda */}
                <div className="col-md-6">
                    <div className="card h-100 shadow-sm border-0">
                        <div className="card-body">
                            <div className="d-flex align-items-center mb-3">
                                <div className="p-3 bg-warning bg-opacity-10 rounded me-3">
                                    <FaHistory className="text-warning" size={32} />
                                </div>
                                <div>
                                    <h5 className="mb-0">Agenda de Discursos</h5>
                                    <p className="text-muted mb-0 small">Programação anual</p>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label small">Ano</label>
                                <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={ano}
                                    onChange={(e) => setAno(parseInt(e.target.value))}
                                />
                            </div>

                            <button
                                className="btn btn-warning w-100"
                                onClick={handleExportAgenda}
                            >
                                <FaFilePdf /> Gerar PDF
                            </button>
                        </div>
                    </div>
                </div>

                {/* Relatório de Discursos Públicos (Filtrado) */}
                <div className="col-12">
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white py-3">
                            <h5 className="mb-0 d-flex align-items-center">
                                <FaHistory className="text-danger me-2" />
                                Exportação de Discursos Públicos (Filtros Avançados)
                            </h5>
                        </div>
                        <div className="card-body bg-light">
                            <div className="row g-3">
                                <div className="col-md-2">
                                    <label className="form-label small fw-bold">Data Início</label>
                                    <input type="date" className="form-control form-control-sm" value={publicFilter.startDate} onChange={e => setPublicFilter({ ...publicFilter, startDate: e.target.value })} />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label small fw-bold">Data Fim</label>
                                    <input type="date" className="form-control form-control-sm" value={publicFilter.endDate} onChange={e => setPublicFilter({ ...publicFilter, endDate: e.target.value })} />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label small fw-bold">Orador</label>
                                    <select className="form-select form-select-sm" value={publicFilter.speaker} onChange={e => setPublicFilter({ ...publicFilter, speaker: e.target.value })}>
                                        <option value="">Todos</option>
                                        {oradores.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label small fw-bold">Local</label>
                                    <select className="form-select form-select-sm" value={publicFilter.locationType} onChange={e => setPublicFilter({ ...publicFilter, locationType: e.target.value as any })}>
                                        <option value="all">Todos</option>
                                        <option value="local">Apenas Locais</option>
                                        <option value="away">Apenas Fora</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label small fw-bold">Cong. Origem</label>
                                    <select className="form-select form-select-sm" value={publicFilter.originCongregation} onChange={e => setPublicFilter({ ...publicFilter, originCongregation: e.target.value })}>
                                        <option value="">Todas</option>
                                        {congregacoes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label small fw-bold">Eventos Especiais</label>
                                    <select className="form-select form-select-sm" value={publicFilter.includeSpecialEvents} onChange={e => setPublicFilter({ ...publicFilter, includeSpecialEvents: e.target.value as any })}>
                                        <option value="none">Não Incluir</option>
                                        <option value="all">Incluir na Lista</option>
                                        <option value="only">Apenas Eventos Especiais</option>
                                    </select>
                                </div>
                                {publicFilter.includeSpecialEvents !== 'none' && (
                                    <div className="col-md-3">
                                        <label className="form-label small fw-bold">Tipo de Evento</label>
                                        <select className="form-select form-select-sm" value={publicFilter.specialEventType} onChange={e => setPublicFilter({ ...publicFilter, specialEventType: e.target.value as any })}>
                                            <option value="all">Todos os Tipos</option>
                                            <option value="VISITA_SUPERINTENDENTE">Visita do Superintendente</option>
                                            <option value="ASSEMBLEIA">Assembleia</option>
                                            <option value="CONGRESSO">Congresso</option>
                                            <option value="CELEBRACAO">Celebração</option>
                                            <option value="DISCURSO_ESPECIAL">Discurso Especial</option>
                                            <option value="OUTRO">Outro</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 text-center">
                                <button className="btn btn-danger btn-lg px-5" onClick={handleExportPublicTalks}>
                                    <FaFilePdf className="me-2" /> Gerar Relatório Filtrado
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Informações */}
            <div className="card mt-4 shadow-sm border-0">
                <div className="card-body">
                    <h6 className="mb-3 text-muted">ℹ️ Informações sobre os Relatórios</h6>
                    <ul className="mb-0 small text-muted">
                        <li className="mb-2">
                            <strong>Designações Mensais:</strong> Inclui todas as designações do mês selecionado com todas as funções (Orador, Presidente, Leitor, Hospitalidade, Indicadores, Microfones, Áudio/Vídeo).
                        </li>
                        <li className="mb-2">
                            <strong>Lista Especial:</strong> Relatório para coordenadores de outras congregações escolherem oradores habilitados.
                        </li>
                        <li className="mb-2">
                            <strong>Lista Geral de Oradores:</strong> Relatório geral com contatos e congregações.
                        </li>
                        <li className="mb-0">
                            <strong>Agenda:</strong> Programação completa de discursos (Origem e Destino) agendados para o ano.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
