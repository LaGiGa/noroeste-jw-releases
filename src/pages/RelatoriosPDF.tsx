import React, { useState } from 'react';
import { FaFilePdf, FaCalendarAlt, FaUsers, FaHistory } from 'react-icons/fa';
import { exportDesignacoesPDF, exportOradoresPDF, exportAgendaPDF, exportOradoresAprovadosPDF } from '../services/pdfExport';
import { showSuccess, showError } from '../utils/toast';
import { db } from '../services/database';

export const RelatoriosPDF: React.FC = () => {
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());
    const congregacoes = db.getCongregations();

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
