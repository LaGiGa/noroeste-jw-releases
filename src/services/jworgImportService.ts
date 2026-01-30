import { createClient, type SupabaseClient } from '@supabase/supabase-js';
/**
 * Serviço de Importação de Dados do jw.org
 * VERSÃO COM DADOS REAIS DE DEZEMBRO 2025
 */

export interface WeekProgram {
    periodo: string;
    dataInicio: string;
    dataFim: string;
    leituraBiblica: string;
    canticos: {
        inicial: number | null;
        meio: number | null;
        final: number | null;
    };
    partes: ParteProgramaVM[];
    isFallback?: boolean;
}

export interface ParteProgramaVM {
    numero: number;
    titulo: string;
    duracao: number;
    secao: 'tesouros' | 'ministerio' | 'vida_crista';
    tipo: 'discurso' | 'perguntas_respostas' | 'leitura' | 'demonstracao' | 'estudo_biblico' | 'consideracao_anciao' | 'estudo_congregacao';
    material?: string;
    cenario?: string;
    descricao?: string;
    sala?: 'Principal' | 'Sala B' | 'Ambas';
}

type LegacyContent = {
    partes?: unknown[];
    canticoInicial?: number | string | null;
    canticoMeio?: number | string | null;
    canticoFinal?: number | string | null;
    tesouros?: Array<{ titulo?: string; tempo?: string | number } | string>;
    leituraBiblia?: { tempo?: string | number } | null;
    ministerioPrincipal?: Array<{ titulo?: string; tempo?: string | number; material?: string; cenario?: string; descricao?: string } | string>;
    vidaCrista?: Array<{ titulo?: string; tempo?: string | number } | string>;
    estudoBiblico?: unknown;
    data?: string | null;
    referenciaBiblica?: string | null;
};

let _supabaseClient: SupabaseClient | null = null;
const getSupabaseClient = (): SupabaseClient | null => {
    try {
        const url = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL as string;
        const key = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY as string;
        if (!url || !key) {
            console.warn('Supabase não configurado: verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env da raiz');
            return null;
        }
        if (!_supabaseClient) _supabaseClient = createClient(url, key);
        return _supabaseClient;
    } catch {
        return null;
    }
};

const supabaseOnly = (((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_ONLY) !== 'false');

const deriveDescricaoFromTitulo = (titulo: string, cenario?: string): string | undefined => {
    const scen = titulo.match(/\b(DE CASA EM CASA|TESTEMUNHO INFORMAL|TESTEMUNHO PÚBLICO|CONVERSA INFORMAL|HOUSE\s+TO\s+HOUSE|INFORMAL\s+WITNESSING|PUBLIC\s+WITNESSING)\b/i);
    if (scen && typeof scen.index === 'number') {
        let seg = titulo.slice(scen.index + scen[0].length);
        seg = seg.replace(/^[\s.\-–—:]+/, '').replace(/\s*\((\d{1,2})\s*min\.?\)/i, '').trim();
        seg = seg.replace(/\s*\(([^)]*?\b(?:lmd|th|ap[êe]ndice|cap\.?|lfb)[^)]*?)\)\s*$/i, '').trim();
        return seg || undefined;
    }
    if (cenario) return cenario;
    return undefined;
};

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sanitizeDescricao = (descricao?: string, cenario?: string): string | undefined => {
    if (!descricao) return descricao;
    if (!cenario) return descricao;
    const re = new RegExp(`^\\s*${escapeRegex(cenario)}[\\s.\\-–—:]*`, 'i');
    const out = descricao.replace(re, '').trim();
    return out || undefined;
};

const getDescricaoFromObj = (obj: Record<string, unknown>, cenario?: string): string | undefined => {
    const tryKeys = ['descricao', 'descrição', 'texto', 'detalhe', 'detalhes', 'observacao', 'observação', 'nota', 'notas', 'descricaoCena', 'desc', 'sceneText'];
    for (const k of tryKeys) {
        const v = obj[k];
        if (typeof v === 'string' && v.trim()) return sanitizeDescricao(v.trim(), cenario);
    }
    const ignore = new Set(['titulo', 'tempo', 'material', 'cenario', 'sala']);
    const extraStrings = Object.keys(obj)
        .filter(k => !ignore.has(k))
        .map(k => obj[k])
        .filter(v => typeof v === 'string' && (v as string).trim()) as string[];
    const joined = extraStrings.join('. ').trim();
    return joined ? sanitizeDescricao(joined, cenario) : undefined;
};

const normalizePartesFromContent = (c: LegacyContent): ParteProgramaVM[] | null => {
    const partes = Array.isArray((c as unknown as WeekProgram).partes) ? ((c as unknown as WeekProgram).partes as ParteProgramaVM[]) : null;
    if (!partes || partes.length === 0) return null;
    const ministerioList = Array.isArray(c.ministerioPrincipal) ? c.ministerioPrincipal : [];
    let mi = 0;
    const normalized: ParteProgramaVM[] = partes.map(p => {
        if (p.secao === 'ministerio') {
            const src = ministerioList[mi++];
            const srcObj = typeof src === 'string' ? { titulo: src } : (src || {});
            const material = p.material ?? (srcObj.material ?? undefined);
            const cenario = p.cenario ?? (srcObj.cenario ?? undefined);
            const srcTitulo = typeof src === 'string' ? src : String((srcObj as { titulo?: string }).titulo ?? '');
            const rawDesc = p.descricao
                ?? getDescricaoFromObj(srcObj as Record<string, unknown>, cenario)
                ?? ((srcObj as { descricao?: string }).descricao)
                ?? deriveDescricaoFromTitulo(srcTitulo, cenario)
                ?? deriveDescricaoFromTitulo(p.titulo, cenario);
            const descricao = sanitizeDescricao(rawDesc, cenario);
            return { ...p, material, cenario, descricao, sala: p.sala ?? 'Ambas' };
        }
        return p;
    });
    return normalized;
};

const fetchWeeksFromSupabase = async (issueKey: string, language: string): Promise<WeekProgram[] | null> => {
    const c = getSupabaseClient();
    if (!c) return null;
    const { data, error } = await c
        .from('mwb_weeks')
        .select('content, week_date')
        .eq('issue_key', issueKey)
        .eq('language', language)
        .order('week_date', { ascending: true });
    if (error) {
        console.error('Erro ao consultar mwb_weeks no Supabase:', error.message ?? error);
        return null;
    }
    if (!data || data.length === 0) {
        console.log('Supabase sem dados para', { issueKey, language });
        return null;
    }
    const weeks: WeekProgram[] = [];
    for (const row of data as Array<{ content: LegacyContent; week_date: string }>) {
        const c = row.content as LegacyContent;
        if (c && Array.isArray(c.partes) && c.partes.length > 0) {
            const parseRowDate = (s: string) => {
                const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (!m) return new Date(s);
                return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 0, 0, 0, 0);
            };
            const sd = parseRowDate(row.week_date);
            const ed = new Date(sd); ed.setDate(sd.getDate() + 6);
            const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const normalized = normalizePartesFromContent(c) || ((c as unknown as WeekProgram).partes);
            weeks.push({
                periodo: String((c as unknown as WeekProgram).periodo ?? `${fmt(sd)}–${fmt(ed)}`),
                dataInicio: fmt(sd),
                dataFim: fmt(ed),
                leituraBiblica: String((c as unknown as WeekProgram).leituraBiblica ?? ''),
                canticos: {
                    inicial: (c as unknown as WeekProgram).canticos?.inicial ?? null,
                    meio: (c as unknown as WeekProgram).canticos?.meio ?? null,
                    final: (c as unknown as WeekProgram).canticos?.final ?? null
                },
                partes: normalized,
                isFallback: false
            });
            continue;
        }
        if (!c) continue;
        const parseRowDate = (s: string) => {
            const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (!m) return new Date(s);
            return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 0, 0, 0, 0);
        };
        const sd = parseRowDate(row.week_date);
        const ed = new Date(sd); ed.setDate(sd.getDate() + 6);
        const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const canticos = {
            inicial: parseInt(String(c.canticoInicial ?? ''), 10) || null,
            meio: parseInt(String(c.canticoMeio ?? ''), 10) || null,
            final: parseInt(String(c.canticoFinal ?? ''), 10) || null
        };
        const partes: ParteProgramaVM[] = [];
        if (Array.isArray(c.tesouros)) {
            for (const t of c.tesouros) {
                const titulo = typeof t === 'string' ? t.trim() : String(t.titulo ?? '').trim();
                const dur = typeof t === 'string' ? 10 : (parseInt(String(t.tempo ?? '0'), 10) || 10);
                const tipo: ParteProgramaVM['tipo'] = /leitura/i.test(titulo) ? 'leitura' : 'discurso';
                partes.push({ numero: partes.length + 1, titulo, duracao: dur, secao: 'tesouros', tipo });
            }
        }
        if (c.leituraBiblia && typeof c.leituraBiblia.tempo === 'string') {
            const dur = parseInt(c.leituraBiblia.tempo, 10) || 4;
            partes.push({ numero: partes.length + 1, titulo: 'Leitura da Bíblia', duracao: dur, secao: 'tesouros', tipo: 'leitura' });
        }
        if (Array.isArray(c.ministerioPrincipal)) {
            for (const m of c.ministerioPrincipal) {
                const titulo = typeof m === 'string' ? m.trim() : String(m.titulo ?? '').trim();
                const dur = typeof m === 'string' ? 10 : (parseInt(String(m.tempo ?? '0'), 10) || 10);
                const material = typeof m === 'string' ? undefined : m.material;
                const cenario = typeof m === 'string' ? undefined : m.cenario;
                const rawDesc = typeof m === 'string'
                    ? deriveDescricaoFromTitulo(titulo, cenario)
                    : (getDescricaoFromObj(m as unknown as Record<string, unknown>, cenario) ?? m.descricao ?? deriveDescricaoFromTitulo(titulo, cenario));
                const descricao = sanitizeDescricao(rawDesc, cenario);
                partes.push({ numero: partes.length + 1, titulo, duracao: dur, secao: 'ministerio', tipo: 'demonstracao', material, cenario, descricao, sala: 'Ambas' });
            }
        }
        if (Array.isArray(c.vidaCrista)) {
            for (const v of c.vidaCrista) {
                const titulo = typeof v === 'string' ? v.trim() : String(v.titulo ?? '').trim();
                const dur = typeof v === 'string' ? 10 : (parseInt(String(v.tempo ?? '0'), 10) || 10);
                partes.push({ numero: partes.length + 1, titulo, duracao: dur, secao: 'vida_crista', tipo: 'discurso' });
            }
        }
        if (c.estudoBiblico) {
            partes.push({ numero: partes.length + 1, titulo: 'Estudo de Congregação', duracao: 30, secao: 'vida_crista', tipo: 'estudo_congregacao' });
        }
        weeks.push({
            periodo: String(c.data ?? `${fmt(sd)}–${fmt(ed)}`),
            dataInicio: fmt(sd),
            dataFim: fmt(ed),
            leituraBiblica: String(c.referenciaBiblica ?? ''),
            canticos,
            partes,
            isFallback: true
        });
    }
    return weeks.length > 0 ? weeks : null;
};

