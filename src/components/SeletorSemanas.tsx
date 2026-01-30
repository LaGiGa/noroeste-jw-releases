import React, { useState, useEffect, useCallback } from 'react';
import { jworgImportService } from '../services/jworgImportService';
import type { WeekProgram } from '../services/jworgImportService';
import { showSuccess, showError } from '../utils/toast';

interface SeletorSemanasProps {
    onSemanaSelected: (semana: WeekProgram) => void;
}

export const SeletorSemanas: React.FC<SeletorSemanasProps> = ({ onSemanaSelected }) => {
    const [semanas, setSemanas] = useState<WeekProgram[]>([]);
    const [loading, setLoading] = useState(false);
    const [semanaSelecionada, setSemanaSelecionada] = useState<string>('');

    // Carregar semanas ao montar o componente
    // (definida após a função para evitar uso antes da declaração)

    const carregarSemanas = useCallback(async () => {
        setLoading(true);
        try {
            const ate = await jworgImportService.listarSemanasAte(2026, 3);
            if (ate && ate.length > 0) {
                setSemanas(ate);
                const hoje = new Date();
                let futuras = ate.filter(w => new Date(w.dataFim).getTime() >= hoje.getTime());
                if (futuras.length === 0) futuras = ate;
                const s = futuras[0];
                setSemanaSelecionada(s.periodo);
                onSemanaSelected(s);
                showSuccess(`${ate.length} semanas carregadas.`);
            } else {
                setSemanas([]);
                setSemanaSelecionada('');
                showError('Semanas não disponíveis no Supabase.');
            }
        } catch (error) {
            console.error('Erro ao carregar semanas:', error);
            setSemanas([]);
            setSemanaSelecionada('');
            showError('Erro ao conectar com Supabase.');
        } finally {
            setLoading(false);
        }
    }, [onSemanaSelected]);

    useEffect(() => {
        void carregarSemanas();
    }, [carregarSemanas]);

    const handleSemanaChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const periodo = event.target.value;
        setSemanaSelecionada(periodo);

        // Encontrar a semana selecionada
        const semana = semanas.find(s => s.periodo === periodo);

        if (semana) {
            console.log('📅 Semana selecionada:', semana.periodo);
            onSemanaSelected(semana);
            showSuccess(`Semana "${semana.periodo}" carregada!`);
        }
    };

    return (
        <div className="mb-4">
            <div className="card">
                <div className="card-body">
                    <div className="row align-items-center">
                        <div className="col-md-8">
                            <label className="form-label fw-bold mb-2">
                                📅 Selecione a Semana do Programa
                            </label>
                            <select
                                className="form-select form-select-lg"
                                value={semanaSelecionada}
                                onChange={handleSemanaChange}
                                disabled={loading || semanas.length === 0}
                            >
                                <option value="">Selecione uma semana...</option>
                                {(() => {
                                    const ordered = [...semanas].sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
                                    const groups: Record<string, WeekProgram[]> = {};
                                    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

                                    for (const w of ordered) {
                                        const [yStr, mStr] = w.dataInicio.split('-');
                                        const y = parseInt(yStr, 10);
                                        const m = parseInt(mStr, 10);
                                        const key = `${y}-${String(m).padStart(2, '0')}`;
                                        
                                        if (!groups[key]) groups[key] = [];
                                        groups[key].push(w);
                                    }

                                    return Object.keys(groups).sort().map(key => {
                                        const [yStr, mStr] = key.split('-');
                                        const mIdx = parseInt(mStr, 10) - 1;
                                        const label = `${meses[mIdx]} ${yStr}`;

                                        return (
                                            <optgroup key={key} label={label}>
                                                {groups[key].map((semana, idx) => (
                                                    <option key={`${semana.dataInicio}-${semana.periodo}-${idx}`} value={semana.periodo}>
                                                        {(() => { 
                                                            const [y1,m1,d1] = semana.dataInicio.split('-').map(x=>parseInt(x,10)); 
                                                            const [y2,m2,d2] = semana.dataFim.split('-').map(x=>parseInt(x,10)); 
                                                            const mesesLower=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']; 
                                                            const periodo = (y1===y2 && m1===m2) ? `${d1}-${d2} de ${mesesLower[m1-1]} de ${y1}` : `${d1} de ${mesesLower[m1-1]}–${d2} de ${mesesLower[m2-1]} de ${y2}`; 
                                                            return `${periodo} - ${semana.leituraBiblica}`; 
                                                        })()}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        );
                                    });
                                })()}
                            </select>
                        </div>
                        <div className="col-md-4 text-end">
                            {loading && (
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visualmente-oculto">Carregando...</span>
                                </div>
                            )}
                            {!loading && semanas.length > 0 && (
                                <div className="d-inline-flex align-items-center gap-2">
                                    <span className="text-success"><i className="bi bi-check-circle"></i> {semanas.length} semanas</span>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => {
                                            const semana = semanas.find(s => s.periodo === semanaSelecionada) || semanas[0];
                                            if (semana) onSemanaSelected(semana);
                                        }}
                                    >
                                        Atualizar
                                    </button>
                                    
                                </div>
                            )}
                        </div>
                    </div>


                    {semanaSelecionada && (
                        <div className="alert alert-info mt-3 mb-0">
                            <strong>ℹ️ Dica:</strong> Os dados da estrutura foram importados automaticamente.
                            Agora preencha os nomes dos participantes e salve!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
