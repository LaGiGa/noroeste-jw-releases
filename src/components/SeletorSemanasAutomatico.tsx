import { useState, useEffect, useRef, useCallback } from 'react';
import { jworgImportService } from '../services/jworgImportService';
import type { WeekProgram } from '../services/jworgImportService';
import { FaCalendarAlt, FaSync, FaCheck, FaSpinner } from 'react-icons/fa';
import { showSuccess } from '../utils/toast';

interface SeletorSemanasAutomaticoProps {
    onSemanaSelect: (semana: WeekProgram) => void;
    onSemanasSelect?: (semanas: WeekProgram[]) => void;
    onClose: () => void;
}

export const SeletorSemanasAutomatico = ({ onSemanaSelect, onSemanasSelect, onClose }: SeletorSemanasAutomaticoProps) => {
    const hoje = new Date();
    const [ano, setAno] = useState(hoje.getFullYear());
    const [mes, setMes] = useState(() => {
        const m = hoje.getMonth() + 1;
        // Se for mês par (Fev, Abr...), pega o anterior para fazer o bimestre (Jan-Fev)
        return m % 2 === 0 ? m - 1 : m;
    });

    const bimestreLabel = (m: number) => {
        const labels: Record<number, string> = {
            1: 'Janeiro - Fevereiro', 3: 'Março - Abril', 5: 'Maio - Junho',
            7: 'Julho - Agosto', 9: 'Setembro - Outubro', 11: 'Novembro - Dezembro'
        };
        return labels[m] || 'Período Selecionado';
    };
    const [semanas, setSemanas] = useState<WeekProgram[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Cache em memória usando useRef
    const cacheLocal = useRef<Map<string, WeekProgram[]>>(new Map());



    const carregarSemanas = useCallback(async () => {
        const chaveCache = `${ano}-${mes}`;

        // Verificar cache local primeiro
        const dadosCache = cacheLocal.current.get(chaveCache);
        if (dadosCache && !(dadosCache[0]?.isFallback)) {
            setSemanas(dadosCache);
            setError(null);
            return;
        }

        // Verificar localStorage
        try {
            const cacheStorage = localStorage.getItem(`jworg_cache_${chaveCache}`);
            if (cacheStorage) {
                const dadosArmazenados = JSON.parse(cacheStorage);
                const dataCache = new Date(dadosArmazenados.timestamp);
                const agora = new Date();
                const diferencaDias = (agora.getTime() - dataCache.getTime()) / (1000 * 60 * 60 * 24);

                // Usar cache se tiver menos de 7 dias e NÃO for fallback
                if (diferencaDias < 7 && !(dadosArmazenados.semanas?.[0]?.isFallback)) {
                    setSemanas(dadosArmazenados.semanas);
                    cacheLocal.current.set(chaveCache, dadosArmazenados.semanas);
                    setError(null);
                    return;
                }
            }
        } catch {
            console.log('Sem cache disponível, buscando online...');
        }

        // Buscar do jw.org
        setLoading(true);
        setError(null);

        try {
            const resultado = await jworgImportService.importarApostilaMes(ano, mes);

            if (resultado && resultado.length > 0) {
                setSemanas(resultado);
                cacheLocal.current.set(chaveCache, resultado);

                localStorage.setItem(`jworg_cache_${chaveCache}`, JSON.stringify({
                    semanas: resultado,
                    timestamp: new Date().toISOString()
                }));

                setError(null);
            } else {
                setSemanas([]);
                setError('Apostila não disponível para o período selecionado.');
            }
        } catch (err) {
            console.error('Erro ao buscar semanas:', err);
            setSemanas([]);
            setError('Erro ao conectar com Supabase.');
        } finally {
            setLoading(false);
        }
    }, [ano, mes]);

    // Carregar automaticamente ao abrir ou quando ano/mês mudar
    useEffect(() => {
        carregarSemanas();
        try {
            const w = (window as Window & { electron?: { prefetchMwbs?: (o: unknown) => Promise<unknown> } }).electron;
            if (w && w.prefetchMwbs) { void w.prefetchMwbs({ count: 6 }); }
        } catch { void 0; }
    }, [carregarSemanas]);

    const handleSemanaClick = (semana: WeekProgram) => {
        onSemanaSelect(semana);
        onClose();
    };

    const limparCache = () => {
        cacheLocal.current.clear();
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i) || '';
            if (k.startsWith('jworg_cache_')) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
        setSemanas([]);
        setError(null);
        showSuccess('Cache limpo. Recarregando...');
        carregarSemanas();
    };



    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title">
                            <FaCalendarAlt className="me-2" />
                            Selecionar Semana do Programa
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>

                    <div className="modal-body">
                        {/* Seletor de Ano e Mês */}
                        <div className="card mb-3">
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-4">
                                        <label className="form-label fw-bold">Ano</label>
                                        <select
                                            className="form-select form-select-lg"
                                            value={ano}
                                            onChange={(e) => setAno(Number(e.target.value))}
                                            disabled={loading}
                                        >
                                            {[2024, 2025, 2026, 2027].map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Período (Bimestre)</label>
                                        <select
                                            className="form-select form-select-lg"
                                            value={mes}
                                            onChange={(e) => setMes(Number(e.target.value))}
                                            disabled={loading}
                                        >
                                            <option value="1">Janeiro - Fevereiro</option>
                                            <option value="3">Março - Abril</option>
                                            <option value="5">Maio - Junho</option>
                                            <option value="7">Julho - Agosto</option>
                                            <option value="9">Setembro - Outubro</option>
                                            {/* Ajuste inteligente: Se for final do ano, sugerir corretamente */}
                                            <option value="11">Novembro - Dezembro</option>
                                        </select>
                                    </div>

                                    <div className="col-md-2 d-flex align-items-end">
                                        <button
                                            className="btn btn-outline-primary w-100"
                                            onClick={carregarSemanas}
                                            disabled={loading}
                                            title="Recarregar semanas"
                                        >
                                            <FaSync className={loading ? 'fa-spin' : ''} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mensagem de Info */}
                        <div className="alert alert-info">
                            <strong>ℹ️ Como funciona:</strong>
                            <ul className="mb-0 mt-2">
                                <li>Selecione ano e mês acima</li>
                                <li>O sistema busca automaticamente do jw.org</li>
                                <li>Clique na semana desejada para importar</li>
                                <li>Dados são salvos em cache para acesso rápido</li>
                            </ul>
                        </div>

                        {/* Estado de Loading */}
                        {loading && (
                            <div className="text-center my-4">
                                <FaSpinner className="fa-spin fs-1 text-primary mb-3" />
                                <p className="text-muted">
                                    Buscando programa de <strong>{bimestreLabel(mes)} {ano}</strong> do jw.org...
                                </p>
                            </div>
                        )}

                        {/* Mensagem de Erro */}
                        {error && !loading && (
                            <div className="alert alert-warning">
                                <strong>⚠️ {error}</strong>
                            </div>
                        )}

                        {/* Lista de Semanas */}
                        {!loading && semanas.length > 0 && (
                            <div>
                                

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="mb-0">
                                        <FaCheck className="text-success me-2" />
                                        {semanas.length} semanas disponíveis
                                    </h6>
                                    <div className="d-flex gap-2">
                                        <button
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={limparCache}
                                            title="Limpar cache e recarregar"
                                        >
                                            Limpar Cache
                                        </button>
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => { if (onSemanasSelect) { onSemanasSelect(semanas); onClose(); } }}
                                            title="Importar todas as semanas"
                                        >
                                            Importar todas as semanas
                                        </button>
                                    </div>
                                </div>

                                <div className="list-group">
                                    {semanas.map((semana, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            className="list-group-item list-group-item-action"
                                            onClick={() => handleSemanaClick(semana)}
                                        >
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div className="flex-grow-1">
                                                    <div className="d-flex align-items-center mb-2">
                                                        <FaCalendarAlt className="text-primary me-2" />
                                                        <h6 className="mb-0">{semana.periodo}</h6>
                                                        {index === 0 && (
                                                            <span className="badge bg-primary ms-2">Próxima</span>
                                                        )}
                                                    </div>

                                                    <div className="small text-muted">
                                                        <div className="mb-1">
                                                            <strong>📖 Leitura:</strong> {semana.leituraBiblica}
                                                        </div>
                                                        <div>
                                                            <strong>🎵 Cânticos:</strong> {' '}
                                                            {semana.canticos.inicial || '?'}, {' '}
                                                            {semana.canticos.meio || '?'}, {' '}
                                                            {semana.canticos.final || '?'}
                                                        </div>
                                                        <div className="mt-1">
                                                            <strong>📋 Partes:</strong> {semana.partes.length} itens
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="ms-3">
                                                    <FaCheck className="text-success fs-5" />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Estado Vazio */}
                        {!loading && semanas.length === 0 && !error && (
                            <div className="text-center py-5">
                                <FaCalendarAlt className="fs-1 text-muted mb-3" />
                                <p className="text-muted">
                                    Selecione ano e mês para carregar as semanas
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer bg-light">
                        <small className="text-muted me-auto">
                            💡 Dica: Os dados ficam em cache por 7 dias para acesso rápido
                        </small>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
