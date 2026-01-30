import React, { useState, useEffect } from 'react';
import { FaFilePdf, FaSave, FaFileExport, FaInfoCircle, FaCalendarAlt, FaSpinner } from 'react-icons/fa';
import { exportProgramaVidaMinisterioPDFExact, exportProgramaVidaMinisterioPDFMulti, exportS89PDF, exportS89PDFMulti } from '../services/programaPDF';
import { showSuccess, showError } from '../utils/toast';
import { db } from '../services/database';
import { PersonSelector } from './PersonSelector';
import type { Person } from '../services/database';
import type { WeekProgram } from '../services/jworgImportService';
import { jworgImportService } from '../services/jworgImportService';


type TesouroItem = { titulo: string; tempo: string; orador: string };
type MinisterioItem = { titulo: string; tempo: string; participante: string; ajudante?: string; material?: string; cenario?: string; descricao?: string };
type VidaCristaItem = { titulo: string; tempo: string; condutor: string };

interface ProgramaVM {
    data: string;
    dataReuniao: string;
    referenciaBiblica: string;
    canticoInicial: string;
    oracao: string;
    tesouros: TesouroItem[];
    leituraBiblia: { tempo: string; estudante: string; estudanteSalaB?: string };
    salaPrincipal: string;
    salaB: string;
    ministerioPrincipal: MinisterioItem[];
    ministerioSalaB: MinisterioItem[];
    canticoMeio: string;
    vidaCrista: VidaCristaItem[];
    estudoBiblico: { condutor: string; leitor: string };
    comentariosFinais: string;
    canticoFinal: string;
    oracaoFinal: string;
    local: string;
}