const fetchWeeksFromSupabaseRange = async (startDateIso: string, endDateIso: string, language: string): Promise<WeekProgram[]> => {
    const c = getSupabaseClient();
    if (!c) return [];
    const { data, error } = await c
        .from('mwb_weeks')
        .select('content, week_date')
        .gte('week_date', startDateIso)
        .lte('week_date', endDateIso)
        .eq('language', language)
        .order('week_date', { ascending: true });
    if (error || !data) return [];
    const weeks: WeekProgram[] = [];
    for (const row of data as Array<{ content: LegacyContent; week_date: string }>) {
        const c = row.content as LegacyContent;
        if (c && Array.isArray(c.partes) && c.partes.length > 0) {
            const parseRowDate = (s: string) => {
                const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (!m) return new Date(s);
                return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 0, 0, 0, 0);
            };
            const sd = parseRowDate(row.week_date);
            const ed = new Date(sd); ed.setDate(sd.getDate() + 6);
            const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const normalized = normalizePartesFromContent(c) || ((c as unknown as WeekProgram).partes);
            weeks.push({
                periodo: String((c as unknown as WeekProgram).periodo ?? `${fmt(sd)}–${fmt(ed)}`),
                dataInicio: fmt(sd),
                dataFim: fmt(ed),
                leituraBiblica: String((c as unknown as WeekProgram).leituraBiblica ?? ''),
                canticos: {
                    inicial: (c as unknown as WeekProgram).canticos?.inicial ?? null,
                    meio: (c as unknown as WeekProgram).canticos?.meio ?? null,
                    final: (c as unknown as WeekProgram).canticos?.final ?? null
                },
                partes: normalized,
                isFallback: false
            });
            continue;
        }
        if (!c) continue;
        const parseRowDate = (s: string) => {
            const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (!m) return new Date(s);
            return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 0, 0, 0, 0);
        };
        const sd = parseRowDate(row.week_date);
        const ed = new Date(sd); ed.setDate(sd.getDate() + 6);
        const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const canticos = {
            inicial: parseInt(String(c.canticoInicial ?? ''), 10) || null,
            meio: parseInt(String(c.canticoMeio ?? ''), 10) || null,
            final: parseInt(String(c.canticoFinal ?? ''), 10) || null
        };
        const partes: ParteProgramaVM[] = [];
        if (Array.isArray(c.tesouros)) {
            for (const t of c.tesouros) {
                const titulo = typeof t === 'string' ? t.trim() : String(t.titulo ?? '').trim();
                const dur = typeof t === 'string' ? 10 : (parseInt(String(t.tempo ?? '0'), 10) || 10);
                const tipo: ParteProgramaVM['tipo'] = /leitura/i.test(titulo) ? 'leitura' : 'discurso';
                partes.push({ numero: partes.length + 1, titulo, duracao: dur, secao: 'tesouros', tipo });
            }
        }
        if (c.leituraBiblia && typeof c.leituraBiblia.tempo === 'string') {
            const dur = parseInt(c.leituraBiblia.tempo, 10) || 4;
            partes.push({ numero: partes.length + 1, titulo: 'Leitura da Bíblia', duracao: dur, secao: 'tesouros', tipo: 'leitura' });
        }
        if (Array.isArray(c.ministerioPrincipal)) {
            for (const m of c.ministerioPrincipal) {
                const titulo = typeof m === 'string' ? m.trim() : String(m.titulo ?? '').trim();
                const dur = typeof m === 'string' ? 10 : (parseInt(String(m.tempo ?? '0'), 10) || 10);
                const material = typeof m === 'string' ? undefined : m.material;
                const cenario = typeof m === 'string' ? undefined : m.cenario;
                const rawDesc = typeof m === 'string' ? deriveDescricaoFromTitulo(titulo, cenario) : (m.descricao ?? deriveDescricaoFromTitulo(titulo, cenario));
                const descricao = sanitizeDescricao(rawDesc, cenario);
                partes.push({ numero: partes.length + 1, titulo, duracao: dur, secao: 'ministerio', tipo: 'demonstracao', material, cenario, descricao, sala: 'Ambas' });
            }
        }
        if (Array.isArray(c.vidaCrista)) {
            for (const v of c.vidaCrista) {
                const titulo = typeof v === 'string' ? v.trim() : String(v.titulo ?? '').trim();
                const dur = typeof v === 'string' ? 10 : (parseInt(String(v.tempo ?? '0'), 10) || 10);
                partes.push({ numero: partes.length + 1, titulo, duracao: dur, secao: 'vida_crista', tipo: 'discurso' });
            }
        }
        if (c.estudoBiblico) {
            partes.push({ numero: partes.length + 1, titulo: 'Estudo de Congregação', duracao: 30, secao: 'vida_crista', tipo: 'estudo_congregacao' });
        }
        weeks.push({
            periodo: String(c.data ?? `${fmt(sd)}–${fmt(ed)}`),
            dataInicio: fmt(sd),
            dataFim: fmt(ed),
            leituraBiblica: String(c.referenciaBiblica ?? ''),
            canticos,
            partes,
            isFallback: true
        });
    }
    return weeks;
};

export const getIssuePdfPublicUrl = (issueKey: string): string | null => {
    const c = getSupabaseClient();
    if (!c) return null;
    const { data } = c.storage.from('mwb_pdfs').getPublicUrl(`${issueKey}.pdf`);
    return data?.publicUrl ?? null;
};

class JWOrgImportService {
    private memCache: Map<string, WeekProgram[]> = new Map();
    private listeners: Set<(payload: { key: string; weeks: WeekProgram[] }) => void> = new Set();

    public onWeeksUpdated(cb: (payload: { key: string; weeks: WeekProgram[] }) => void): () => void {
        this.listeners.add(cb);
        return () => { this.listeners.delete(cb); };
    }
    private emitWeeksUpdated(key: string, weeks: WeekProgram[]): void {
        for (const l of this.listeners) {
            try { l({ key, weeks }); } catch { /* noop */ }
        }
    }

    private async enrichDescricaoFromJW(weeks: WeekProgram[]): Promise<WeekProgram[]> {
        const needs = weeks.some(w => w.partes.some(p => p.secao === 'ministerio' && !p.descricao));
        if (supabaseOnly && !needs) return weeks;
        const enriched: WeekProgram[] = [];
        for (const w of weeks) {
            try {
                const d0 = new Date(w.dataInicio);
                const mes1 = ((d0.getMonth() + 1) % 2 === 0) ? (d0.getMonth()) : (d0.getMonth() + 1);
                const mes2 = mes1 + 1;
                const slug = this.getBimonthlySlug(mes1, mes2, d0.getFullYear());
                const indexUrl = `https://www.jw.org/pt/biblioteca/jw-apostila-do-mes/${slug}/`;
                const html = await this.fetchText(indexUrl, true);
                const weeksIndex = this.extractWeeksFromIndex(html, indexUrl, d0.getFullYear());
                const match = weeksIndex.find(x => {
                    const norm = (x.periodo || '').replace(/\s+/g, ' ').trim();
                    const target = (w.periodo || '').replace(/\s+/g, ' ').trim();
                    return norm.toLowerCase().includes(target.toLowerCase()) || target.toLowerCase().includes(norm.toLowerCase());
                });
                let parsed: WeekProgram | null = null;
                if (match?.url) {
                    parsed = await this.importarProgramaSemanalUrl(match.url, true);
                }
                if (!parsed) {
                    for (const x of weeksIndex) {
                        const { dataInicio, dataFim } = this.parsePeriodo(x.periodo, d0.getFullYear());
                        if (dataInicio === w.dataInicio && dataFim === w.dataFim) {
                            parsed = await this.importarProgramaSemanalUrl(x.url, true);
                            if (parsed) break;
                        }
                    }
                }
                if (parsed) {
                    const orig = { ...w };
                    const newParts = parsed.partes.filter(p => p.secao === 'ministerio');
                    const origParts = orig.partes.filter(p => p.secao === 'ministerio');
                    for (let i = 0; i < origParts.length; i++) {
                        const o = origParts[i];
                        const n = newParts[i];
                        if (!o.descricao && n?.descricao) {
                            o.descricao = n.descricao;
                        }
                        if (!o.cenario && n?.cenario) {
                            o.cenario = n.cenario;
                        }
                        if (!o.material && n?.material) {
                            o.material = n.material;
                        }
                    }
                    enriched.push(orig);
                } else {
                    enriched.push(w);
                }
            } catch {
                enriched.push(w);
            }
        }
        return enriched;
    }

    async importarApostilaMes(ano: number, mes: number): Promise<WeekProgram[] | null> {
        try {
            const issueMonth = mes % 2 === 0 ? mes - 1 : mes;
            const cacheKey = `${ano}-${String(issueMonth).padStart(2, '0')}`;
            if (this.memCache.has(cacheKey)) {
                const cached = this.memCache.get(cacheKey)!;
                if (Array.isArray(cached) && cached.length > 0) {
                    const ordered = this.orderWeeksByToday(cached);
                    // Filtro de segurança
                    const filtered = ordered.filter(w => {
                        const p = (w.periodo || '').toLowerCase();
                        const di = w.dataInicio;
                        return !(di === '2026-01-01' || di === '2025-01-01' || (p.includes('1') && p.includes('7') && p.includes('janeiro')));
                    });
                    void this.enrichDescricaoFromJW(filtered).then(w => { this.memCache.set(cacheKey, w); this.emitWeeksUpdated(cacheKey, w); }).catch(() => void 0);
                    return filtered;
                }
            }
            const sWeeks = await fetchWeeksFromSupabase(cacheKey, 'pt-BR');
            if (sWeeks && sWeeks.length > 0) {
                // Filtro de segurança
                const filtered = sWeeks.filter(w => {
                    const p = (w.periodo || '').toLowerCase();
                    const di = w.dataInicio;
                    return !(di === '2026-01-01' || di === '2025-01-01' || (p.includes('1') && p.includes('7') && p.includes('janeiro')));
                });
                this.memCache.set(cacheKey, filtered);
                const ordered = this.orderWeeksByToday(filtered);
                void this.enrichDescricaoFromJW(ordered).then(w => { this.memCache.set(cacheKey, w); this.emitWeeksUpdated(cacheKey, w); }).catch(() => void 0);
                return ordered;
            }
            return null;
        } catch {
            return null;
        }
    }

