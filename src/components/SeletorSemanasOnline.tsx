
import { useState, useEffect } from 'react';
import { jworgImportService } from '../services/jworgImportService';
import type { WeekProgram } from '../services/jworgImportService';
import { FaCalendarAlt, FaCloudDownloadAlt, FaSpinner, FaGlobeAmericas, FaTimes } from 'react-icons/fa';
import { showSuccess, showError } from '../utils/toast';

interface SeletorSemanasOnlineProps {
    onSemanaSelect: (semana: WeekProgram) => void;
    onClose: () => void;
}

export const SeletorSemanasOnline = ({ onSemanaSelect, onClose }: SeletorSemanasOnlineProps) => {
    const [semanasDisponiveis, setSemanasDisponiveis] = useState<Array<{ periodo: string; url: string; ano: number; start: Date; end: Date }>>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [loadingImport, setLoadingImport] = useState(false);

    useEffect(() => {
        carregarLista();
    }, []);

    const carregarLista = async () => {
        setLoadingList(true);
        try {
            const lista = await jworgImportService.listarSemanasDisponiveisOnline();
            const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            const mapMes = (nome: string) => {
                const n = nome.toLowerCase().replace('ç', 'c');
                const idx = meses.indexOf(n);
                if (idx >= 0) return idx + 1;
                const abbr = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
                const i2 = abbr.indexOf(n.slice(0, 3));
                return i2 >= 0 ? i2 + 1 : 0;
            };
            const parsePeriodo = (periodo: string, ano: number) => {
                const p1 = periodo.match(/(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*de\s*([A-Za-zÀ-ÿ]+)/i);
                if (p1) {
                    const d1 = parseInt(p1[1], 10);
                    const d2 = parseInt(p1[2], 10);
                    const m = mapMes(p1[3]);
                    const start = new Date(ano, m - 1, d1);
                    const end = new Date(ano, m - 1, d2);
                    return { start, end };
                }
                const p2 = periodo.match(/(\d{1,2})\s*de\s*([A-Za-zÀ-ÿ]+)\s*[-–—]\s*(\d{1,2})\s*de\s*([A-Za-zÀ-ÿ]+)/i);
                if (p2) {
                    const d1 = parseInt(p2[1], 10);
                    const m1 = mapMes(p2[2]);
                    const d2 = parseInt(p2[3], 10);
                    const m2 = mapMes(p2[4]);
                    const start = new Date(ano, m1 - 1, d1);
                    const end = new Date(ano, m2 - 1, d2);
                    return { start, end };
                }
                const yr = (periodo.match(/(20\d{2})/)?.[1]) ? parseInt(periodo.match(/(20\d{2})/)![1], 10) : ano;
                return { start: new Date(yr, 0, 1), end: new Date(yr, 0, 1) };
            };
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const enriched = lista.map(it => {
                const { start, end } = parsePeriodo(it.periodo, it.ano);
                return { ...it, start, end };
            }).filter(it => it.end.getTime() >= today.getTime());
            enriched.sort((a, b) => a.start.getTime() - b.start.getTime());
            setSemanasDisponiveis(enriched);
        } catch (error) {
            console.error('Erro ao listar semanas:', error);
            showError('Não foi possível carregar a lista de semanas do site.');
        } finally {
            setLoadingList(false);
        }
    };

    const handleImportar = async (item: { periodo: string; url: string; ano: number }) => {
        setLoadingImport(true);
        try {
            const programa = await jworgImportService.importarProgramaSemanalUrl(item.url);
            if (programa) {
                // Ajustar o período para garantir formatação consistente se necessário, 
                // mas geralmente o parser já cuida disso.
                onSemanaSelect(programa);
                showSuccess(`Semana de ${item.periodo} importada com sucesso!`);
                onClose();
            } else {
                showError('Falha ao importar o programa desta semana.');
            }
        } catch (error) {
            console.error('Erro na importação:', error);
            showError('Erro ao realizar a importação.');
        } finally {
            setLoadingImport(false);
        }
    };

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title d-flex align-items-center gap-2">
                            <FaGlobeAmericas />
                            Semanas Disponíveis Online
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>

                    <div className="modal-body p-4">
                        {loadingList ? (
                            <div className="text-center py-5">
                                <FaSpinner className="fa-spin text-primary mb-3" size={40} />
                                <h6 className="text-muted">Buscando semanas disponíveis...</h6>
                            </div>
                        ) : semanasDisponiveis.length === 0 ? (
                            <div className="text-center py-5">
                                <FaCalendarAlt className="text-muted mb-3" size={40} />
                                <h6 className="text-muted">Nenhuma semana encontrada nos próximos meses.</h6>
                                <button className="btn btn-outline-primary mt-3" onClick={carregarLista}>
                                    Tentar Novamente
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p className="text-muted mb-4">
                                    Selecione uma semana abaixo para importar todos os dados (Cânticos, Leituras, Partes) diretamente do site.
                                </p>

                                {loadingImport && (
                                    <div className="alert alert-info d-flex align-items-center gap-2 mb-4">
                                        <FaSpinner className="fa-spin" />
                                        Importando dados, aguarde um momento...
                                    </div>
                                )}

                                <div className="list-group shadow-sm">
                                    {(() => {
                                        const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                                        const groups: Record<string, { ano: number; monthIndex: number; monthName: string; semanas: typeof semanasDisponiveis }> = {};
                                        for (const it of semanasDisponiveis) {
                                            const mIdx = it.start.getMonth();
                                            const key = `${it.ano}-${String(mIdx + 1).padStart(2, '0')}`;
                                            if (!groups[key]) {
                                                groups[key] = { ano: it.ano, monthIndex: mIdx, monthName: meses[mIdx], semanas: [] };
                                            }
                                            groups[key].semanas.push(it);
                                        }
                                        const ordered = Object.values(groups).sort((a, b) => {
                                            const ad = new Date(a.ano, a.monthIndex, 1).getTime();
                                            const bd = new Date(b.ano, b.monthIndex, 1).getTime();
                                            return ad - bd;
                                        });
                                        return ordered.map((g, gi) => (
                                            <div key={`${g.ano}-${g.monthIndex}-${gi}`}>
                                                <div className="list-group-item active d-flex justify-content-between align-items-center">
                                                    <span className="fw-bold">{g.monthName.charAt(0).toUpperCase() + g.monthName.slice(1)} {g.ano}</span>
                                                </div>
                                                {g.semanas.sort((a, b) => a.start.getTime() - b.start.getTime()).map((item, idx) => (
                                                    <button
                                                        key={`${g.monthIndex}-${idx}-${item.url}`}
                                                        className="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3"
                                                        onClick={() => !loadingImport && handleImportar(item)}
                                                        disabled={loadingImport}
                                                    >
                                                        <div className="d-flex align-items-center gap-3">
                                                            <div className="bg-light rounded-circle p-2 text-primary">
                                                                <FaCalendarAlt />
                                                            </div>
                                                            <div>
                                                                <h6 className="mb-0 fw-bold text-dark">{item.periodo}</h6>
                                                                <small className="text-muted">Ano: {item.ano}</small>
                                                            </div>
                                                        </div>
                                                        <div className="text-primary">
                                                            <FaCloudDownloadAlt size={20} />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer bg-light">
                        <small className="text-muted me-auto">
                            * A importação obtém dados em Tempo Real Online
                        </small>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            <FaTimes className="me-2" /> Canelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