export const ProgramaVidaMinisterio: React.FC = () => {
    const [pessoas, setPessoas] = useState<Person[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        setPessoas(db.getPersons().sort((a, b) => a.name.localeCompare(b.name)));
    }, []);

    const [semanasMes, setSemanasMes] = useState<WeekProgram[]>([]);
    const [todasSemanas, setTodasSemanas] = useState<WeekProgram[]>([]);
    const [selectedSemanaPeriodo, setSelectedSemanaPeriodo] = useState('');
    const [loadingApostilas, setLoadingApostilas] = useState(false);
    const [statusApostilas, setStatusApostilas] = useState('');
    const [rangeStartDate, setRangeStartDate] = useState<string>('');
    const [rangeEndDate, setRangeEndDate] = useState<string>('');
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [showIntervalPanel, setShowIntervalPanel] = useState(false);

    // Helper para buscar o último que fez a parte (útil para ver o histórico do KHS)
    const bimestreInicio = React.useCallback((m: number) => (m % 2 === 0 ? m - 1 : m), []);
    const baixarMesAtual = React.useCallback(async () => {
        try {
            setLoadingApostilas(true);
            setStatusApostilas('Baixando apostilas do mês atual...');
            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mesInicio = bimestreInicio(hoje.getMonth() + 1);
            const semanas = await jworgImportService.importarApostilaMes(ano, mesInicio);
            if (semanas && semanas.length > 0) {
                setSemanasMes(semanas);
                showSuccess(`${semanas.length} semanas do mês atual disponíveis`);
            }
        } catch {
            showError('Falha ao baixar apostilas do mês atual.');
        } finally {
            setLoadingApostilas(false);
            setStatusApostilas('');
        }
    }, [bimestreInicio]);

    const atualizarApostilas = async () => {
        try {
            setLoadingApostilas(true);
            setStatusApostilas('Atualizando semanas disponíveis...');
            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mesInicio = bimestreInicio(hoje.getMonth() + 1);
            const semanasAtual = await jworgImportService.importarApostilaMes(ano, mesInicio);
            if (semanasAtual && semanasAtual.length > 0) {
                setSemanasMes(semanasAtual);
            }
            const ate = await jworgImportService.listarSemanasAte(2026, 5);
            setTodasSemanas(ate);
            showSuccess('Semanas atualizadas.');
        } catch {
            showError('Erro ao atualizar semanas.');
        } finally {
            setLoadingApostilas(false);
            setStatusApostilas('');
        }
    };

    useEffect(() => {
        void baixarMesAtual();
        (async () => {
            const ate = await jworgImportService.listarSemanasAte(2026, 5);
            setTodasSemanas(ate);
        })();
    }, [baixarMesAtual]);

    const buildProgramaFromWeek = React.useCallback((semana: WeekProgram): ProgramaVM => {
        const partesTestouros = semana.partes.filter(p => p.secao === 'tesouros');
        const partesMinisterio = semana.partes.filter(p => p.secao === 'ministerio');
        const partesVidaCrista = semana.partes.filter(p => p.secao === 'vida_crista');
        const discursosTestouros = partesTestouros
            .filter(p => p.tipo !== 'leitura')
            .map(p => ({ titulo: p.titulo, tempo: `${p.duracao} min`, orador: '' }));
        const leitura = partesTestouros.find(p => p.tipo === 'leitura');
        const normaliza = (s: string) => s.replace(/-/g, '–').trim();
        const extrairRef = (): string => {
            const base = (semana.leituraBiblica || '').trim();
            const books = '(G[EÊ]NESIS|ÊXODO|LEV[IÍ]TICO|N[ÚU]MEROS|DEUTERON[ÔO]MIO|JOSU[ÉE]|JU[IÍ]ZES|RUTE|1\\s*SAMUEL|2\\s*SAMUEL|1\\s*REIS|2\\s*REIS|1\\s*CR[ÔO]NICAS|2\\s*CR[ÔO]NICAS|ESDRAS|NEEMIAS|ESTER|J[ÓO]|SALMOS|PROV[ÉE]RBIOS|ECLESIASTES|C[ÂA]NTICO\\s+DOS\\s+C[ÂA]NTICOS|ISA[IÍ]AS|JEREMIAS|LAMENTA[ÇC][ÕO]ES|EZEQUIEL|DANIEL|OSEIAS|JOEL|AM[ÓO]S|OBADIAS|JONAS|MIQUEIAS|NAUM|HABACUQUE|SOFONIAS|AGEU|ZACARIAS|MALAQUIAS|MATEUS|MARCOS|LUCAS|JO[ÃA]O|ATOS|ROMANOS|1\\s*COR[ÍI]NTIOS|2\\s*COR[ÍI]NTIOS|G[ÁA]LATAS|EF[ÉE]SIOS|FILIPENSES|COLOSSENSES|1\\s*TESSALONICENSES|2\\s*TESSALONICENSES|1\\s*TIM[ÓO]TEO|2\\s*TIM[ÓO]TEO|TITO|FILEMON|HEBREUS|TIAGO|1\\s*PEDRO|2\\s*PEDRO|1\\s*JO[ÃA]O|2\\s*JO[ÃA]O|3\\s*JO[ÃA]O|JUDAS|APOCALIPSE)';
            const rx = new RegExp(`\\b${books} \\b\\s +\\d + (?: \\s * [-–—]\\s *\\d +)?(?:, \\s *\\d +)?`, 'i');
            if (base && rx.test(base)) return normaliza(base);
            const fontes = [leitura?.titulo || '', ...partesTestouros.map(p => p.titulo)].join(' ');
            const m = fontes.match(rx);
            if (m) return normaliza(m[0].replace(/\b(Isaias|Isa[ií]as)\b/i, 'ISAÍAS').toUpperCase());
            return '';
        };
        const refBiblica = extrairRef();
        const partesVidaCristaSimples = partesVidaCrista
            .filter(p => p.tipo !== 'estudo_congregacao')
            .map(p => ({ titulo: p.titulo, tempo: `${p.duracao} min`, condutor: '' }));
        const novo: ProgramaVM = {
            data: semana.periodo,
            dataReuniao: semana.dataInicio,
            referenciaBiblica: refBiblica || semana.leituraBiblica,
            canticoInicial: semana.canticos.inicial?.toString() || '',
            canticoMeio: semana.canticos.meio?.toString() || '',
            canticoFinal: semana.canticos.final?.toString() || '',
            oracao: '',
            tesouros: discursosTestouros,
            leituraBiblia: { tempo: leitura ? `${leitura.duracao} min` : '4 min', estudante: '', estudanteSalaB: '' },
            salaPrincipal: '',
            salaB: '',
            ministerioPrincipal: partesMinisterio.map(p => ({ titulo: p.titulo, tempo: `${p.duracao} min`, participante: '', ajudante: '', material: p.material, cenario: p.cenario, descricao: p.descricao })),
            ministerioSalaB: partesMinisterio.map(p => ({ titulo: p.titulo, tempo: `${p.duracao} min`, participante: '', ajudante: '', material: p.material, cenario: p.cenario, descricao: p.descricao })),
            vidaCrista: partesVidaCristaSimples,
            estudoBiblico: { condutor: '', leitor: '' },
            comentariosFinais: '',
            oracaoFinal: '',
            local: ''
        };
        try {
            const map = db.getVMProgramasByWeek();
            let key = (novo.dataReuniao || novo.data || '').trim();

            let saved: ProgramaVM | undefined = map[key];
            // Se não achou pela chave exata (data), tenta procurar pelo período (novo.data)
            if (!saved && novo.data) {
                saved = Object.values(map).find(p => p.data === novo.data);
            }

            if (saved) {
                novo.dataReuniao = saved.dataReuniao || novo.dataReuniao; // Restaurar data editada
                novo.referenciaBiblica = saved.referenciaBiblica || novo.referenciaBiblica;
                novo.canticoInicial = saved.canticoInicial || novo.canticoInicial;
                novo.canticoMeio = saved.canticoMeio || novo.canticoMeio;
                novo.canticoFinal = saved.canticoFinal || novo.canticoFinal;

                novo.salaPrincipal = saved.salaPrincipal || novo.salaPrincipal;
                novo.salaB = saved.salaB || novo.salaB;

                // Restaurar Tesouros (importante para oradores)
                novo.tesouros = saved.tesouros?.length ? saved.tesouros : novo.tesouros;

                novo.leituraBiblia = saved.leituraBiblia || novo.leituraBiblia;
                novo.ministerioPrincipal = saved.ministerioPrincipal?.length ? saved.ministerioPrincipal : novo.ministerioPrincipal;
                novo.ministerioSalaB = saved.ministerioSalaB?.length ? saved.ministerioSalaB : novo.ministerioSalaB;
                novo.vidaCrista = saved.vidaCrista?.length ? saved.vidaCrista : novo.vidaCrista;
                novo.estudoBiblico = saved.estudoBiblico || novo.estudoBiblico;
                novo.comentariosFinais = saved.comentariosFinais || novo.comentariosFinais;
                novo.oracaoFinal = saved.oracaoFinal || novo.oracaoFinal;
                novo.local = saved.local || novo.local;
            }
        } catch { void 0; }
        return novo;
    }, []);


    // Função para processar semana selecionada automaticamente do jw.org
    const handleImportarSemana = React.useCallback((semana: WeekProgram) => {
        const novo = buildProgramaFromWeek(semana);
        setPrograma(prev => ({ ...novo, local: prev.local }));
        showSuccess(`✅ Programa "${semana.periodo}" importado! Preencha os nomes dos participantes.`);
    }, [buildProgramaFromWeek]);

    useEffect(() => {
        const hoje = new Date();
        const base = todasSemanas.length > 0 ? todasSemanas : semanasMes;

        // Filtro ultra-radical para remover semanas bugadas (1-7 jan)
        const listaSemanas = base.filter(w => {
            const p = (w.periodo || '').toLowerCase();
            const di = w.dataInicio;
            const isBuggedDate = di === '2026-01-01' || di === '2025-01-01' || (p.includes('janeiro') && p.includes('1') && p.includes('7'));
            return !isBuggedDate;
        });

        if (listaSemanas.length > 0 && !selectedSemanaPeriodo) {
            // Tenta encontrar a semana atual para ser a padrão, senão pega a primeira
            const atual = listaSemanas.find(w => {
                const fim = new Date(w.dataFim).getTime();
                return fim >= hoje.getTime();
            });
            const inicial = atual || listaSemanas[0];
            setSelectedSemanaPeriodo(inicial.periodo);
            handleImportarSemana(inicial);
        }
    }, [todasSemanas, semanasMes, selectedSemanaPeriodo, handleImportarSemana]);


    const [programa, setPrograma] = useState<ProgramaVM>({
        data: 'Aguardando importação...',
        dataReuniao: '',
        referenciaBiblica: '',
        canticoInicial: '',
        oracao: '',
        tesouros: [],
        leituraBiblia: { tempo: '4 min', estudante: '' },
        salaPrincipal: '',
        salaB: '',
        ministerioPrincipal: [],
        ministerioSalaB: [],
        canticoMeio: '',
        vidaCrista: [],
        estudoBiblico: { condutor: '', leitor: '' },
        comentariosFinais: '',
        canticoFinal: '',
        oracaoFinal: '',
        local: 'Congregação Noroeste - Palmas, TO'
    });

    // Recuperar dados salvos
    useEffect(() => {
        try {
            const parsed = db.getCurrentVMPrograma();
            if (parsed) {
                setPrograma(parsed);
            }
        } catch {
            // Ignorar erro de parse
        }
    }, []);


    useEffect(() => {
        try {
            db.updateCurrentVMPrograma(programa);
        } catch {
            void 0;
        }
    }, [programa]);

    useEffect(() => {
        const unsub = jworgImportService.onWeeksUpdated(({ weeks }) => {
            setSemanasMes(prev => prev.map(w => {
                const found = weeks.find(x => x.periodo === w.periodo);
                return found ? found : w;
            }));
            setTodasSemanas(prev => prev.map(w => {
                const found = weeks.find(x => x.periodo === w.periodo);
                return found ? found : w;
            }));
            const sel = weeks.find(x => x.periodo === selectedSemanaPeriodo);
            if (sel) {
                const partesMin = sel.partes.filter(p => p.secao === 'ministerio');
                setPrograma(prev => {
                    const mergeItems = (items: MinisterioItem[]) => items.map((it, idx) => {
                        const src = partesMin[idx];
                        if (!src) return it;
                        return {
                            ...it,
                            material: src.material ?? it.material,
                            cenario: src.cenario ?? it.cenario,
                            descricao: src.descricao ?? it.descricao
                        };
                    });
                    return {
                        ...prev,
                        ministerioPrincipal: mergeItems(prev.ministerioPrincipal),
                        ministerioSalaB: mergeItems(prev.ministerioSalaB)
                    };
                });
            }
        });
        return () => { unsub(); };
    }, [selectedSemanaPeriodo]);

    // ... (handlers existentes de input change, export, etc)
    const handleInputChange = (field: string, value: string) => {
        setPrograma({ ...programa, [field]: value });
    };

    // ... (handlers de tooltip e nested changes mantidos)
    useEffect(() => {
        setPrograma(prev => ({
            ...prev,
            oracao: prev.salaPrincipal,
            comentariosFinais: prev.salaPrincipal
        }));
    }, [programa.salaPrincipal]);

    // ... (handlers de tooltip - repetindo setup)
    useEffect(() => {
        const elements = Array.from(document.querySelectorAll('.ministerio-info-btn')) as HTMLElement[];
        let tooltips: Array<{ dispose?: () => void }> = [];
        (async () => {
            try {
                const mod = await import('bootstrap/js/dist/tooltip');
                const Tooltip = mod.default as unknown as {
                    new(el: Element, opts?: unknown): { dispose?: () => void };
                };
                tooltips = elements.map(el => new Tooltip(el, { placement: 'top', trigger: 'click hover focus', html: true, container: 'body' }));
            } catch { void 0; }
        })();
        return () => { tooltips.forEach(t => t?.dispose && t.dispose()); };
    }, [programa.ministerioPrincipal, programa.ministerioSalaB]);

    // Métodos auxiliares de UI
    const handleNestedChange = (section: 'tesouros' | 'ministerioPrincipal' | 'ministerioSalaB' | 'vidaCrista', index: number, field: string, value: string) => {
        const updated = { ...programa };
        if (section === 'tesouros') {
            const items = [...updated.tesouros];
            items[index] = { ...items[index], [field]: value } as TesouroItem;
            updated.tesouros = items;
        } else if (section === 'ministerioPrincipal') {
            const items = [...updated.ministerioPrincipal];
            items[index] = { ...items[index], [field]: value } as MinisterioItem;
            updated.ministerioPrincipal = items;
        } else if (section === 'ministerioSalaB') {
            const items = [...updated.ministerioSalaB];
            items[index] = { ...items[index], [field]: value } as MinisterioItem;
            updated.ministerioSalaB = items;
        } else if (section === 'vidaCrista') {
            const items = [...updated.vidaCrista];
            items[index] = { ...items[index], [field]: value } as VidaCristaItem;
            updated.vidaCrista = items;
        }
        setPrograma(updated);
    };

    const handleAddItem = (section: 'tesouros' | 'ministerioPrincipal' | 'ministerioSalaB' | 'vidaCrista') => {
        const newItem = section === 'tesouros'
            ? { titulo: '', tempo: '', orador: '' }
            : (section === 'ministerioPrincipal' || section === 'ministerioSalaB')
                ? { titulo: '', tempo: '', participante: '', ajudante: '' }
                : { titulo: '', tempo: '', condutor: '' };

        if (section === 'tesouros') {
            setPrograma({ ...programa, tesouros: [...programa.tesouros, newItem as TesouroItem] });
        } else if (section === 'ministerioPrincipal') {
            setPrograma({ ...programa, ministerioPrincipal: [...programa.ministerioPrincipal, newItem as MinisterioItem] });
        } else if (section === 'ministerioSalaB') {
            setPrograma({ ...programa, ministerioSalaB: [...programa.ministerioSalaB, newItem as MinisterioItem] });
        } else if (section === 'vidaCrista') {
            setPrograma({ ...programa, vidaCrista: [...programa.vidaCrista, newItem as VidaCristaItem] });
        }
    };

    const handleRemoveItem = (section: 'tesouros' | 'ministerioPrincipal' | 'ministerioSalaB' | 'vidaCrista', index: number) => {
        if (section === 'tesouros') {
            setPrograma({ ...programa, tesouros: programa.tesouros.filter((_, i) => i !== index) });
        } else if (section === 'ministerioPrincipal') {
            setPrograma({ ...programa, ministerioPrincipal: programa.ministerioPrincipal.filter((_, i) => i !== index) });
        } else if (section === 'ministerioSalaB') {
            setPrograma({ ...programa, ministerioSalaB: programa.ministerioSalaB.filter((_, i) => i !== index) });
        } else if (section === 'vidaCrista') {
            setPrograma({ ...programa, vidaCrista: programa.vidaCrista.filter((_, i) => i !== index) });
        }
    };



    const handlePreviewPDF = async () => {
        const dadosPDF = {
            ...programa,
            presidente: programa.salaPrincipal
        };
        try {
            const url = await exportProgramaVidaMinisterioPDFExact(dadosPDF, 'preview') as unknown as string;
            if (url) setPreviewUrl(url);
        } catch {
            showError('Falha ao gerar preview. Tente exportar.');
        }
    };

    const handleExportRangePDF = () => {
        try {
            let semanasSelecionadas: WeekProgram[] = [];
            const base = todasSemanas.length > 0 ? todasSemanas : semanasMes;
            const start = rangeStartDate ? new Date(rangeStartDate).getTime() : NaN;
            const end = rangeEndDate ? new Date(rangeEndDate).getTime() : NaN;
            if (Number.isNaN(start) || Number.isNaN(end)) {
                showError('Escolha início e fim do intervalo.');
                return;
            }
            semanasSelecionadas = base
                .filter(w => {
                    const di = new Date(w.dataInicio).getTime();
                    return di >= start && di <= end;
                })
                .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
            if (semanasSelecionadas.length === 0) {
                showError('Nenhuma semana encontrada para o intervalo selecionado.');
                return;
            }
            const programas = semanasSelecionadas.map(s => {
                const p = buildProgramaFromWeek(s);
                return { ...p, presidente: p.salaPrincipal };
            });
            exportProgramaVidaMinisterioPDFMulti(programas);
            showSuccess(`PDF exportado com ${programas.length} página(s).`);
        } catch {
            showError('Falha ao exportar PDF de faixa.');
        }
    };

    const handleExportS89Range = () => {
        try {
            let semanasSelecionadas: WeekProgram[] = [];
            const base = todasSemanas.length > 0 ? todasSemanas : semanasMes;
            const start = rangeStartDate ? new Date(rangeStartDate).getTime() : NaN;
            const end = rangeEndDate ? new Date(rangeEndDate).getTime() : NaN;
            if (Number.isNaN(start) || Number.isNaN(end)) {
                showError('Escolha início e fim do intervalo.');
                return;
            }
            semanasSelecionadas = base
                .filter(w => {
                    const di = new Date(w.dataInicio).getTime();
                    return di >= start && di <= end;
                })
                .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());

            if (semanasSelecionadas.length === 0) {
                showError('Nenhuma semana encontrada para o intervalo selecionado.');
                return;
            }

            const programas = semanasSelecionadas.map(s => {
                const p = buildProgramaFromWeek(s);
                return { ...p, presidente: p.salaPrincipal };
            });
            exportS89PDFMulti(programas);
            showSuccess(`S - 89 exportado com ${programas.length} semanas.`);
        } catch {
            showError('Falha ao exportar S-89 de faixa.');
        }
    };

    const handleSave = () => {
        try {
            db.updateCurrentVMPrograma(programa);
            saveWeekProgram();
            showSuccess('Programa salvo para esta semana.');
        } catch {
            showError('Falha ao salvar o programa.');
        }
    };

    const handleExportDesignacoes = () => {
        if (!programa.dataReuniao) {
            showError('Por favor, selecione a Data da Reunião (campo de data) para exportar.');
            return;
        }

        let designacoesCriadas = 0;
        let designacoesAtualizadas = 0;

        const criarOuAtualizarDesignacao = (parte: { participante?: string; estudante?: string; ajudante?: string }, sala: 'Principal' | 'Sala B', ponto: string) => {
            const nomeEstudante = parte.participante || parte.estudante;
            if (!nomeEstudante) return;

            // Filtra nomes inválidos ou rótulos que não são pessoas
            const invalidNames = [
                'Comentários iniciais',
                'Dirigente/Leitor',
                'Dirigente:',
                'Leitor:',
                'Vídeo',
                'Video',
                'Presidente' // Evita auto-referência se o nome for "Presidente" por engano
            ];
            if (invalidNames.some(n => nomeEstudante.includes(n))) return;

            const estudante = pessoas.find(p => p.name === nomeEstudante);
            const studentId = estudante ? estudante.id : '';

            // Define o presidente/conselheiro correto baseado na sala
            const presidente = sala === 'Sala B' ? programa.salaB : programa.salaPrincipal;

            const assignmentData = {
                date: programa.dataReuniao,
                studentId: studentId,
                studentName: nomeEstudante,
                point: ponto,
                room: sala,
                assistant: parte.ajudante || '',
                president: presidente,
                speaker: programa.tesouros[0]?.orador || '',
                bibleReader: programa.leituraBiblia.estudante,
                conductor: programa.vidaCrista[0]?.condutor || '',
                bibleStudyConductor: programa.estudoBiblico.condutor,
                bibleStudyReader: programa.estudoBiblico.leitor
            };

            // Verificar se já existe designação para esta data, ponto e sala
            // Busca por data, ponto e sala para garantir que atualizamos o slot correto, 
            // independentemente de quem estava designado antes.
            const existing = db.getSchoolAssignments().find(a =>
                a.date === assignmentData.date &&
                a.point === assignmentData.point &&
                a.room === assignmentData.room
            );

            if (existing) {
                db.updateSchoolAssignment(existing.id, assignmentData);
                designacoesAtualizadas++;
            } else {
                db.addSchoolAssignment(assignmentData);
                designacoesCriadas++;
            }
        };

        if (programa.leituraBiblia.estudante) {
            criarOuAtualizarDesignacao({ estudante: programa.leituraBiblia.estudante }, 'Principal', 'Leitura da Bíblia');
        }
        if (programa.leituraBiblia.estudanteSalaB) {
            criarOuAtualizarDesignacao({ estudante: programa.leituraBiblia.estudanteSalaB }, 'Sala B', 'Leitura da Bíblia');
        }

        // Exportar Presidente da Sala Principal
        if (programa.salaPrincipal) {
            criarOuAtualizarDesignacao({ estudante: programa.salaPrincipal }, 'Principal', 'Presidente');
        }

        // Exportar Presidente da Sala B (Conselheiro)
        if (programa.salaB) {
            criarOuAtualizarDesignacao({ estudante: programa.salaB }, 'Sala B', 'Presidente Sala B');
        }

        programa.ministerioPrincipal.forEach(item => {
            if (item.participante) {
                criarOuAtualizarDesignacao(item, 'Principal', item.titulo);
            }
        });

        programa.ministerioSalaB.forEach(item => {
            if (item.participante) {
                criarOuAtualizarDesignacao(item, 'Sala B', item.titulo);
            }
        });

        // Exportar Tesouros
        programa.tesouros.forEach(item => {
            if (item.orador) {
                criarOuAtualizarDesignacao({ estudante: item.orador }, 'Principal', item.titulo);
            }
        });

        // Exportar Vida Cristã
        programa.vidaCrista.forEach(item => {
            if (item.condutor) {
                criarOuAtualizarDesignacao({ estudante: item.condutor }, 'Principal', item.titulo);
            }
        });

        // Exportar Estudo Bíblico
        if (programa.estudoBiblico.condutor) {
            criarOuAtualizarDesignacao({ estudante: programa.estudoBiblico.condutor }, 'Principal', 'Estudo Bíblico de Congregação');
        }
        if (programa.estudoBiblico.leitor) {
            criarOuAtualizarDesignacao({ estudante: programa.estudoBiblico.leitor }, 'Principal', 'Leitura do Estudo Bíblico');
        }

        // Exportar Oração Final
        if (programa.oracaoFinal) {
            criarOuAtualizarDesignacao({ estudante: programa.oracaoFinal }, 'Principal', 'Oração Final');
        }

        if (designacoesCriadas > 0 || designacoesAtualizadas > 0) {
            showSuccess(`${designacoesCriadas} criadas e ${designacoesAtualizadas} atualizadas na Escola!`);
        } else {
            showError('Nenhuma designação válida encontrada para exportar.');
        }
    };



    const getLastUsedMap = React.useCallback(() => {
        const mapStudent = new Map<string, number>();
        const mapPresident = new Map<string, number>();
        const mapReader = new Map<string, number>();
        const mapConductor = new Map<string, number>();
        const mapStudyReader = new Map<string, number>();
        const all = db.getSchoolAssignments();
        for (const a of all) {
            const time = new Date(a.date).getTime();
            if (a.studentName) mapStudent.set(a.studentName, Math.max(mapStudent.get(a.studentName) ?? 0, time));
            if (a.president) mapPresident.set(a.president, Math.max(mapPresident.get(a.president) ?? 0, time));
            if (a.bibleReader) mapReader.set(a.bibleReader, Math.max(mapReader.get(a.bibleReader) ?? 0, time));
            if (a.conductor) mapConductor.set(a.conductor, Math.max(mapConductor.get(a.conductor) ?? 0, time));
            if (a.bibleStudyReader) mapStudyReader.set(a.bibleStudyReader, Math.max(mapStudyReader.get(a.bibleStudyReader) ?? 0, time));
        }
        return { mapStudent, mapPresident, mapReader, mapConductor, mapStudyReader };
    }, []);

    const pickByRotation = (names: string[], lastMap: Map<string, number>, exclude: Set<string>) => {
        const sorted = [...names].sort((a, b) => (lastMap.get(a) ?? 0) - (lastMap.get(b) ?? 0));
        for (const n of sorted) {
            if (!exclude.has(n)) return n;
        }
        return sorted[0] ?? '';
    };

    const autoDesignar = () => {
        const maps = getLastUsedMap();
        const mapS = maps.mapStudent;
        const mapP = maps.mapPresident;
        const mapR = maps.mapReader;
        const mapC = maps.mapConductor;
        const mapSR = maps.mapStudyReader;

        // Helper para buscar pessoas aptas para uma função específica (Estudantes)
        const getAptosParaEscola = (titulo: string, exclude: Set<string>) => {
            const t = (titulo || '').toLowerCase();
            return pessoas.filter(p => {
                if (!p.active || p.moved || exclude.has(p.name)) return false;
                const a = p.assignments;
                if (!a) return false;

                // 1. Regras de Gênero Rígidas
                // Somente homens fazem Discurso e Leitura da Bíblia
                if (t.includes('discurso') || t.includes('leitura')) {
                    if (p.gender !== 'M') return false;
                }

                // 2. Regras de Atribuição (Checkboxes)
                if (t.includes('discurso')) return !!a.studentTalk;
                if (t.includes('leitura')) return !!a.bibleReading;

                // Ministério (Sisters can do these)
                if (t.includes('iniciando') || t.includes('conversas')) return !!a.startingConversations;
                if (t.includes('cultivando') || t.includes('interesse')) return !!a.cultivatingInterest;
                if (t.includes('fazendo') || t.includes('discípulo')) return !!a.makingDisciples;
                if (t.includes('explicando') || t.includes('crenças')) return !!a.explainingBeliefs;

                // Fallback for generic students if it's a ministry part but no specific tag matches
                const looksLikeMinistry = t.includes('conversas') || t.includes('interesse') || t.includes('discípulo') || t.includes('crenças');
                if (looksLikeMinistry) return !!(a.startingConversations || a.cultivatingInterest || a.makingDisciples || a.explainingBeliefs);

                return false;
            }).map(p => p.name);
        };

        const usadoSemana = new Set<string>();
        const novo = { ...programa };

        // 1. Presidentes (Homens com atributo president)
        const presAptos = pessoas.filter(p => p.active && !p.moved && p.gender === 'M' && p.assignments?.president).map(p => p.name);
        if (presAptos.length > 0) {
            novo.salaPrincipal = pickByRotation(presAptos, mapP, usadoSemana);
            if (novo.salaPrincipal) usadoSemana.add(novo.salaPrincipal);
        }

        if (presAptos.length > 0) {
            novo.salaB = pickByRotation(presAptos, mapP, usadoSemana);
            if (novo.salaB) usadoSemana.add(novo.salaB);
        }

        // 2. Leitura da Bíblia (Homens apenas)
        const leitoresBibliaAptos = pessoas.filter(p => p.active && !p.moved && p.gender === 'M' && p.assignments?.bibleReading).map(p => p.name);
        if (leitoresBibliaAptos.length > 0) {
            const res = pickByRotation(leitoresBibliaAptos, mapR, usadoSemana);
            novo.leituraBiblia.estudante = res;
            if (res) usadoSemana.add(res);
        }

        if (leitoresBibliaAptos.length > 0) {
            const resB = pickByRotation(leitoresBibliaAptos, mapR, usadoSemana);
            novo.leituraBiblia.estudanteSalaB = resB;
            if (resB) usadoSemana.add(resB);
        }

        // Helper para buscar pessoa
        const getGender = (name: string) => pessoas.find(p => p.name.trim().toLowerCase() === name.trim().toLowerCase())?.gender || 'M';

        // Helper buscar ajudante (mesmo sexo)
        const pickAjudante = (estudante: string, currentUsed: Set<string>) => {
            const gender = getGender(estudante);
            const aptos = pessoas.filter(p => p.active && !p.moved && p.gender === gender && p.assignments?.assistant).map(p => p.name);
            return pickByRotation(aptos, mapS, currentUsed);
        };

        // 3. Ministério Principal
        for (let i = 0; i < novo.ministerioPrincipal.length; i++) {
            const part = novo.ministerioPrincipal[i];
            const aptos = getAptosParaEscola(part.titulo, usadoSemana);
            const participante = pickByRotation(aptos, mapS, usadoSemana);
            part.participante = participante;
            if (participante) usadoSemana.add(participante);

            const isNoAssistantPart = (part.titulo || '').toLowerCase().includes('discurso') || (part.titulo || '').toLowerCase().includes('leitura');
            if (participante && !isNoAssistantPart) {
                const ajud = pickAjudante(participante, usadoSemana);
                if (ajud) {
                    part.ajudante = ajud;
                    usadoSemana.add(ajud);
                }
            } else {
                part.ajudante = '';
            }
        }

        // 4. Ministério Sala B
        for (let i = 0; i < novo.ministerioSalaB.length; i++) {
            const part = novo.ministerioSalaB[i];
            const aptos = getAptosParaEscola(part.titulo, usadoSemana);
            const participante = pickByRotation(aptos, mapS, usadoSemana);
            part.participante = participante;
            if (participante) usadoSemana.add(participante);

            const isNoAssistantPart = (part.titulo || '').toLowerCase().includes('discurso') || (part.titulo || '').toLowerCase().includes('leitura');
            if (participante && !isNoAssistantPart) {
                const ajud = pickAjudante(participante, usadoSemana);
                if (ajud) {
                    part.ajudante = ajud;
                    usadoSemana.add(ajud);
                }
            } else {
                part.ajudante = '';
            }
        }

        // Tesouros (Oradores Homens)
        const oradoresTesouros = pessoas.filter(p => p.active && !p.moved && p.gender === 'M' && (p.assignments?.treasuresTalk || p.assignments?.gems)).map(p => p.name);
        novo.tesouros.forEach((item, idx) => {
            const orador = pickByRotation(oradoresTesouros, mapC, new Set([...usadoSemana, ...usedInTreasures(novo, idx)]));
            item.orador = orador;
            if (orador) usadoSemana.add(orador);
        });

        // Vida Cristã (Oradores Homens)
        const oradoresVida = pessoas.filter(p => p.active && !p.moved && p.gender === 'M' && p.assignments?.parts).map(p => p.name);
        novo.vidaCrista.forEach((item) => {
            const cond = pickByRotation(oradoresVida, mapC, usadoSemana);
            item.condutor = cond;
            if (cond) usadoSemana.add(cond);
        });

        // Estudo Bíblico (Homens)
        const condutoresEstudo = pessoas.filter(p => p.active && !p.moved && p.gender === 'M' && p.assignments?.congregationBibleStudy).map(p => p.name);
        if (condutoresEstudo.length > 0) {
            novo.estudoBiblico.condutor = pickByRotation(condutoresEstudo, mapC, usadoSemana);
            if (novo.estudoBiblico.condutor) usadoSemana.add(novo.estudoBiblico.condutor);
        }

        const leitoresEstudo = pessoas.filter(p => p.active && !p.moved && p.gender === 'M' && p.assignments?.reader).map(p => p.name);
        if (leitoresEstudo.length > 0) {
            novo.estudoBiblico.leitor = pickByRotation(leitoresEstudo, mapSR, usadoSemana);
            if (novo.estudoBiblico.leitor) usadoSemana.add(novo.estudoBiblico.leitor);
        }

        // 5. Oração Final (Somente Homens com prayer checkbox)
        const oradoresOração = pessoas.filter(p => p.active && !p.moved && p.gender === 'M' && p.assignments?.prayer).map(p => p.name);
        if (oradoresOração.length > 0) {
            const oracaoFinal = pickByRotation(oradoresOração, mapR, usadoSemana);
            novo.oracaoFinal = oracaoFinal;
            if (oracaoFinal) usadoSemana.add(oracaoFinal);
        }

        setPrograma(novo);
        showSuccess('Designações automáticas aplicadas respeitando gênero e atribuições.');
    };

    const usedInTreasures = (p: ProgramaVM, currentIndex: number) => {
        const used = new Set<string>();
        p.tesouros.forEach((item, idx) => {
            if (idx !== currentIndex && item.orador) used.add(item.orador);
        });
        return used;
    };

    const saveWeekProgram = React.useCallback(() => {
        try {
            const key = (programa.dataReuniao || programa.data || '').trim();
            if (!key) return;
            db.updateVMProgramaByWeek(key, programa);
        } catch { void 0; }
    }, [programa]);

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Programa Vida e Ministério Cristão</h5>
                <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary" onClick={autoDesignar}>
                        Auto Designar
                    </button>
                    <button className="btn btn-outline-secondary" onClick={atualizarApostilas} disabled={loadingApostilas}>
                        <FaCalendarAlt className="me-2" /> Apostilas
                    </button>
                    <button className="btn btn-success" onClick={handleSave}>
                        <FaSave /> Salvar
                    </button>
                    <button className="btn btn-info text-white" onClick={handleExportDesignacoes}>
                        <FaFileExport /> Exportar para Escola
                    </button>
                    <div className="position-relative">
                        <button className="btn btn-primary" onClick={() => setExportMenuOpen(v => !v)}>
                            <FaFilePdf /> Exportar
                        </button>
                        {exportMenuOpen && (
                            <div className="dropdown-menu show position-absolute mt-1 p-2" style={{ minWidth: 260, right: 0, zIndex: 1050 }}>
                                <div className="d-grid gap-2">
                                    <button
                                        className="btn btn-sm btn-outline-primary text-start"
                                        onClick={() => { setShowIntervalPanel(true); }}
                                    >
                                        PDF — escolher semanas
                                    </button>
                                    <button
                                        className="btn btn-sm btn-outline-secondary text-start"
                                        onClick={() => { setExportMenuOpen(false); handlePreviewPDF(); }}
                                    >
                                        Preview — Semana atual
                                    </button>
                                    <button
                                        className="btn btn-sm btn-outline-success text-start"
                                        onClick={() => { setExportMenuOpen(false); exportS89PDF({ ...programa, presidente: programa.salaPrincipal }); }}
                                    >
                                        Designações (S-89)
                                    </button>
                                </div>
                                {showIntervalPanel && (
                                    <div className="mt-2 border-top pt-2">
                                        <div className="small text-muted mb-1">Escolha o intervalo:</div>
                                        <div className="d-flex gap-2">
                                            <select
                                                className="form-select form-select-sm"
                                                value={rangeStartDate}
                                                onChange={(e) => setRangeStartDate(e.target.value)}
                                                title="Início"
                                            >
                                                <option value="">Início</option>
                                                {(() => {
                                                    const base = todasSemanas.length > 0 ? todasSemanas : semanasMes;
                                                    const ordered = [...base].sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
                                                    return ordered.map(w => (
                                                        <option key={w.dataInicio} value={w.dataInicio}>{new Date(w.dataInicio).toLocaleDateString('pt-BR')} - {w.periodo}</option>
                                                    ));
                                                })()}
                                            </select>
                                            <select
                                                className="form-select form-select-sm"
                                                value={rangeEndDate}
                                                onChange={(e) => setRangeEndDate(e.target.value)}
                                                title="Fim"
                                            >
                                                <option value="">Fim</option>
                                                {(() => {
                                                    const base = todasSemanas.length > 0 ? todasSemanas : semanasMes;
                                                    const ordered = [...base].sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
                                                    return ordered.map(w => (
                                                        <option key={w.dataInicio} value={w.dataInicio}>{new Date(w.dataInicio).toLocaleDateString('pt-BR')} - {w.periodo}</option>
                                                    ));
                                                })()}
                                            </select>
                                        </div>
                                        <div className="d-flex gap-2 mt-2">
                                            <button className="btn btn-sm btn-primary" onClick={() => { setShowIntervalPanel(false); setExportMenuOpen(false); handleExportRangePDF(); }}>
                                                Programa (Intervalo)
                                            </button>
                                            <button className="btn btn-sm btn-success" onClick={() => { setShowIntervalPanel(false); setExportMenuOpen(false); handleExportS89Range(); }}>
                                                S-89 (Intervalo)
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={() => { setShowIntervalPanel(false); setExportMenuOpen(false); }}
                                            >
                                                Fechar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="card-body">

                {loadingApostilas && (
                    <div className="alert alert-info d-flex align-items-center gap-2">
                        <FaSpinner className="fa-spin" /> {statusApostilas || 'Atualizando...'}
                    </div>
                )}

                {previewUrl && (
                    <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center" style={{ zIndex: 1050 }}>
                        <div className="bg-white rounded shadow" style={{ width: '90%', height: '90%' }}>
                            <div className="p-2 border-bottom d-flex justify-content-between align-items-center">
                                <div className="fw-bold">Preview do PDF</div>
                                <div className="d-flex gap-2">
                                    <a className="btn btn-sm btn-outline-secondary" href={previewUrl} target="_blank" rel="noopener noreferrer">Nova aba</a>
                                    <button className="btn btn-sm btn-primary" onClick={() => setPreviewUrl(null)}>Fechar</button>
                                </div>
                            </div>
                            <iframe src={previewUrl} title="preview-pdf" style={{ width: '100%', height: 'calc(100% - 44px)', border: 0 }} />
                        </div>
                    </div>
                )}



                {/* Cabeçalho */}
                <div className="border-bottom pb-3 mb-4">
                    <h6 className="text-primary mb-3">📋 Informações Gerais</h6>
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label small fw-bold">Semana</label>
                            <select
                                className="form-select form-select-sm"
                                value={selectedSemanaPeriodo}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedSemanaPeriodo(val);
                                    const base = todasSemanas.length > 0 ? todasSemanas : semanasMes;
                                    const s = base.find(w => w.periodo === val);
                                    if (s) { handleImportarSemana(s); }
                                }}
                            >
                                <option value="">Selecione...</option>
                                {(() => {
                                    const base = todasSemanas.length > 0 ? todasSemanas : semanasMes;
                                    const rawSaved = localStorage.getItem('vm_programas_by_week');
                                    const savedMap = rawSaved ? JSON.parse(rawSaved) : {};
                                    const savedKeys = new Set(Object.keys(savedMap));
                                    const hoje = new Date();
                                    hoje.setHours(0, 0, 0, 0);

                                    const listaSemanas = [...base]
                                        .filter(w => {
                                            const p = (w.periodo || '').toLowerCase();
                                            const di = w.dataInicio;
                                            // Filtro ultra-radical para as semanas bugadas
                                            if (di === '2026-01-01' || di === '2025-01-01' || (p.includes('janeiro') && p.includes('1') && p.includes('7'))) return false;

                                            const dataFim = new Date(w.dataFim);
                                            const isFutureOrCurrent = dataFim >= hoje;
                                            const hasInfo = savedKeys.has(w.dataInicio) || savedKeys.has(w.periodo);

                                            // Só mostra se for futuro/atual OU se tiver informação salva (importada ou editada)
                                            return isFutureOrCurrent || hasInfo;
                                        })
                                        .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());

                                    const groups: Record<string, typeof listaSemanas> = {};
                                    for (const w of listaSemanas) {
                                        const y = new Date(w.dataInicio).getFullYear().toString();
                                        if (!groups[y]) groups[y] = [];
                                        groups[y].push(w);
                                    }

                                    return Object.keys(groups).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map(year => (
                                        <optgroup key={year} label={year}>
                                            {groups[year].map(w => {
                                                const hasInfo = savedKeys.has(w.dataInicio) || savedKeys.has(w.periodo);
                                                return (
                                                    <option key={`${w.dataInicio} -${w.periodo} `} value={w.periodo}>
                                                        {hasInfo ? '✅ ' : ''}
                                                        {(() => {
                                                            const [y1, m1, d1] = w.dataInicio.split('-').map(x => parseInt(x, 10));
                                                            const [y2, m2, d2] = w.dataFim.split('-').map(x => parseInt(x, 10));
                                                            const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                                                            return (y1 === y2 && m1 === m2) ? `${d1}–${d2} de ${meses[m1 - 1]} de ${y1} ` : `${d1} de ${meses[m1 - 1]}–${d2} de ${meses[m2 - 1]} de ${y2} `;
                                                        })()}
                                                    </option>
                                                );
                                            })}
                                        </optgroup>
                                    ));
                                })()}
                            </select>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label small fw-bold">Data da Reunião (Para Exportação)</label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={programa.dataReuniao}
                                onChange={(e) => handleInputChange('dataReuniao', e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small fw-bold">Referência Bíblica</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={programa.referenciaBiblica}
                                onChange={(e) => handleInputChange('referenciaBiblica', e.target.value)}
                                placeholder="Ex: GÊNESIS 37-40"
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small fw-bold">Cântico Inicial</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={programa.canticoInicial}
                                onChange={(e) => handleInputChange('canticoInicial', e.target.value)}
                                placeholder="Número do cântico"
                            />
                        </div>
                    </div>
                </div>

                {/* Tesouros da Palavra de Deus */}
                <div className="border-bottom pb-3 mb-4">
                    <h6 className="text-primary mb-3">📖 TESOUROS DA PALAVRA DE DEUS</h6>
                    <div className="row g-3 mb-3">
                        <div className="col-md-6">
                            <label className="form-label small fw-bold">Presidente / Responsável Sala Principal</label>
                            <PersonSelector
                                value={programa.salaPrincipal}
                                onChange={(val) => handleInputChange('salaPrincipal', val)}
                                label="Presidente"
                                source="all"
                                assignmentFilter="president"
                            />
                            <small className="text-muted">O presidente é o mesmo para oração inicial e comentários finais</small>
                        </div>
                    </div>

                    {programa.tesouros.map((item, index) => (
                        <div key={index} className="row g-2 mb-2 align-items-end">
                            <div className="col-md-5">
                                <label className="form-label small">Título</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={item.titulo}
                                    onChange={(e) => handleNestedChange('tesouros', index, 'titulo', e.target.value)}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small">Tempo</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={item.tempo}
                                    onChange={(e) => handleNestedChange('tesouros', index, 'tempo', e.target.value)}
                                    placeholder="10 min"
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small">Orador</label>
                                <PersonSelector
                                    value={item.orador}
                                    onChange={(val) => handleNestedChange('tesouros', index, 'orador', val)}
                                    label="Orador"
                                    source="all"
                                    assignmentFilter={item.titulo.toLowerCase().includes('joias') ? ['gems'] : ['treasuresTalk']}
                                />
                                {null}
                            </div>
                            <div className="col-md-1">
                                <button
                                    className="btn btn-sm btn-outline-danger w-100 d-flex align-items-center justify-content-center"
                                    onClick={() => handleRemoveItem('tesouros', index)}
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        className="btn btn-sm btn-outline-primary mt-2"
                        onClick={() => handleAddItem('tesouros')}
                    >
                        + Adicionar Tópico
                    </button>

                    <div className="row g-3 mt-3">
                        <div className="col-md-6">
                            <label className="form-label small fw-bold">Leitura da Bíblia - Tempo</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={programa.leituraBiblia.tempo}
                                onChange={(e) => setPrograma({
                                    ...programa,
                                    leituraBiblia: { ...programa.leituraBiblia, tempo: e.target.value }
                                })}
                                placeholder="4 min"
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small fw-bold">Leitura da Bíblia - Estudante (Salão Principal)</label>
                            <PersonSelector
                                value={programa.leituraBiblia.estudante}
                                onChange={(val) => setPrograma({
                                    ...programa,
                                    leituraBiblia: { ...programa.leituraBiblia, estudante: val }
                                })}
                                label="Leitor da Bíblia (Principal)"
                                source="all"
                                assignmentFilter="bibleReading"
                                genderFilter="M"
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small fw-bold">Leitura da Bíblia - Estudante (Sala B)</label>
                            <PersonSelector
                                value={programa.leituraBiblia.estudanteSalaB || ''}
                                onChange={(val) => setPrograma({
                                    ...programa,
                                    leituraBiblia: { ...programa.leituraBiblia, estudanteSalaB: val }
                                })}
                                label="Leitor da Bíblia (Sala B)"
                                source="all"
                                assignmentFilter="bibleReading"
                                genderFilter="M"
                            />
                        </div>
                    </div>

                    <div className="row g-3 mt-3">
                        <div className="col-md-6">
                            <label className="form-label small fw-bold">Responsável Sala B</label>
                            <PersonSelector
                                value={programa.salaB}
                                onChange={(val) => handleInputChange('salaB', val)}
                                label="Responsável Sala B"
                                source="all"
                                assignmentFilter="president"
                            />
                            {null}
                        </div>
                    </div>
                </div>

                {/* Faça Seu Melhor no Ministério - Sala Principal */}
                <div className="border-bottom pb-3 mb-4">
                    <h6 className="text-primary mb-3">🎯 FAÇA SEU MELHOR NO MINISTÉRIO - Sala Principal</h6>
                    {programa.ministerioPrincipal.map((item, index) => (
                        <div key={index} className="row g-2 mb-2 align-items-end">
                            <div className="col-md-4">
                                <label className="form-label small">Título</label>
                                <div className="d-flex align-items-end gap-2">
                                    <input
                                        type="text"
                                        className="form-control form-control-sm flex-grow-1"
                                        value={item.titulo}
                                        onChange={(e) => handleNestedChange('ministerioPrincipal', index, 'titulo', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm p-0 rounded-circle d-flex align-items-center justify-content-center ministerio-info-btn"
                                        title={`${(() => { const tempo = (item.tempo || '').trim(); const dur = tempo ? `(${tempo.replace(/\\s*min\\.?$/i, 'min.')})` : ''; const c = (item.cenario || '').trim(); const d = (item.descricao || '').trim(); const matRaw = (item.material || '').trim(); const mat = matRaw ? (matRaw.startsWith('(') ? matRaw : `(${matRaw})`) : ''; const sep = c && d ? '. ' : ''; return `${[dur, c].filter(Boolean).join(' ')}${sep}${d}${mat ? ` ${mat}` : ''}`; })()} `}
                                        data-bs-title={`${(() => { const tempo = (item.tempo || '').trim(); const dur = tempo ? `(${tempo.replace(/\\s*min\\.?$/i, 'min.')})` : ''; const c = (item.cenario || '').trim(); const d = (item.descricao || '').trim(); const matRaw = (item.material || '').trim(); const mat = matRaw ? (matRaw.startsWith('(') ? matRaw : `(${matRaw})`) : ''; const sep = c && d ? '. ' : ''; const text = `${[dur, c].filter(Boolean).join(' ')}${sep}${d}${mat ? ` ${mat}` : ''}`; return text.replace(/"/g, '&quot;'); })()} `}
                                        data-bs-toggle="tooltip"
                                        data-bs-placement="top"
                                        data-bs-html="false"
                                        data-bs-trigger="click hover focus"
                                        data-bs-custom-class="ministerio-tooltip"
                                        style={{ width: '22px', height: '22px' }}
                                    >
                                        <FaInfoCircle size={12} />
                                    </button>
                                </div>
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small">Tempo</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={item.tempo}
                                    onChange={(e) => handleNestedChange('ministerioPrincipal', index, 'tempo', e.target.value)}
                                    placeholder="3 min"
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small">Participante</label>
                                <PersonSelector
                                    value={item.participante}
                                    onChange={(val) => handleNestedChange('ministerioPrincipal', index, 'participante', val)}
                                    label="Participante"
                                    source="all"
                                    assignmentFilter={[
                                        'studentTalk',
                                        'bibleReading',
                                        'startingConversations',
                                        'cultivatingInterest',
                                        'makingDisciples',
                                        'explainingBeliefs',
                                        'assistant'
                                    ]}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small">Ajudante</label>
                                <PersonSelector
                                    value={item.ajudante || ''}
                                    onChange={(val) => handleNestedChange('ministerioPrincipal', index, 'ajudante', val)}
                                    label="Ajudante"
                                    source="all"
                                    assignmentFilter="assistant"
                                />
                            </div>
                            <div className="col-md-1">
                                <button
                                    className="btn btn-sm btn-outline-danger w-100 d-flex align-items-center justify-content-center"
                                    onClick={() => handleRemoveItem('ministerioPrincipal', index)}
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        className="btn btn-sm btn-outline-primary mt-2"
                        onClick={() => handleAddItem('ministerioPrincipal')}
                    >
                        + Adicionar Atividade
                    </button>
                </div>

                {/* Faça Seu Melhor no Ministério - Sala B */}
                <div className="border-bottom pb-3 mb-4">
                    <h6 className="text-primary mb-3">🎯 FAÇA SEU MELHOR NO MINISTÉRIO - Sala B</h6>
                    {programa.ministerioSalaB.map((item, index) => (
                        <div key={index} className="row g-2 mb-2 align-items-end">
                            <div className="col-md-4">
                                <label className="form-label small">Título</label>
                                <div className="d-flex align-items-end gap-2">
                                    <input
                                        type="text"
                                        className="form-control form-control-sm flex-grow-1"
                                        value={item.titulo}
                                        onChange={(e) => handleNestedChange('ministerioSalaB', index, 'titulo', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm p-0 rounded-circle d-flex align-items-center justify-content-center ministerio-info-btn"
                                        title={`${(() => { const tempo = (item.tempo || '').trim(); const dur = tempo ? `(${tempo.replace(/\\s*min\\.?$/i, 'min.')})` : ''; const c = (item.cenario || '').trim(); const d = (item.descricao || '').trim(); const matRaw = (item.material || '').trim(); const mat = matRaw ? (matRaw.startsWith('(') ? matRaw : `(${matRaw})`) : ''; const sep = c && d ? '. ' : ''; return `${[dur, c].filter(Boolean).join(' ')}${sep}${d}${mat ? ` ${mat}` : ''}`; })()} `}
                                        data-bs-title={`${(() => { const tempo = (item.tempo || '').trim(); const dur = tempo ? `(${tempo.replace(/\\s*min\\.?$/i, 'min.')})` : ''; const c = (item.cenario || '').trim(); const d = (item.descricao || '').trim(); const matRaw = (item.material || '').trim(); const mat = matRaw ? (matRaw.startsWith('(') ? matRaw : `(${matRaw})`) : ''; const sep = c && d ? '. ' : ''; const text = `${[dur, c].filter(Boolean).join(' ')}${sep}${d}${mat ? ` ${mat}` : ''}`; return text.replace(/"/g, '&quot;'); })()} `}
                                        data-bs-toggle="tooltip"
                                        data-bs-placement="top"
                                        data-bs-html="false"
                                        data-bs-trigger="click hover focus"
                                        data-bs-custom-class="ministerio-tooltip"
                                        style={{ width: '22px', height: '22px' }}
                                    >
                                        <FaInfoCircle size={12} />
                                    </button>
                                </div>
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small">Tempo</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={item.tempo}
                                    onChange={(e) => handleNestedChange('ministerioSalaB', index, 'tempo', e.target.value)}
                                    placeholder="3 min"
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small">Participante</label>
                                <PersonSelector
                                    value={item.participante}
                                    onChange={(val) => handleNestedChange('ministerioSalaB', index, 'participante', val)}
                                    label="Participante"
                                    source="all"
                                    assignmentFilter={(() => {
                                        const t = (item.titulo || '').toLowerCase();
                                        if (t.includes('discurso')) return ['studentTalk'];
                                        if (t.includes('leitura')) return ['bibleReading'];
                                        if (t.includes('iniciando')) return ['startingConversations'];
                                        if (t.includes('cultivando')) return ['cultivatingInterest'];
                                        if (t.includes('fazendo')) return ['makingDisciples'];
                                        if (t.includes('explicando')) return ['explainingBeliefs'];
                                        return [
                                            'studentTalk',
                                            'bibleReading',
                                            'startingConversations',
                                            'cultivatingInterest',
                                            'makingDisciples',
                                            'explainingBeliefs',
                                            'assistant'
                                        ];
                                    })()}
                                    genderFilter={(() => {
                                        const t = (item.titulo || '').toLowerCase();
                                        if (t.includes('discurso') || t.includes('leitura')) return 'M';
                                        return 'all';
                                    })()}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small">Ajudante</label>
                                <PersonSelector
                                    value={item.ajudante || ''}
                                    onChange={(val) => handleNestedChange('ministerioSalaB', index, 'ajudante', val)}
                                    label="Ajudante"
                                    source="all"
                                    assignmentFilter="assistant"
                                />
                            </div>
                            <div className="col-md-1">
                                <button
                                    className="btn btn-sm btn-outline-danger w-100 d-flex align-items-center justify-content-center"
                                    onClick={() => handleRemoveItem('ministerioSalaB', index)}
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        className="btn btn-sm btn-outline-primary mt-2"
                        onClick={() => handleAddItem('ministerioSalaB')}
                    >
                        + Adicionar Atividade
                    </button>
                </div>

                {/* Nossa Vida Cristã */}
                <div className="border-bottom pb-3 mb-4">
                    <h6 className="text-primary mb-3">❤️ NOSSA VIDA CRISTÃ</h6>
                    <div className="mb-3">
                        <label className="form-label small fw-bold">Cântico do Meio</label>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            value={programa.canticoMeio}
                            onChange={(e) => handleInputChange('canticoMeio', e.target.value)}
                            placeholder="Número do cântico"
                        />
                    </div>

                    {programa.vidaCrista.map((item, index) => (
                        <div key={index} className="row g-2 mb-2 align-items-end">
                            <div className="col-md-5">
                                <label className="form-label small">Título</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={item.titulo}
                                    onChange={(e) => handleNestedChange('vidaCrista', index, 'titulo', e.target.value)}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small">Tempo</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={item.tempo}
                                    onChange={(e) => handleNestedChange('vidaCrista', index, 'tempo', e.target.value)}
                                    placeholder="15 min"
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small">Condutor</label>
                                <PersonSelector
                                    value={item.condutor}
                                    onChange={(val) => handleNestedChange('vidaCrista', index, 'condutor', val)}
                                    label="Condutor"
                                    source="all"
                                    assignmentFilter={['parts']}
                                />
                            </div>
                            <div className="col-md-1">
                                <button
                                    className="btn btn-sm btn-outline-danger w-100 d-flex align-items-center justify-content-center"
                                    onClick={() => handleRemoveItem('vidaCrista', index)}
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        className="btn btn-sm btn-outline-primary mt-2"
                        onClick={() => handleAddItem('vidaCrista')}
                    >
                        + Adicionar Item
                    </button>

                    <div className="row g-3 mt-3">
                        <div className="col-md-6">
                            <label className="form-label small fw-bold">Estudo Bíblico - Condutor</label>
                            <PersonSelector
                                value={programa.estudoBiblico.condutor}
                                onChange={(val) => setPrograma({
                                    ...programa,
                                    estudoBiblico: { ...programa.estudoBiblico, condutor: val }
                                })}
                                label="Condutor"
                                source="all"
                                assignmentFilter="congregationBibleStudy"
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small fw-bold">Estudo Bíblico - Leitor</label>
                            <PersonSelector
                                value={programa.estudoBiblico.leitor}
                                onChange={(val) => setPrograma({
                                    ...programa,
                                    estudoBiblico: { ...programa.estudoBiblico, leitor: val }
                                })}
                                label="Leitor"
                                source="all"
                                assignmentFilter="reader"
                            />
                            {null}
                        </div>
                    </div>

                    <div className="row g-3 mt-3">
                        <div className="col-md-6">
                            <label className="form-label small fw-bold">Cântico Final</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={programa.canticoFinal}
                                onChange={(e) => handleInputChange('canticoFinal', e.target.value)}
                                placeholder="Número do cântico"
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small fw-bold">Oração Final</label>
                            <PersonSelector
                                value={programa.oracaoFinal}
                                onChange={(val) => handleInputChange('oracaoFinal', val)}
                                label="Oração Final"
                                source="all"
                                assignmentFilter="prayer"
                            />
                        </div>
                    </div>
                </div>

                {/* Rodapé */}
                <div>
                    <h6 className="text-primary mb-3">📍 Rodapé</h6>
                    <div>
                        <label className="form-label small fw-bold">Local</label>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            value={programa.local}
                            onChange={(e) => handleInputChange('local', e.target.value)}
                            placeholder="Congregação Noroeste - Palmas, TO"
                        />
                    </div>
                </div>
            </div>
        </div >
    );
};