    async listarSemanasAte(anoFim: number, mesFim: number): Promise<WeekProgram[]> {
        try {
            const today = new Date();
            const start = `2024-01-01`;
            const lastDay = new Date(anoFim, mesFim, 0);
            const end = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
            const weeks = await fetchWeeksFromSupabaseRange(start, end, 'pt-BR');
            if (weeks.length > 0) {
                const orderedRaw = weeks
                    .filter(w => {
                        const p = w.periodo.toLowerCase();
                        const isProblematic = (p.includes('1') && p.includes('7') && p.includes('janeiro') && (p.includes('2025') || p.includes('2026')));
                        return !isProblematic;
                    })
                    .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
                void this.enrichDescricaoFromJW(orderedRaw).then(w => this.emitWeeksUpdated('range', w)).catch(() => void 0);
                return orderedRaw;
            }
            const keys: string[] = [];
            const d0 = new Date(today.getFullYear(), today.getMonth(), 1);
            const dEnd = new Date(anoFim, mesFim - 1, 1);
            for (let d = new Date(d0); d.getTime() <= dEnd.getTime(); d.setMonth(d.getMonth() + 1)) {
                const m = d.getMonth() + 1;
                if (m % 2 !== 0) keys.push(`${d.getFullYear()}-${String(m).padStart(2, '0')}`);
            }
            const agg: WeekProgram[] = [];
            for (const k of Array.from(new Set(keys))) {
                const s = await fetchWeeksFromSupabase(k, 'pt-BR');
                if (s && s.length > 0) agg.push(...s);
            }
            // Filtro para remover semanas bugadas e ordenar
            const filtered = agg
                .filter(w => {
                    const p = w.periodo.toLowerCase();
                    const isProblematic = (p.includes('1') && p.includes('7') && p.includes('janeiro') && (p.includes('2025') || p.includes('2026')));
                    return !isProblematic;
                })
                .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
            return filtered;
        } catch {
            return [];
        }
    }

    // buildEditionUrl removido para modo somente leitura via Supabase

    private extractWeeklyLinksFromEdition(html: string, base: string): string[] {
        const links: string[] = [];
        const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let m: RegExpExecArray | null;
        while ((m = re.exec(html)) !== null) {
            const href = m[1];
            const text = m[2].replace(/<[^>]+>/g, ' ').toLowerCase();
            if (/programa[çc][ãa]o.*vida.*minist[ée]rio.*para/i.test(text) || /vida.*minist[ée]rio.*para/i.test(text)) {
                try {
                    const full = new URL(href, base).toString();
                    links.push(full);
                } catch { /* ignore */ }
            }
        }
        // Também pegar por padrão direto no href
        const hrefMatches = html.match(/href="([^"]*Program[^"]*Vida[^"]*Minist[^"]*para[^"]*)"/gi) || [];
        for (const hm of hrefMatches) {
            const h = hm.replace(/^href="/, '').replace(/"$/, '');
            try { links.push(new URL(h, base).toString()); } catch { void 0; }
        }
        // Dedup
        return Array.from(new Set(links));
    }

    public async importarSemanasDaEdicao(editionUrl: string): Promise<WeekProgram[] | null> {
        if (supabaseOnly) return null;
        try {
            const html = await this.fetchText(editionUrl);
            if (!html || !html.trim()) return null;
            const weekLinks = this.extractWeeklyLinksFromEdition(html, editionUrl);
            if (!weekLinks || weekLinks.length === 0) return null;
            const results: WeekProgram[] = [];
            for (const wl of weekLinks) {
                try {
                    const w = await this.importarProgramaSemanalUrl(wl);
                    if (w) results.push(w);
                } catch { void 0; }
            }
            if (results.length === 0) return null;
            // ordenar cronologicamente
            results.sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
            return results;
        } catch {
            return null;
        }
    }

    private async fetchText(url: string, force?: boolean): Promise<string> {
        if (supabaseOnly && !force) throw new Error('supabase_only');
        const timeoutMs = 20000; // Aumentado para 20s
        const timeout = new Promise<string>((_, reject) => {
            setTimeout(() => reject(new Error('timeout')), timeoutMs);
        });

        if (typeof window !== 'undefined') {
            const electronWin = (window as Window & {
                electron?: {
                    fetchText?: (url: string) => Promise<string>;
                    scrapeHtml?: (url: string) => Promise<string>;
                    openConsent?: () => Promise<boolean>;
                }
            }).electron;
            if (electronWin) {
                // 1. Tentar primeiro via net.request (mais rápido)
                if (electronWin.fetchText) {
                    try {
                        const req = electronWin.fetchText(url);
                        return await Promise.race([req, timeout]);
                    } catch (e) {
                        console.warn('fetchText via net.request falhou, tentando scrape via browser window...', e);
                    }
                }

                // 2. Fallback para scrape via janela oculta (mais robusto contra anti-bot)
                if (electronWin.scrapeHtml) {
                    try {
                        return await electronWin.scrapeHtml(url);
                    } catch (e) {
                        console.error('scrapeHtml inicial falhou:', e);

                        // 3. Tentar obter consentimento de cookies (abre janela visível)
                        try {
                            if (electronWin.openConsent) {
                                await electronWin.openConsent();

                                // 4. Tentar novamente via SCRAPE (não net.request), pois a janela oculta compartilha sessão/cookies melhor
                                if (electronWin.scrapeHtml) {
                                    return await electronWin.scrapeHtml(url);
                                }
                            }
                        } catch (consentErr) {
                            console.warn('openConsent/retry falhou:', consentErr);
                        }
                        throw e;
                    }
                }
            }
        }

        // Fallback para fetch nativo (web)
        const req = (async () => {
            const res = await fetch(url);
            return await res.text();
        })();
        return await Promise.race([req, timeout]);
    }


    private getAdminFeedBase(): string | null {
        void this.findMonthlyUrl;
        try {
            if (typeof window !== 'undefined') {
                const v = localStorage.getItem('adminFeedUrl');
                return v && v.trim() ? v.trim() : null;
            }
        } catch { void 0; }
        return null;
    }




    private findMonthlyUrl(html: string, base: string, monthName: string, ano: number): string | null {
        const lower = html.toLowerCase();
        const mName = monthName.toLowerCase();
        const yStr = String(ano);

        // Extrair todos os links
        const links: Array<{ href: string, text: string }> = [];
        const regex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        while ((match = regex.exec(lower)) !== null) {
            // Limpar tags HTML de dentro do texto do link
            const textContent = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            links.push({ href: match[1], text: textContent });
        }

        console.log(`Buscando mês: ${mName}, ano: ${yStr} em ${links.length} links encontrados.`);

        // Estratégia 1: Texto contém mês E (texto contém ano OU href contém ano)
        const exact = links.find(l =>
            l.text.includes(mName) &&
            (l.text.includes(yStr) || l.href.includes(yStr))
        );

        if (exact) {
            console.log('Encontrado por estratégia 1 (Exata):', exact.href);
            try { return new URL(exact.href, base).toString(); } catch { void 0; }
        }

        // Estratégia 2: Texto contém mês e href contém 'apostila' ou 'mwb' (vida e ministério)
        // Isso assume que a página lista principalmente o ano relevante
        const byMonth = links.find(l =>
            l.text.includes(mName) &&
            (l.href.includes('apostila') || l.href.includes('mwb'))
        );

        if (byMonth) {
            console.log('Encontrado por estratégia 2 (Apenas Mês):', byMonth.href);
            try { return new URL(byMonth.href, base).toString(); } catch { void 0; }
        }

        // Estratégia 3: Fallback regex antigo se tudo falhar
        const fallbackRegex = new RegExp(`href="([^"]*${mName}[^"]*${yStr}[^"]*)"`, 'i');
        const m = lower.match(fallbackRegex);
        if (m) {
            try { return new URL(m[1], base).toString(); } catch { void 0; }
        }

        console.log('Nenhum link encontrado para o período especificado.');
        return null;
    }



    private parseRTF(rtf: string, ano: number): WeekProgram[] | null {
        const cleaned = rtf
            .replace(/\\par[d]?/g, '\n')
            .replace(/[{}]/g, '')
            .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
            .replace(/\r/g, '');
        const lines = cleaned.split('\n').map(s => s.trim()).filter(s => s.length > 0);
        const weeks: WeekProgram[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const pm = line.match(/(\d{1,2}\s*-\s*\d{1,2}\s*de\s+[A-Za-zÀ-ÿ]+)/i);
            if (pm) {
                const periodo = pm[1];
                const { dataInicio, dataFim } = this.parsePeriodo(periodo, ano);
                let leitura = '';
                let endIdx = lines.length;
                for (let j = i + 1; j < Math.min(lines.length, i + 200); j++) {
                    if (/(\d{1,2}\s*-\s*\d{1,2}\s*de\s+[A-Za-zÀ-ÿ]+)/i.test(lines[j])) { endIdx = j; break; }
                }
                for (let j = i; j < endIdx; j++) {
                    const l = lines[j];
                    if (!leitura) {
                        const lm = l.match(/(Leitura\s+da\s+B[ií]blia|Leitura|LEITURA)\s+.*?:?\s*(.+)/i);
                        if (lm) leitura = lm[2].trim();
                        else if (/^[A-ZÁÀÂÃÉÈÊÍÌÓÒÔÕÚÙÇ]{3,}(?:\s+\d+)?\s+\d+(?:-\d+)?$/.test(l)) {
                            leitura = l.trim();
                        }
                    }
                }
                const { inicial, meio, final } = this.extractCanticos(lines.slice(i, endIdx));
                const partes = this.extractPartsFromBlock(lines.slice(i, endIdx));
                weeks.push({
                    periodo,
                    dataInicio,
                    dataFim,
                    leituraBiblica: leitura,
                    canticos: { inicial, meio, final },
                    partes
                });
            }
        }
        return weeks.length > 0 ? weeks : null;
    }


    private extractCanticos(blockLines: string[]): { inicial: number | null; meio: number | null; final: number | null } {
        const nums: number[] = [];
        const rePT = /C[âa]ntico[s]?\s*:?\s*(\d+)/i;
        const reEN = /Song\s*(\d+)/i;
        for (const l of blockLines) {
            const m1 = l.match(rePT);
            const m2 = l.match(reEN);
            const pick = m1?.[1] ?? m2?.[1];
            if (pick) {
                const n = parseInt(pick, 10);
                if (!Number.isNaN(n)) nums.push(n);
            }
        }
        return {
            inicial: nums[0] ?? null,
            meio: nums[1] ?? null,
            final: nums[2] ?? null
        };
    }

    private extractPartsFromBlock(blockLines: string[]): ParteProgramaVM[] {
        const parts: ParteProgramaVM[] = [];
        let secao: 'tesouros' | 'ministerio' | 'vida_crista' | null = null;
        for (let k = 0; k < blockLines.length; k++) {
            const ln = blockLines[k];
            if (/tesouros/i.test(ln)) secao = 'tesouros';
            else if (/minist[eé]rio/i.test(ln)) secao = 'ministerio';
            else if (/vida\s+crist[ãa]/i.test(ln)) secao = 'vida_crista';
            else if (/treasures\s+from\s+god[’']s\s+word/i.test(ln)) secao = 'tesouros';
            else if (/apply\s+yourself\s+to\s+the\s+field\s+ministry/i.test(ln)) secao = 'ministerio';
            else if (/our\s+christian\s+life/i.test(ln)) secao = 'vida_crista';
            if (!secao) continue;
            const dm = ln.match(/\((\d{1,2})\s*(?:min\.?|minutos?)\)/i) || ln.match(/(\d{1,2})\s*(?:min\.?|minutos?)/i);
            const dur = dm ? parseInt(dm[1], 10) : 0;
            let tituloHeading = '';
            // procurar título numerado acima
            for (let back = k; back >= 0; back--) {
                const prev = (blockLines[back] || '').trim();
                const hm = prev.match(/^(\d+)[.)]?\s+(.+)$/);
                if (hm) { tituloHeading = hm[2].trim(); break; }
                if (/tesouros|minist[eé]rio|vida\s+crist[ãa]/i.test(prev)) break;
            }
            let titulo = tituloHeading || ln.replace(/\(?\d+\s*(?:min\.?|minutos?)\)?/i, '').replace(/[–—-]\s*$/, '').trim();
            const tmatch = ln.match(/^\s*([^()]+?)\s*\(\d{1,2}\s*(?:min\.?|minutos?)\)/i);
            if (!tituloHeading && tmatch) titulo = tmatch[1].trim();
            titulo = titulo.replace(/^\d+[.)]?\s*/, '').trim();
            titulo = titulo.split(/DE CASA EM CASA|TESTEMUNHO INFORMAL|CONVERSA INFORMAL/i)[0].trim();
            let tipo: ParteProgramaVM['tipo'] = 'discurso';
            if (secao === 'tesouros') {
                if (/leitura/i.test(titulo) || /bible\s+reading/i.test(titulo)) tipo = 'leitura';
                else if (/joias/i.test(titulo) || /spiritual\s+gems/i.test(titulo)) tipo = 'perguntas_respostas';
                else tipo = 'discurso';
            } else if (secao === 'ministerio') {
                tipo = 'demonstracao';
            } else if (secao === 'vida_crista') {
                if (/estudo\s+b[ií]blico\s+de\s+congrega[cç][aã]o/i.test(titulo) || /congregation\s+bible\s+study/i.test(titulo)) tipo = 'estudo_congregacao';
                else if (/necessidades/i.test(titulo) || /local\s+needs/i.test(titulo)) tipo = 'consideracao_anciao';
                else tipo = 'consideracao_anciao';
            }

            let material: string | undefined;
            let cenario: string | undefined;
            let descricao: string | undefined;
            const windowLines = [blockLines[k - 1] || '', ln, blockLines[k + 1] || '', blockLines[k + 2] || ''];
            for (const wl of windowLines) {
                const mat = wl.match(/\b(lmd|th)\b[^\n]*/i) || wl.match(/\bap[êe]ndice\b[^\n]*/i) || wl.match(/\bcap\.?\b[^\n]*/i) || wl.match(/\blfb\b[^\n]*/i);
                if (mat) {
                    const text = mat[0]
                        .replace(/^[–—-]\s*/, '')
                        .replace(/\s{2,}/g, ' ')
                        .trim();
                    if (/lmd|th|ap[êe]ndice|cap\.|lfb/i.test(text)) {
                        material = text;
                    }
                }
                const scen = wl.match(/(DE CASA EM CASA|TESTEMUNHO INFORMAL|CONVERSA INFORMAL|HOUSE\s+TO\s+HOUSE|INFORMAL\s+WITNESSING|PUBLIC\s+WITNESSING)/i);
                if (scen) {
                    cenario = scen[1].toUpperCase();
                    const after = wl.replace(scen[0], '').replace(/^[\s.\-–—:]+/, '').trim();
                    if (after && after.length > 3) {
                        descricao = after;
                    }
                }
            }
            if (!descricao) {
                const nextLine = blockLines[k + 1] || '';
                const m = nextLine.match(/^(Use\s+o\s+jw\.org.+)$/i);
                if (m) descricao = m[1].trim();
            }
            parts.push({
                numero: parts.length + 1,
                titulo,
                duracao: dur,
                secao,
                tipo,
                sala: secao === 'ministerio' ? 'Ambas' : undefined,
                material,
                cenario,
                descricao
            });
        }
        return parts;
    }

    parseFromText(texto: string): WeekProgram | null {
        const lines = texto.split('\n').map(s => s.trim()).filter(Boolean);
        if (lines.length === 0) return null;
        const periodo = 'Importado manualmente';
        const hoje = new Date();
        const meetingDay = 3;
        const d = new Date(hoje);
        const diff = (7 + meetingDay - d.getDay()) % 7;
        d.setDate(d.getDate() + diff);
        const dataInicio = new Date(d);
        dataInicio.setDate(d.getDate() - 3);
        const dataFim = new Date(d);
        dataFim.setDate(d.getDate() + 3);
        const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        let leitura = '';
        for (const l of lines) {
            const lm = l.match(/(Leitura\s+da\s+B[ií]blia|Leitura|LEITURA)\s+.*?:?\s*(.+)/i);
            if (lm) { leitura = lm[2].trim(); break; }
            if (/^[A-ZÁÀÂÃÉÈÊÍÌÓÒÔÕÚÙÇ]{3,}(?:\s+\d+)?\s+\d+(?:-\d+)?$/.test(l)) { leitura = l.trim(); break; }
        }

        const canticosNums: number[] = [];
        for (const l of lines) {
            const cm = l.match(/C[âa]ntico[s]?\s*:?\s*(\d+)/i);
            if (cm) canticosNums.push(parseInt(cm[1], 10));
        }
        const canticos = { inicial: canticosNums[0] ?? null, meio: canticosNums[1] ?? null, final: canticosNums[2] ?? null };

        const partes: ParteProgramaVM[] = [];
        let secao: 'tesouros' | 'ministerio' | 'vida_crista' | null = null;
        const pushParte = (titulo: string, dur: number, extraLine?: string) => {
            let material: string | undefined;
            let cenario: string | undefined;
            let descricao: string | undefined;
            const scan = [titulo, extraLine || ''];
            for (const wl of scan) {
                const mat = wl.match(/\b(lmd|th)\b[^\n]*/i) || wl.match(/\bap[êe]ndice\b[^\n]*/i) || wl.match(/\bcap\.?\b[^\n]*/i) || wl.match(/\blfb\b[^\n]*/i);
                if (mat) material = mat[0].trim();
                const scen = wl.match(/(DE CASA EM CASA|TESTEMUNHO INFORMAL|CONVERSA INFORMAL)/i);
                if (scen) {
                    cenario = scen[1].toUpperCase();
                    const after = wl.replace(scen[0], '').replace(/^[\s.\-–—:]+/, '').trim();
                    if (after && after.length > 3) descricao = after;
                }
            }
            let tipo: ParteProgramaVM['tipo'] = 'discurso';
            const currentSecao: 'tesouros' | 'ministerio' | 'vida_crista' = (secao ?? 'tesouros');
            if (currentSecao === 'tesouros') {
                if (/leitura/i.test(titulo)) tipo = 'leitura';
                else if (/joias/i.test(titulo)) tipo = 'perguntas_respostas';
            } else if (currentSecao === 'ministerio') {
                tipo = 'demonstracao';
            } else if (currentSecao === 'vida_crista') {
                if (/estudo\s+b[ií]blico\s+de\s+congrega[cç][aã]o/i.test(titulo)) tipo = 'estudo_congregacao';
                else if (/necessidades/i.test(titulo)) tipo = 'consideracao_anciao';
            }
            partes.push({ numero: partes.length + 1, titulo, duracao: dur, secao: currentSecao, tipo, material, cenario, descricao, sala: currentSecao === 'ministerio' ? 'Ambas' : undefined });
        };

        for (let i = 0; i < lines.length; i++) {
            const ln = lines[i];
            if (/tesouros/i.test(ln)) { secao = 'tesouros'; continue; }
            if (/fa[çc]a\s+seu\s+melhor\s+no\s+minist[eé]rio/i.test(ln)) { secao = 'ministerio'; continue; }
            if (/nossa\s+vida\s+crist[ãa]/i.test(ln)) { secao = 'vida_crista'; continue; }
            const dur = (ln.match(/\((\d{1,2})\s*min\)/i) || ln.match(/(\d{1,2})\s*min/i))?.[1];
            const tituloRaw = ln.replace(/\((\d{1,2})\s*min\)/i, '').trim();
            if (!secao || !dur) continue;
            const extra = lines[i + 1] || '';
            const titulo = tituloRaw.replace(/\s+\((\d{1,2})\s*min\)/i, '').replace(/^\d+\.?\s*/, '').split(/DE CASA EM CASA|TESTEMUNHO INFORMAL|CONVERSA INFORMAL/i)[0].trim();
            pushParte(titulo, parseInt(dur, 10), extra);
        }

        return { periodo, dataInicio: iso(dataInicio), dataFim: iso(dataFim), leituraBiblica: leitura, canticos, partes };
    }

    private parsePeriodo(periodo: string, anoFallback: number): { dataInicio: string; dataFim: string } {
        const mesesFull = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const mesesAbbr = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const nomeToMonth = (mesNomeRaw: string): number => {
            const mesNome = mesNomeRaw.toLowerCase().replace(/\./g, '');
            let mi = mesesFull.indexOf(mesNome) + 1;
            if (mi <= 0) mi = mesesAbbr.indexOf(mesNome) + 1;
            return mi;
        };
        // Padrão cruzando meses: "26 de janeiro – 1 de fevereiro de 2026"
        const mCross = periodo.match(/(\d{1,2})\s*de\s*([A-Za-zÀ-ÿ.]+)\s*[–—-]\s*(\d{1,2})\s*de\s*([A-Za-zÀ-ÿ.]+)(?:\s+de\s*(\d{4}))?/i);
        if (mCross) {
            const d1 = parseInt(mCross[1], 10);
            const m1i = nomeToMonth(mCross[2]);
            const d2 = parseInt(mCross[3], 10);
            const m2i = nomeToMonth(mCross[4]);
            const yProvided = mCross[5] ? parseInt(mCross[5], 10) : undefined;
            const y2 = yProvided ?? (m2i < m1i ? (anoFallback + 1) : anoFallback);
            const y1 = yProvided ? (m2i < m1i ? (y2 - 1) : y2) : anoFallback;
            const mm1 = String(m1i).padStart(2, '0');
            const mm2 = String(m2i).padStart(2, '0');
            const dd1 = String(d1).padStart(2, '0');
            const dd2 = String(d2).padStart(2, '0');
            return { dataInicio: `${y1}-${mm1}-${dd1}`, dataFim: `${y2}-${mm2}-${dd2}` };
        }
        const mPT = periodo.match(/(\d{1,2})\s*-\s*(\d{1,2})\s*de\s*([A-Za-zÀ-ÿ.]+)/i);
        if (mPT) {
            const d1 = parseInt(mPT[1], 10);
            const d2 = parseInt(mPT[2], 10);
            const mi = nomeToMonth(mPT[3]);
            const mm = mi < 10 ? `0${mi}` : `${mi}`;
            const dd1 = d1 < 10 ? `0${d1}` : `${d1}`;
            const dd2 = d2 < 10 ? `0${d2}` : `${d2}`;
            // Se d2 < d1, assumimos que mudou de mês? Não necessariamente, o texto é "1-7 de Dezembro".
            // Mas se for "29 de maio - 4 de junho", o regex pegaria outra coisa.
            // O regex é (\d)-(\d) de (Mês). Ex: 1-7 de Dezembro.
            // Se fosse transição, seria tratado no parseMonthHtml/RTF geralmente com outro regex? 
            // O regex aqui é específico para "X-Y de Mês". Portanto é o mesmo mês.
            // Mas corrigindo o erro de tipo:
            return { dataInicio: `${anoFallback}-${mm}-${dd1}`, dataFim: `${anoFallback}-${mm}-${dd2}` };
        }
        const mEN = periodo.match(/([A-Za-z]+)\s+(\d{1,2})\s*[–—-]\s*(\d{1,2}),?\s*(\d{4})?/i);
        if (mEN) {
            const month = mEN[1].toLowerCase();
            const d1 = parseInt(mEN[2], 10);
            const d2 = parseInt(mEN[3], 10);
            const year = mEN[4] ? parseInt(mEN[4], 10) : anoFallback;
            const mesesEN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
            const mi = mesesEN.indexOf(month) + 1;
            const mm = mi < 10 ? `0${mi}` : `${mi}`;
            const dd1 = d1 < 10 ? `0${d1}` : `${d1}`;
            const dd2 = d2 < 10 ? `0${d2}` : `${d2}`;
            return { dataInicio: `${year}-${mm}-${dd1}`, dataFim: `${year}-${mm}-${dd2}` };
        }
        return { dataInicio: `${anoFallback}-01-01`, dataFim: `${anoFallback}-01-01` };
    }

    private orderWeeksByToday(weeks: WeekProgram[]): WeekProgram[] {
        const meetingDay = 3;
        const parseIsoLocal = (s: string): Date => {
            const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!m) return new Date(s);
            return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 0, 0, 0, 0);
        };
        const withMeeting = weeks.map(w => {
            const inicio = parseIsoLocal(w.dataInicio);
            const fim = parseIsoLocal(w.dataFim);
            let meeting: Date | null = null;
            for (let i = 0; i < 7; i++) {
                const d = new Date(inicio);
                d.setDate(inicio.getDate() + i);
                if (d > fim) break;
                if (d.getDay() === meetingDay) { d.setHours(0, 0, 0, 0); meeting = d; break; }
            }
            return { w, meeting };
        }).filter(x => x.meeting !== null) as Array<{ w: WeekProgram; meeting: Date }>;
        if (withMeeting.length === 0) return weeks;
        withMeeting.sort((a, b) => a.meeting.getTime() - b.meeting.getTime());
        return withMeeting.map(x => x.w);
    }


    public importarDeArquivoRTF(rtfText: string): WeekProgram[] | null {
        const ano = new Date().getFullYear();
        const semanas = this.parseRTF(rtfText, ano);
        return semanas ? this.orderWeeksByToday(semanas) : null;
    }

    public async importarDeArquivoPDFData(data: ArrayBuffer): Promise<WeekProgram[] | null> {
        try {
            const head = new Uint8Array(data.slice(0, 5));
            const sig = Array.from(head).map(b => String.fromCharCode(b)).join('');
            if (!sig.startsWith('%PDF')) {
                console.warn('Arquivo não é PDF válido (magic header ausente).');
                return null;
            }
            type PdfPage = { getTextContent: () => Promise<{ items: Array<{ str?: string }> }> };
            type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
            type LoadingTask = { promise: Promise<PdfDoc> };
            type PdfJSModule = {
                GlobalWorkerOptions: { workerSrc: string };
                getDocument: (params: unknown) => LoadingTask;
            };
            const pdfjs = (await import('pdfjs-dist')) as unknown as PdfJSModule;
            try {
                const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
                pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
            } catch (e) {
                console.warn('Falha ao resolver URL do worker, usando caminho padrão do pacote:', e);
                pdfjs.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.min.mjs';
            }
            const loadingTask = pdfjs.getDocument({ data });
            const pdf: PdfDoc = await loadingTask.promise;
            let fullText = '';
            for (let p = 1; p <= pdf.numPages; p++) {
                const page = await pdf.getPage(p);
                const content = await page.getTextContent();
                const strings = (content.items as Array<{ str?: string }>).map(it => it.str ?? '').join(' ');
                fullText += strings + '\n';
            }
            console.log(`PDF Extraído: ${fullText.length} caracteres. Início:`, fullText.substring(0, 100));
            const ano = new Date().getFullYear();
            const semanas = this.parseMonthText(fullText, ano);
            if (semanas && semanas.length > 0) {
                return this.orderWeeksByToday(semanas);
            }
            const semanas2 = this.parseMonthTextRobust(fullText, ano);
            return semanas2 && semanas2.length > 0 ? this.orderWeeksByToday(semanas2) : null;
        } catch (err) {
            console.error('Falha ao ler PDF:', err);
            return null;
        }
    }

    private parseMonthText(text: string, ano: number): WeekProgram[] | null {
        const lines = text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
        console.log(`Analisando texto do PDF: ${lines.length} linhas encontradas.`);
        const weeks: WeekProgram[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const pm = line.match(/(\d{1,2}\s*[–—-]\s*\d{1,2}\s*de\s*[A-Za-zÀ-ÿ]+)/i) || line.match(/([A-Za-z]+\s+\d{1,2}\s*[–—-]\s*\d{1,2},?\s*\d{4})/i);
            console.log(`Linha ${i + 1}: "${line}" - Regex match for period:`, pm);
            if (pm) {
                const periodo = pm[1];
                const { dataInicio, dataFim } = this.parsePeriodo(periodo, ano);
                let leitura = '';
                let endIdx = lines.length;
                for (let j = i + 1; j < Math.min(lines.length, i + 200); j++) {
                    if (/(\d{1,2}\s*[–—-]\s*\d{1,2}\s*de\s*[A-Za-zÀ-ÿ]+)/i.test(lines[j]) || /([A-Za-z]+\s+\d{1,2}\s*[–—-]\s*\d{1,2},?\s*\d{4})/i.test(lines[j])) { endIdx = j; break; }
                }
                for (let j = i; j < endIdx; j++) {
                    const l = lines[j];
                    if (!leitura) {
                        const lm = l.match(/(Leitura\s+da\s+B[ií]blia|Leitura|LEITURA|Bible\s+Reading)\s+.*?:?\s*(.+)/i);
                        if (lm) leitura = lm[2].trim();
                        else if (/^[A-ZÁÀÂÃÉÈÊÍÌÓÒÔÕÚÙÇ]{3,}(?:\s+\d+)?\s+\d+(?:-\d+)?$/.test(l)) {
                            leitura = l.trim();
                        }
                    }
                }
                const { inicial, meio, final } = this.extractCanticos(lines.slice(i, endIdx));
                const partes = this.extractPartsFromBlock(lines.slice(i, endIdx));
                weeks.push({
                    periodo,
                    dataInicio,
                    dataFim,
                    leituraBiblica: leitura,
                    canticos: { inicial, meio, final },
                    partes
                });
            }
        }
        return weeks.length > 0 ? weeks : null;
    }

    private stripHtml(html: string): string {
        // Tentar extrair apenas o conteúdo principal para evitar menus/rodapés
        const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || html.match(/<div[^>]*id="[^"]*regionMain[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        let text = mainMatch ? mainMatch[1] : html;

        // Remove scripts e estilos
        text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gmi, '');
        text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gmi, '');
        // Troca quebras de linha (<br>, <p>, <div>) por newline
        text = text.replace(/<(br|p|div|li|h[1-6])[^>]*>/gi, '\n');
        // Remove tags restantes
        text = text.replace(/<[^>]+>/g, ' ');
        // Decodifica entidades básicas (simplificado)
        text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        return text;
    }




    private parseMonthTextRobust(text: string, ano: number): WeekProgram[] | null {
        const normalized = text
            .replace(/\u00A0/g, ' ')
            .replace(/[\s\t\r\f]+/g, ' ')
            .replace(/\s*\((\d{1,2})\s*min\.?\)/gi, ' ($1 min)');
        const periodRegexPt = /(\d{1,2}\s*[–—-]\s*\d{1,2}\s*de\s*[A-Za-zÀ-ÿ]+)/gi;
        const periodRegexEn = /([A-Za-z]+\s+\d{1,2}\s*[–—-]\s*\d{1,2},?\s*\d{4})/gi;
        const matches = [] as Array<{ start: number; end: number; periodo: string }>;
        let m: RegExpExecArray | null;
        while ((m = periodRegexPt.exec(normalized)) !== null) {
            matches.push({ start: m.index, end: m.index + m[0].length, periodo: m[1] });
        }
        while ((m = periodRegexEn.exec(normalized)) !== null) {
            matches.push({ start: m.index, end: m.index + m[0].length, periodo: m[1] });
        }
        if (matches.length === 0) return null;
        matches.sort((a, b) => a.start - b.start);

        const weeks: WeekProgram[] = [];
        for (let i = 0; i < matches.length; i++) {
            const cur = matches[i];
            const nextStart = matches[i + 1]?.start ?? normalized.length;
            const windowTxt = normalized.slice(cur.start, nextStart);
            const { dataInicio, dataFim } = this.parsePeriodo(cur.periodo, ano);
            let leitura = '';
            const leituraMatch = windowTxt.match(/(Leitura\s+da\s+B[ií]blia|Bible\s+Reading)\s*:?\s*([A-ZÁÀÂÃÉÈÊÍÌÓÒÔÕÚÙÇ]{3,}[^\n]+?\d+(?:[-–—]\d+)?)/i)
                || windowTxt.match(/([A-ZÁÀÂÃÉÈÊÍÌÓÒÔÕÚÙÇ]{3,}(?:\s+\d+)?\s+\d+(?:[-–—]\d+)?)/i);
            if (leituraMatch) leitura = (leituraMatch[2] || leituraMatch[1]).trim();

            const cantoNums: number[] = [];
            const cantoRegex = /(C[âa]ntico[s]?|Song)\s*:?\s*(\d{1,3})/gi;
            let cm: RegExpExecArray | null;
            while ((cm = cantoRegex.exec(windowTxt)) !== null) {
                const n = parseInt(cm[2], 10);
                if (!Number.isNaN(n)) cantoNums.push(n);
            }
            const canticos = { inicial: cantoNums[0] ?? null, meio: cantoNums[1] ?? null, final: cantoNums[2] ?? null };

            const partes: ParteProgramaVM[] = [];
            const partRegex = /(\d+\.?\s*)?([^()]{3,}?)\s*(?:\((\d{1,2})\s*(?:min\.?|minutos?)\)|[-–—]?\s*(\d{1,2})\s*(?:min\.?|minutos?))/gi;
            let pm: RegExpExecArray | null;
            let secao: 'tesouros' | 'ministerio' | 'vida_crista' = 'tesouros';
            const aroundAll = windowTxt;
            const secTes = /TESOUROS|TREASURES/i.test(aroundAll);
            const secMin = /MINIST[ÉE]RIO|APPLY\s+YOURSELF/i.test(aroundAll);
            const secVida = /VIDA\s+CRIST[ÃA]|OUR\s+CHRISTIAN\s+LIFE/i.test(aroundAll);
            if (secMin && !secTes) secao = 'ministerio';
            if (secVida && !secTes && !secMin) secao = 'vida_crista';
            while ((pm = partRegex.exec(windowTxt)) !== null) {
                const titulo = pm[2].replace(/\s+/g, ' ').trim().replace(/^\d+[.)]\s*/, '');
                const durRaw = pm[3] || pm[4];
                const dur = parseInt(durRaw, 10);
                let tipo: ParteProgramaVM['tipo'] = 'discurso';
                if (/leitura/i.test(titulo) || /bible\s+reading/i.test(titulo)) tipo = 'leitura';
                else if (/joias/i.test(titulo) || /spiritual\s+gems/i.test(titulo)) tipo = 'perguntas_respostas';
                else if (/estudo\s+b[ií]blico\s+de\s+congrega[cç][aã]o/i.test(titulo) || /congregation\s+bible\s+study/i.test(titulo)) tipo = 'estudo_congregacao';
                else if (/necessidades/i.test(titulo) || /local\s+needs/i.test(titulo)) tipo = 'consideracao_anciao';
                const around = windowTxt.slice(Math.max(0, (pm.index || 0) - 200), Math.min(windowTxt.length, (pm.index || 0) + 200));
                if (/apply\s+yourself|minist[ée]rio/i.test(around)) secao = 'ministerio';
                else if (/vida\s+crist[ãa]|our\s+christian\s+life/i.test(around)) secao = 'vida_crista';
                partes.push({ numero: partes.length + 1, titulo, duracao: dur, secao, tipo, sala: secao === 'ministerio' ? 'Ambas' : undefined });
            }
            weeks.push({ periodo: cur.periodo, dataInicio, dataFim, leituraBiblica: leitura, canticos, partes });
        }
        return weeks;
    }

    public async listarSemanasFuturas(anoFim: number, mesFim: number): Promise<WeekProgram[]> {
        const resultados: WeekProgram[] = [];
        const hoje = new Date();
        const feedBase = this.getAdminFeedBase();
        if (!feedBase) return resultados;
        const y = hoje.getFullYear();
        let m = hoje.getMonth() + 1;
        while (y < anoFim || (y === anoFim && m <= mesFim)) {
            const issue = m % 2 === 0 ? m - 1 : m;
            const fname = `${y}-${String(issue).padStart(2, '0')}.json`;
            const feedUrl = feedBase.endsWith('/') ? `${feedBase}${fname}` : `${feedBase}/${fname}`;
            try {
                const txt = await this.fetchText(feedUrl);
                if (txt && txt.trim()) {
                    const arr = JSON.parse(txt);
                    if (Array.isArray(arr) && arr.length > 0) resultados.push(...arr);
                }
            } catch { void 0; }
            m += 1;
        }
        const mapa = new Map<string, WeekProgram>();
        const hojeMid = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        for (const w of resultados) {
            const fim = new Date(w.dataFim);
            if (fim.getTime() >= hojeMid.getTime()) {
                if (!mapa.has(w.periodo)) mapa.set(w.periodo, w);
            }
        }
        const lista = Array.from(mapa.values());
        lista.sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
        return lista;
    }

    public async importarProgramaSemanalUrl(targetUrl: string, force?: boolean): Promise<WeekProgram | null> {
        let html = '';
        try {
            html = await this.fetchText(targetUrl, force);
        } catch {
            return null;
        }
        if (!html) return null;

        const week = this.parseWeeklyHtml(html, targetUrl);
        if (week) {
            return week;
        }

        const text = this.stripHtml(html);
        let ano = new Date().getFullYear();
        const ym = targetUrl.match(/(20\d{2})/);
        if (ym) {
            ano = parseInt(ym[1], 10);
        }
        const weeks = this.parseMonthTextRobust(text, ano) || this.parseMonthText(text, ano);
        return (weeks && weeks.length > 0) ? weeks[0] : null;
    }

    private parseWeeklyHtml(html: string, sourceUrl?: string): WeekProgram | null {
        const periodoRegex = /(\d{1,2}(?:\s*[-–—]\s*\d{1,2})?\s+de\s+[A-Za-zÀ-ÿ]+(?:\s+de\s+[0-9]{4})?)/i;

        let periodo = '';
        const titleTag = html.match(/<title>([\s\S]*?)<\/title>/i);
        const h1Tag = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

        const candidateText = (titleTag ? titleTag[1] : '') + ' ' + (h1Tag ? h1Tag[1] : '');
        const mPeriodo = candidateText.match(periodoRegex);

        if (mPeriodo) {
            periodo = mPeriodo[1].trim();
        } else {
            const mBody = html.match(new RegExp(`Programa[çc][ãa]o.*?${periodoRegex.source}`, 'i'));
            if (mBody) periodo = mBody[1].trim();
        }

        if (!periodo) {
            console.warn('Não foi possível identificar o período no HTML.');
            periodo = "Semana a definir (Importado)";
        }

        let anoFallback = new Date().getFullYear();
        const mYear = periodo.match(/\d{4}/) || html.match(/(?:20)\d{2}/);
        if (mYear) anoFallback = parseInt(mYear[0], 10);
        else {
            const ym = sourceUrl?.match(/(20\d{2})/);
            if (ym) anoFallback = parseInt(ym[1], 10);
        }

        const { dataInicio, dataFim } = this.parsePeriodo(periodo, anoFallback);

        const canticosRegex = /(?:C[âa]ntico|Song)\s+(\d{1,3})/gi;
        const canticosFound: number[] = [];
        let cm;
        const mainContent = html.match(/<main[\s\S]*?<\/main>/i)?.[0] || html;
        while ((cm = canticosRegex.exec(mainContent)) !== null) {
            canticosFound.push(parseInt(cm[1], 10));
        }
        const uniqueCanticos = [...new Set(canticosFound)];
        const canticos = {
            inicial: uniqueCanticos[0] || null,
            meio: uniqueCanticos[1] || null,
            final: uniqueCanticos[2] || null
        };

        let leituraBiblica = '';
        const p2Match = (
            mainContent.match(/<([a-z0-9]+)[^>]*id=["']p2["'][^>]*>([\s\S]*?)<\/\1>/i) ||
            html.match(/<([a-z0-9]+)[^>]*id=["']p2["'][^>]*>([\s\S]*?)<\/\1>/i) ||
            mainContent.match(/<([a-z0-9]+)[^>]*data-pid=["']2["'][^>]*>([\s\S]*?)<\/\1>/i) ||
            html.match(/<([a-z0-9]+)[^>]*data-pid=["']2["'][^>]*>([\s\S]*?)<\/\1>/i)
        );
        if (p2Match) {
            const inner = p2Match[2] || p2Match[1];
            const p2Text = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            const books = '(G[EÊ]NESIS|ÊXODO|LEV[IÍ]TICO|N[ÚU]MEROS|DEUTERON[ÔO]MIO|JOSU[ÉE]|JU[IÍ]ZES|RUTE|1\\s*SAMUEL|2\\s*SAMUEL|1\\s*REIS|2\\s*REIS|1\\s*CR[ÔO]NICAS|2\\s*CR[ÔO]NICAS|ESDRAS|NEEMIAS|ESTER|J[ÓO]|SALMOS|PROV[ÉE]RBIOS|ECLESIASTES|C[ÂA]NTICO\\s+DOS\\s+C[ÂA]NTICOS|ISA[IÍ]AS|JEREMIAS|LAMENTA[ÇC][ÕO]ES|EZEQUIEL|DANIEL|OSEIAS|JOEL|AM[ÓO]S|OBADIAS|JONAS|MIQUEIAS|NAUM|HABACUQUE|SOFONIAS|AGEU|ZACARIAS|MALAQUIAS|MATEUS|MARCOS|LUCAS|JO[ÃA]O|ATOS|ROMANOS|1\\s*COR[ÍI]NTIOS|2\\s*COR[ÍI]NTIOS|G[ÁA]LATAS|EF[ÉE]SIOS|FILIPENSES|COLOSSENSES|1\\s*TESSALONICENSES|2\\s*TESSALONICENSES|1\\s*TIM[ÓO]TEO|2\\s*TIM[ÓO]TEO|TITO|FILEMON|HEBREUS|TIAGO|1\\s*PEDRO|2\\s*PEDRO|1\\s*JO[ÃA]O|2\\s*JO[ÃA]O|3\\s*JO[ÃA]O|JUDAS|APOCALIPSE)';
            const rxRef = new RegExp(`\\b${books}\\b\\s+\\d+(?:\\s*[:]\\s*\\d+)?(?:\\s*[-–—]\\s*\\d+(?::\\d+)?)?(?:,\\s*\\d+)?`, 'i');
            let candidate = '';
            const labelMatch = p2Text.match(/Leitura\s+da\s+B[ií]blia[^:：]*[:：]\s*(.+)$/i);
            if (labelMatch) {
                const m = labelMatch[1].match(rxRef);
                if (m) candidate = m[0];
            } else {
                const m = p2Text.match(rxRef);
                if (m) candidate = m[0];
            }
            if (candidate) {
                let ref = candidate.trim().replace(/-/g, '–').replace(/\s+/g, ' ');
                const mB = ref.match(new RegExp(`\\b${books}\\b`, 'i'));
                if (mB) ref = ref.replace(mB[0], mB[0].toUpperCase());
                leituraBiblica = ref;
            }
        }

        // 3. Fatiar por Seções
        const partes: ParteProgramaVM[] = [];

        // Função para encontrar índices de forma insensível e tolerante
        const findSectionIndex = (text: string, patterns: RegExp[]) => {
            for (const p of patterns) {
                const idx = text.search(p);
                if (idx !== -1) return idx;
            }
            return -1;
        };

        const idxTesouros = findSectionIndex(mainContent, [/TESOUROS\s+DA\s+PALAVRA/i, /TREASURES\s+FROM/i]);
        const idxMinisterio = findSectionIndex(mainContent, [/FA[ÇC]A\s+SEU\s+MELHOR\s+NO\s+MINIST[ÉE]RIO/i, /APPLY\s+YOURSELF/i, /MINIST[ÉE]RIO/i]); // Mais abrangente
        const idxVida = findSectionIndex(mainContent, [/NOSSA\s+VIDA\s+CRIST[ÃA]/i, /OUR\s+CHRISTIAN\s+LIFE/i, /VIDA\s+CRIST[ÃA]/i]);

        // Se não achar divisões claras, tenta extrair tudo como um bloco único ou falha parcialmente
        // Mas vamos tentar construir os blocos mesmo que parciais
        const sections = [
            { name: 'tesouros', start: idxTesouros, end: idxMinisterio !== -1 ? idxMinisterio : (idxVida !== -1 ? idxVida : mainContent.length) },
            { name: 'ministerio', start: idxMinisterio, end: idxVida !== -1 ? idxVida : mainContent.length },
            { name: 'vida_crista', start: idxVida, end: mainContent.length }
        ];

        sections.forEach(sec => {
            if (sec.start === -1) return;
            const content = mainContent.substring(sec.start, sec.end);

            const textOnly = content
                .replace(/<(h[1-6]|p|div|li)[^>]*>/gi, '\n')
                .replace(/<br[^>]*>/gi, '\n')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ');

            // Regex ajustada para pegar (10 min) ou apenas 10 min se estiver solto
            const regexPart = /(\d+\.)\s+(.+?)\s+\(?(\d{1,2})\s*min\)?/gi;
            const found: Array<{ index: number; end: number; tituloFull: string; duracao: number }> = [];
            let m: RegExpExecArray | null;
            while ((m = regexPart.exec(textOnly)) !== null) {
                found.push({
                    index: m.index || 0,
                    end: regexPart.lastIndex,
                    tituloFull: (m[2] || '').trim(),
                    duracao: parseInt(m[3], 10)
                });
            }
            for (let i = 0; i < found.length; i++) {
                const cur = found[i];
                const nextStart = i + 1 < found.length ? found[i + 1].index : textOnly.length;
                const postText = textOnly.slice(cur.end, nextStart);

                const titulo = cur.tituloFull;
                let tipo: ParteProgramaVM['tipo'] = 'discurso';
                let material: string | undefined;
                let cenario: string | undefined;
                let descricao: string | undefined;

                if (sec.name === 'tesouros') {
                    if (/leitura/i.test(titulo) || /bible\s+reading/i.test(titulo)) tipo = 'leitura';
                    else if (/joias/i.test(titulo) || /gems/i.test(titulo)) tipo = 'perguntas_respostas';
                } else if (sec.name === 'ministerio') {
                    tipo = 'demonstracao';
                    const scen = postText.match(/\b(DE CASA EM CASA|TESTEMUNHO INFORMAL|TESTEMUNHO PÚBLICO|CONVERSA INFORMAL|HOUSE\s+TO\s+HOUSE|INFORMAL\s+WITNESSING|PUBLIC\s+WITNESSING)\b/i);
                    if (scen) cenario = scen[1].toUpperCase();
                    const matPar = postText.match(/\(([^)]*?\b(?:lmd|th|ap[êe]ndice|cap\.?|lfb)[^)]*?)\)/i);
                    if (matPar) material = matPar[1].trim();
                    const clean = postText.replace(/\s+/g, ' ').trim();
                    let desc = clean;
                    if (cenario) {
                        const re = new RegExp(`^\\s*${cenario.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}[\\s.\\-–—:]*`, 'i');
                        desc = desc.replace(re, '').trim();
                    }
                    if (material) {
                        const reMat = new RegExp(`\\s*\\(${material.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\)\\s*$`, 'i');
                        desc = desc.replace(reMat, '').trim();
                    }
                    if (desc) descricao = desc;
                } else if (sec.name === 'vida_crista') {
                    if (/estudo/i.test(titulo) && /congrega/i.test(titulo)) tipo = 'estudo_congregacao';
                    else if (/necessidades/i.test(titulo)) tipo = 'consideracao_anciao';
                }

                partes.push({
                    numero: partes.length + 1,
                    titulo,
                    duracao: cur.duracao,
                    secao: (sec.name as 'tesouros' | 'ministerio' | 'vida_crista'),
                    tipo,
                    sala: sec.name === 'ministerio' ? 'Ambas' : undefined,
                    material,
                    cenario,
                    descricao
                });
            }
        });

        // Recuperação de Leitura da Bíblia (Refinamento)
        const leituraPart = partes.find(p => p.secao === 'tesouros' && p.tipo === 'leitura');
        if (!leituraBiblica && leituraPart) {
            const mRef = leituraPart.titulo.match(/(?:Leitura|Reading).*?:\s*(.+)/i);
            if (mRef) {
                const candidate = mRef[1].trim();
                const books = '(G[EÊ]NESIS|ÊXODO|LEV[IÍ]TICO|N[ÚU]MEROS|DEUTERON[ÔO]MIO|JOSU[ÉE]|JU[IÍ]ZES|RUTE|1\\s*SAMUEL|2\\s*SAMUEL|1\\s*REIS|2\\s*REIS|1\\s*CR[ÔO]NICAS|2\\s*CR[ÔO]NICAS|ESDRAS|NEEMIAS|ESTER|J[ÓO]|SALMOS|PROV[ÉE]RBIOS|ECLESIASTES|C[ÂA]NTICO\\s+DOS\\s+C[ÂA]NTICOS|ISA[IÍ]AS|JEREMIAS|LAMENTA[ÇC][ÕO]ES|EZEQUIEL|DANIEL|OSEIAS|JOEL|AM[ÓO]S|OBADIAS|JONAS|MIQUEIAS|NAUM|HABACUQUE|SOFONIAS|AGEU|ZACARIAS|MALAQUIAS|MATEUS|MARCOS|LUCAS|JO[ÃA]O|ATOS|ROMANOS|1\\s*COR[ÍI]NTIOS|2\\s*COR[ÍI]NTIOS|G[ÁA]LATAS|EF[ÉE]SIOS|FILIPENSES|COLOSSENSES|1\\s*TESSALONICENSES|2\\s*TESSALONICENSES|1\\s*TIM[ÓO]TEO|2\\s*TIM[ÓO]TEO|TITO|FILEMON|HEBREUS|TIAGO|1\\s*PEDRO|2\\s*PEDRO|1\\s*JO[ÃA]O|2\\s*JO[ÃA]O|3\\s*JO[ÃA]O|JUDAS|APOCALIPSE)';
                const rxValida = new RegExp(`\\b${books}\\b\\s+\\d+(?:\\s*[-–—]\\s*\\d+)?(?:,\\s*\\d+)?`, 'i');
                if (rxValida.test(candidate)) {
                    let ref = candidate.replace(/-/g, '–').replace(/\s+/g, ' ').trim();
                    const mBook = ref.match(new RegExp(`\\b${books}\\b`, 'i'));
                    if (mBook) {
                        ref = ref.replace(mBook[0], mBook[0].toUpperCase());
                    }
                    leituraBiblica = ref;
                } else {
                    leituraBiblica = '';
                }
                leituraPart.titulo = "Leitura da Bíblia";
            }
        }

        // Se ainda não achou leitura, tenta regex direta no bloco html
        if (!leituraBiblica && idxTesouros !== -1) {
            const htmlTesouros = mainContent.substring(idxTesouros, idxMinisterio !== -1 ? idxMinisterio : mainContent.length);
            const mGlobal = htmlTesouros.match(/Leitura\s+da\s+B[ií]blia[^<]{0,80}?(?:[:：]\s*)?([A-Za-zÀ-ÿ]+(?:\s+\d+)?\s+\d+(?:\s*[-–—]\s*\d+)?(?:,\s*\d+)*)/i)
                || htmlTesouros.match(/Bible\s+Reading[^<]{0,80}?(?:[:：]\s*)?([A-Za-zÀ-ÿ]+(?:\s+\d+)?\s+\d+(?:\s*[-–—]\s*\d+)?(?:,\s*\d+)*)/i);
            if (mGlobal) leituraBiblica = mGlobal[1].replace(/<[^>]+>/g, '').trim();
            if (!leituraBiblica) {
                const plainTes = htmlTesouros.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
                const mAlt = plainTes.match(/\b(?:Leitura\s+da\s+B[ií]blia|Bible\s+Reading)\b[^.]{0,120}?([A-Za-zÀ-ÿ]+(?:\s+\d+)?\s+\d+(?:\s*[-–—]\s*\d+)?(?:,\s*\d+)*)/i);
                if (mAlt) leituraBiblica = mAlt[1].trim();
                if (!leituraBiblica) {
                    const books = '(G[EÊ]NESIS|ÊXODO|LEV[IÍ]TICO|N[ÚU]MEROS|DEUTERON[ÔO]MIO|JOSU[ÉE]|JU[IÍ]ZES|RUTE|1\\s*SAMUEL|2\\s*SAMUEL|1\\s*REIS|2\\s*REIS|1\\s*CR[ÔO]NICAS|2\\s*CR[ÔO]NICAS|ESDRAS|NEEMIAS|ESTER|J[ÓO]|SALMOS|PROV[ÉE]RBIOS|ECLESIASTES|C[ÂA]NTICO\\s+DOS\\s+C[ÂA]NTICOS|ISA[IÍ]AS|JEREMIAS|LAMENTA[ÇC][ÕO]ES|EZEQUIEL|DANIEL|OSEIAS|JOEL|AM[ÓO]S|OBADIAS|JONAS|MIQUEIAS|NAUM|HABACUQUE|SOFONIAS|AGEU|ZACARIAS|MALAQUIAS|MATEUS|MARCOS|LUCAS|JO[ÃA]O|ATOS|ROMANOS|1\\s*COR[ÍI]NTIOS|2\\s*COR[ÍI]NTIOS|G[ÁA]LATAS|EF[ÉE]SIOS|FILIPENSES|COLOSSENSES|1\\s*TESSALONICENSES|2\\s*TESSALONICENSES|1\\s*TIM[ÓO]TEO|2\\s*TIM[ÓO]TEO|TITO|FILEMON|HEBREUS|TIAGO|1\\s*PEDRO|2\\s*PEDRO|1\\s*JO[ÃA]O|2\\s*JO[ÃA]O|3\\s*JO[ÃA]O|JUDAS|APOCALIPSE)';
                    const mBook = plainTes.match(new RegExp(`\\b${books}\\b\\s+\\d+(?:\\s*[-–—]\\s*\\d+)?(?:,\\s*\\d+)?`, 'i'));
                    if (mBook) {
                        let ref = mBook[0].trim().replace(/-/g, '–');
                        const mB = ref.match(new RegExp(`\\b${books}\\b`, 'i'));
                        if (mB) ref = ref.replace(mB[0], mB[0].toUpperCase());
                        leituraBiblica = ref;
                    }
                }
            }
        }
        // Busca final em todo HTML para casos como "ISAÍAS 11–13" fora do bloco de Tesouros
        if (!leituraBiblica) {
            const plainAll = mainContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
            const books = '(G[EÊ]NESIS|ÊXODO|LEV[IÍ]TICO|N[ÚU]MEROS|DEUTERON[ÔO]MIO|JOSU[ÉE]|JU[IÍ]ZES|RUTE|1\\s*SAMUEL|2\\s*SAMUEL|1\\s*REIS|2\\s*REIS|1\\s*CR[ÔO]NICAS|2\\s*CR[ÔO]NICAS|ESDRAS|NEEMIAS|ESTER|J[ÓO]|SALMOS|PROV[ÉE]RBIOS|ECLESIASTES|C[ÂA]NTICO\\s+DOS\\s+C[ÂA]NTICOS|ISA[IÍ]AS|JEREMIAS|LAMENTA[ÇC][ÕO]ES|EZEQUIEL|DANIEL|OSEIAS|JOEL|AM[ÓO]S|OBADIAS|JONAS|MIQUEIAS|NAUM|HABACUQUE|SOFONIAS|AGEU|ZACARIAS|MALAQUIAS|MATEUS|MARCOS|LUCAS|JO[ÃA]O|ATOS|ROMANOS|1\\s*COR[ÍI]NTIOS|2\\s*COR[ÍI]NTIOS|G[ÁA]LATAS|EF[ÉE]SIOS|FILIPENSES|COLOSSENSES|1\\s*TESSALONICENSES|2\\s*TESSALONICENSES|1\\s*TIM[ÓO]TEO|2\\s*TIM[ÓO]TEO|TITO|FILEMON|HEBREUS|TIAGO|1\\s*PEDRO|2\\s*PEDRO|1\\s*JO[ÃA]O|2\\s*JO[ÃA]O|3\\s*JO[ÃA]O|JUDAS|APOCALIPSE)';
            const rx = new RegExp(`\\b${books}\\b\\s+\\d+(?:\\s*[-–—]\\s*\\d+)?(?:,\\s*\\d+)?`, 'i');
            const mAny = plainAll.match(rx);
            if (mAny) {
                let ref = mAny[0].trim().replace(/-/g, '–');
                const mB = ref.match(new RegExp(`\\b${books}\\b`, 'i'));
                if (mB) ref = ref.replace(mB[0], mB[0].toUpperCase());
                leituraBiblica = ref;
            }
        }

        return {
            periodo,
            dataInicio,
            dataFim,
            leituraBiblica,
            canticos,
            partes
        };
    }

    /**
     * Lista as semanas disponíveis no site JW.org a partir da data atual.
     * Varre os índices bimestrais (ex: jan-fev, mar-abr) para encontrar links de semanas.
     */
    public async listarSemanasDisponiveisOnline(): Promise<Array<{ periodo: string; url: string; ano: number }>> {
        if (supabaseOnly) return [];
        const foundWeeks: Array<{ periodo: string; url: string; ano: number }> = [];
        const hoje = new Date();
        const mesesParaChecar = 6; // Verifica até 6 meses à frente

        // Determina os pares de meses (bimestres) para verificar
        // As revistas são bimestrais: jan-fev, mar-abr, mai-jun, jul-ago, set-out, nov-dez
        const bimestresChecados = new Set<string>();

        for (let i = 0; i < mesesParaChecar; i++) {
            const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
            const mes = d.getMonth() + 1; // 1-12
            const ano = d.getFullYear();

            // Encontrar o início do bimestre (1, 3, 5, 7, 9, 11)
            const mesInicio = mes % 2 !== 0 ? mes : mes - 1;
            const mesFim = mesInicio + 1;

            const slug = this.getBimonthlySlug(mesInicio, mesFim, ano);
            if (bimestresChecados.has(slug)) continue;
            bimestresChecados.add(slug);

            const urlIndex = `https://www.jw.org/pt/biblioteca/jw-apostila-do-mes/${slug}/`;
            console.log(`Verificando índice: ${urlIndex}`);

            try {
                const html = await this.fetchText(urlIndex);
                if (html) {
                    const weeks = this.extractWeeksFromIndex(html, urlIndex, ano);
                    foundWeeks.push(...weeks);
                }
            } catch (e) {
                console.warn(`Falha ao verificar índice ${slug}:`, e);
            }
        }

        return foundWeeks;
    }

    private getBimonthlySlug(mes1: number, mes2: number, ano: number): string {
        const nomes = [
            '', 'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ];
        // Nota: 'marco' sem cedilha é o padrão observado nas URLs
        return `${nomes[mes1]}-${nomes[mes2]}-${ano}-mwb`;
    }

    private extractWeeksFromIndex(html: string, baseUrl: string, ano: number): Array<{ periodo: string; url: string; ano: number }> {
        const results: Array<{ periodo: string; url: string; ano: number }> = [];
        // Regex para encontrar links que parecem ser de semanas
        // Ex: href="/pt/biblioteca/jw-apostila-do-mes/marco-abril-2026-mwb/Programa%C3%A7%C3%A3o-da-Reuni%C3%A3o-Vida-e-Minist%C3%A9rio-para-2-8-de-mar%C3%A7o-de-2026/"
        const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?(\d{1,2}\s*(?:[-–—]\s*\d{1,2})?\s*de\s*[A-Za-zÀ-ÿ]+(?:\s*de\s*\d{4})?)[\s\S]*?<\/a>/gi;

        let match;
        const seenUrls = new Set<string>();

        while ((match = linkRegex.exec(html)) !== null) {
            const href = match[1];
            const textoLink = match[2].trim(); // Ex: "2-8 de março"

            if (href.includes('Programa') && !seenUrls.has(href)) {
                // Tenta validar se é realmente uma semana (tem números e datas)
                if (/\d/.test(textoLink)) {
                    seenUrls.add(href);
                    try {
                        const fullUrl = new URL(href, baseUrl).toString();
                        results.push({
                            periodo: textoLink,
                            url: fullUrl,
                            ano: ano
                        });
                    } catch { /* ignore invalid urls */ }
                }
            }
        }
        return results;
    }

}

declare global {
    interface Window {
        electron?: {
            fetchText?: (url: string) => Promise<string>;
            fetchBinary?: (url: string) => Promise<Uint8Array>;
            scrapeHtml?: (url: string) => Promise<string>;
            mwbExtract?: (params: unknown) => Promise<WeekProgram[]>;
        };
    }
}

export const jworgImportService = new JWOrgImportService();
