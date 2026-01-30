// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Secao = 'tesouros' | 'ministerio' | 'vida_crista';
type TipoParte = 'discurso' | 'perguntas_respostas' | 'leitura' | 'demonstracao' | 'estudo_biblico' | 'consideracao_anciao' | 'estudo_congregacao';

interface ParteProgramaVM {
  numero: number;
  titulo: string;
  duracao: number;
  secao: Secao;
  tipo: TipoParte;
  material?: string;
  cenario?: string;
  descricao?: string;
  sala?: 'Principal' | 'Sala B' | 'Ambas';
}

interface WeekProgram {
  periodo: string;
  dataInicio: string;
  dataFim: string;
  leituraBiblica: string;
  canticos: { inicial: number | null; meio: number | null; final: number | null };
  partes: ParteProgramaVM[];
}

const PROJECT_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY);

const bimestreInicio = (m: number) => (m % 2 === 0 ? m - 1 : m);

const buildEditionUrl = (ano: number, mesInicioImpar: number): string => {
  const mesesSlug = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const m1 = mesInicioImpar;
  const m2 = mesInicioImpar + 1;
  const slug = `${mesesSlug[m1 - 1]}-${mesesSlug[m2 - 1]}-${ano}-mwb`;
  return `https://www.jw.org/pt/biblioteca/jw-apostila-do-mes/${slug}/`;
};

const extractWeeklyLinksFromEdition = (html: string, base: string): string[] => {
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
  const hrefMatches = html.match(/href="([^"]*Program[^"]*Vida[^"]*Minist[^"]*para[^"]*)"/gi) || [];
  const hrefMatchesPt = html.match(/href="([^"]*Programa(?:%C3%A7|ção)[^"]*Vida[^"]*Minist(?:%C3%A9|ério)[^"]*para[^"]*)"/gi) || [];
  for (const hm of hrefMatches) {
    const h = hm.replace(/^href="/, '').replace(/"$/,'');
    try { links.push(new URL(h, base).toString()); } catch { /* ignore */ }
  }
  for (const hm of hrefMatchesPt) {
    const h = hm.replace(/^href="/, '').replace(/"$/,'');
    try { links.push(new URL(h, base).toString()); } catch { /* ignore */ }
  }
  return Array.from(new Set(links));
};

const parsePeriodo = (periodo: string, anoFallback: number): { dataInicio: string; dataFim: string } => {
  const mCross = periodo.match(/(\d{1,2})(?:\s*(?:\.º|º|°))?\s*de\s*([A-Za-zÀ-ÿ.]+)\s*(?:[–—-]|\s+a\s+)\s*(\d{1,2})(?:\s*(?:\.º|º|°))?\s*de\s*([A-Za-zÀ-ÿ.]+)(?:\s*de\s*(\d{4}))?/i);
  if (mCross) {
    const d1 = parseInt(mCross[1], 10);
    const d2 = parseInt(mCross[3], 10);
    const mes1 = mCross[2].toLowerCase().replace(/\./g, '');
    const mes2 = mCross[4].toLowerCase().replace(/\./g, '');
    const ano = mCross[5] ? parseInt(mCross[5], 10) : anoFallback;
    const mesesFull = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const mesesAbbr = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const idx1 = (mesesFull.indexOf(mes1) >= 0 ? mesesFull.indexOf(mes1) : mesesAbbr.indexOf(mes1)) + 1;
    const idx2 = (mesesFull.indexOf(mes2) >= 0 ? mesesFull.indexOf(mes2) : mesesAbbr.indexOf(mes2)) + 1;
    const mm1 = idx1 < 10 ? `0${idx1}` : `${idx1}`;
    const mm2 = idx2 < 10 ? `0${idx2}` : `${idx2}`;
    const dd1 = d1 < 10 ? `0${d1}` : `${d1}`;
    const dd2 = d2 < 10 ? `0${d2}` : `${d2}`;
    // Se cruzar de Dez para Jan, ajustar ano de término
    const endYear = idx2 < idx1 ? ano + 1 : ano;
    return { dataInicio: `${ano}-${mm1}-${dd1}`, dataFim: `${endYear}-${mm2}-${dd2}` };
  }
  const mPT = periodo.match(/(\d{1,2})(?:\s*(?:\.º|º|°))?\s*(?:-|a)\s*(\d{1,2})(?:\s*(?:\.º|º|°))?\s*de\s*([A-Za-zÀ-ÿ.]+)/i);
  if (mPT) {
    const d1 = parseInt(mPT[1], 10);
    const d2 = parseInt(mPT[2], 10);
    const mesNome = mPT[3].toLowerCase().replace(/\./g, '');
    const mesesFull = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const mesesAbbr = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    let mi = mesesFull.indexOf(mesNome) + 1;
    if (mi <= 0) mi = mesesAbbr.indexOf(mesNome) + 1;
    const mm = mi < 10 ? `0${mi}` : `${mi}`;
    const dd1 = d1 < 10 ? `0${d1}` : `${d1}`;
    const dd2 = d2 < 10 ? `0${d2}` : `${d2}`;
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
};

const stripHtml = (html: string): string => {
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || html.match(/<div[^>]*id="[^"]*regionMain[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  let text = mainMatch ? mainMatch[1] : html;
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gmi, '');
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gmi, '');
  text = text.replace(/<(br|p|div|li|h[1-6])[^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return text;
};

const parseMonthTextRobust = (text: string, ano: number): WeekProgram[] | null => {
  const normalized = text
    .replace(/\u00A0/g, ' ')
    .replace(/[\s\t\r\f]+/g, ' ')
    .replace(/\s*\((\d{1,2})\s*min\.?\)/gi, ' ($1 min)');
  const periodRegexPt = /(\d{1,2}\s*(?:[–—-]|\s+a\s+)\s*\d{1,2}\s*de\s*[A-Za-zÀ-ÿ]+)/gi;
  const periodCrossPt = /(\d{1,2}(?:\s*(?:\.º|º|°))?\s*de\s*[A-Za-zÀ-ÿ.]+\s*(?:[–—-]|\s+a\s+)\s*\d{1,2}(?:\s*(?:\.º|º|°))?\s*de\s*[A-Za-zÀ-ÿ.]+(?:\s*de\s*(?:20)?\d{2})?)/gi;
  const periodRegexEn = /([A-Za-z]+\s+\d{1,2}\s*[–—-]\s*\d{1,2},?\s*\d{4})/gi;
  const matches: Array<{ start: number; end: number; periodo: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = periodRegexPt.exec(normalized)) !== null) matches.push({ start: m.index, end: m.index + m[0].length, periodo: m[1] });
  while ((m = periodCrossPt.exec(normalized)) !== null) matches.push({ start: m.index, end: m.index + m[0].length, periodo: m[1] });
  while ((m = periodRegexEn.exec(normalized)) !== null) matches.push({ start: m.index, end: m.index + m[0].length, periodo: m[1] });
  if (matches.length === 0) return null;
  matches.sort((a, b) => a.start - b.start);
  const weeks: WeekProgram[] = [];
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const nextStart = matches[i + 1]?.start ?? normalized.length;
    const windowTxt = normalized.slice(cur.start, nextStart);
    const { dataInicio, dataFim } = parsePeriodo(cur.periodo, ano);
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
    let secao: Secao = 'tesouros';
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
      let tipo: TipoParte = 'discurso';
      if (/leitura/i.test(titulo) || /bible\s+reading/i.test(titulo)) tipo = 'leitura';
      else if (/joias/i.test(titulo) || /spiritual\s+gems/i.test(titulo)) tipo = 'perguntas_respostas';
      else if (/estudo\s+b[ií]blico\s+de\s+congrega[cç][aã]o/i.test(titulo) || /congregation\s+bible\s+study/i.test(titulo)) tipo = 'estudo_congregacao';
      else if (/necessidades/i.test(titulo) || /local\s+needs/i.test(titulo)) tipo = 'consideracao_anciao';
      const around = windowTxt.slice(Math.max(0, (pm.index || 0) - 200), Math.min(windowTxt.length, (pm.index || 0) + 200));
      if (/apply\s+yourself|minist[ée]rio/i.test(around)) secao = 'ministerio';
      else if (/vida\s+crist[ãa]|our\s+christian\s+life/i.test(around)) secao = 'vida_crista';
      partes.push({ numero: partes.length + 1, titulo, duracao: dur, secao, tipo, sala: secao === 'ministerio' ? 'Ambas' : undefined });
    }
    const [y1, m1, d1] = dataInicio.split('-').map(x => parseInt(x, 10));
    const [y2, m2, d2] = dataFim.split('-').map(x => parseInt(x, 10));
    const mesesFull = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const sameMonth = (y1 === y2) && (m1 === m2);
    const periodoFmt = sameMonth
      ? `${d1}-${d2} de ${mesesFull[m1 - 1]} de ${y1}`
      : `${d1} de ${mesesFull[m1 - 1]}–${d2} de ${mesesFull[m2 - 1]} de ${y2}`;
    weeks.push({ periodo: periodoFmt, dataInicio, dataFim, leituraBiblica: leitura, canticos, partes });
  }
  return weeks;
};

const parseWeeklyHtml = (html: string): WeekProgram | null => {
  const periodoRegex = /(\d{1,2}(?:\s*[-–—]\s*\d{1,2})?\s+de\s+[A-Za-zÀ-ÿ]+(?:\s+de\s+[0-9]{4})?)/i;
  let periodo = '';
  const titleTag = html.match(/<title>([\s\S]*?)<\/title>/i);
  const h1Tag = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const candidateText = (titleTag ? titleTag[1] : '') + ' ' + (h1Tag ? h1Tag[1] : '');
  const mPeriodo = candidateText.match(periodoRegex);
  if (mPeriodo) periodo = mPeriodo[1].trim();
  else {
    const mBody = html.match(new RegExp(`Programa[çc][ãa]o.*?${periodoRegex.source}`, 'i'));
    if (mBody) periodo = mBody[1].trim();
  }
  if (!periodo) periodo = "Semana a definir (Importado)";
  let anoFallback = new Date().getFullYear();
  const mYear = periodo.match(/\d{4}/) || html.match(/(?:20)\d{2}/);
  if (mYear) anoFallback = parseInt(mYear[0], 10);
  const { dataInicio, dataFim } = parsePeriodo(periodo, anoFallback);
  const formatPeriodoFromDates = (di: string, df: string): string => {
    const [y1, m1, d1] = di.split('-').map(x => parseInt(x, 10));
    const [y2, m2, d2] = df.split('-').map(x => parseInt(x, 10));
    const mesesFull = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    if (y1 === y2 && m1 === m2) {
      return `${d1}-${d2} de ${mesesFull[m1 - 1]} de ${y1}`;
    }
    return `${d1} de ${mesesFull[m1 - 1]}–${d2} de ${mesesFull[m2 - 1]} de ${y2}`;
  };
  const periodoNormalized = formatPeriodoFromDates(dataInicio, dataFim);
  const canticosRegex = /(?:C[âa]ntico|Song)\s+(\d{1,3})/gi;
  const canticosFound: number[] = [];
  let cm;
  const mainContent = html.match(/<main[\s\S]*?<\/main>/i)?.[0] || html;
  while ((cm = canticosRegex.exec(mainContent)) !== null) {
    canticosFound.push(parseInt(cm[1], 10));
  }
  const uniqueCanticos = [...new Set(canticosFound)];
  const canticos = { inicial: uniqueCanticos[0] || null, meio: uniqueCanticos[1] || null, final: uniqueCanticos[2] || null };
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
  const partes: ParteProgramaVM[] = [];
  const findSectionIndex = (text: string, patterns: RegExp[]) => {
    for (const p of patterns) {
      const idx = text.search(p);
      if (idx !== -1) return idx;
    }
    return -1;
  };
  const idxTesouros = findSectionIndex(mainContent, [/TESOUROS\s+DA\s+PALAVRA/i, /TREASURES\s+FROM/i]);
  const idxMinisterio = findSectionIndex(mainContent, [/FA[ÇC]A\s+SEU\s+MELHOR\s+NO\s+MINIST[ÉE]RIO/i, /APPLY\s+YOURSELF/i, /MINIST[ÉE]RIO/i]);
  const idxVida = findSectionIndex(mainContent, [/NOSSA\s+VIDA\s+CRIST[ÃA]/i, /OUR\s+CHRISTIAN\s+LIFE/i, /VIDA\s+CRIST[ÃA]/i]);
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
      let tipo: TipoParte = 'discurso';
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
        secao: (sec.name as Secao),
        tipo,
        sala: sec.name === 'ministerio' ? 'Ambas' : undefined,
        material,
        cenario,
        descricao
      });
    }
  });
  return { periodo: periodoNormalized, dataInicio, dataFim, leituraBiblica, canticos, partes };
};

const importarProgramaSemanalUrl = async (targetUrl: string): Promise<WeekProgram | null> => {
  let html = '';
  try {
    const res = await fetch(targetUrl);
    html = await res.text();
  } catch {
    return null;
  }
  if (!html) return null;
  const week = parseWeeklyHtml(html);
  if (week) return week;
  const text = stripHtml(html);
  let ano = new Date().getFullYear();
  const ym = targetUrl.match(/(20\d{2})/);
  if (ym) ano = parseInt(ym[1], 10);
  const weeks = parseMonthTextRobust(text, ano);
  return (weeks && weeks.length > 0) ? weeks[0] : null;
};

const importarSemanasDaEdicao = async (editionUrl: string, yearHint?: number): Promise<WeekProgram[] | null> => {
  try {
    const htmlRes = await fetch(editionUrl);
    const html = await htmlRes.text();
    if (!html || !html.trim()) return null;
    const weekLinks = extractWeeklyLinksFromEdition(html, editionUrl);
    const txt = stripHtml(html);
    const ano = yearHint ?? (parseInt((editionUrl.match(/(20\d{2})/)?.[1] || `${new Date().getFullYear()}`), 10));
    const weeksFromMonth = parseMonthTextRobust(txt, ano) || [];
    const results: WeekProgram[] = [];
    if (weekLinks && weekLinks.length > 0) {
      for (const wl of weekLinks) {
        try {
          const w = await importarProgramaSemanalUrl(wl);
          if (w) results.push(w);
        } catch { /* ignore */ }
      }
    }
    // Merge com semanas do texto do mês (inclui semanas cruzando meses que podem não ter link)
    const existingStarts = new Set(results.map(w => w.dataInicio));
    for (const w of weeksFromMonth) {
      if (!existingStarts.has(w.dataInicio)) {
        results.push(w);
      }
    }
    if (results.length === 0) return null;
    results.sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
    return results;
  } catch {
    return null;
  }
};

const extractEditionPdfUrl = (html: string, base: string): string | null => {
  const rx = /href="([^"]+\.pdf)"/gi;
  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html)) !== null) {
    const href = m[1];
    if (/mwb|apostila|vida.*minist/i.test(href)) {
      try { candidates.push(new URL(href, base).toString()); } catch { /* ignore */ }
    }
  }
  return candidates[0] || null;
};

const upsertWeeksToSupabase = async (issueKey: string, language: string, weeks: WeekProgram[]): Promise<{ ok: boolean; error?: unknown }> => {
  if (!weeks || weeks.length === 0) return { ok: false, error: 'no_weeks' };
  const rows = weeks.map(w => ({
    issue_key: issueKey,
    language,
    week_date: w.dataInicio,
    content: w
  }));
  const { error } = await supabase
    .from('mwb_weeks')
    .upsert(rows, { onConflict: 'issue_key,week_date,language' });
  if (error) {
    console.error('upsert mwb_weeks error', error);
    return { ok: false, error };
  }
  return { ok: true };
};

const deleteIssueWeeks = async (issueKey: string, language?: string): Promise<{ ok: boolean; count?: number; error?: unknown }> => {
  let q = supabase.from('mwb_weeks').delete().eq('issue_key', issueKey);
  if (language && language.trim()) q = q.eq('language', language);
  const { error, count } = await q.select('*', { count: 'exact' });
  if (error) return { ok: false, error };
  return { ok: true, count: count ?? 0 };
};

const uploadEditionPdfToSupabase = async (issueKey: string, editionUrl: string) => {
  const htmlRes = await fetch(editionUrl);
  const html = await htmlRes.text();
  const pdfUrl = extractEditionPdfUrl(html, editionUrl);
  if (!pdfUrl) return;
  try {
    const res = await fetch(pdfUrl);
    const buf = await res.arrayBuffer();
    const file = new Blob([buf], { type: 'application/pdf' });
    await supabase.storage.from('mwb_pdfs').upload(`${issueKey}.pdf`, file, { upsert: true, contentType: 'application/pdf' });
  } catch (e) {
    console.error('uploadEditionPdfToSupabase failed', e);
  }
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const ingestIssue = async (year: number, monthStart: number) => {
  const issueKey = `${year}-${String(monthStart).padStart(2, '0')}`;
  const editionUrl = buildEditionUrl(year, monthStart);
  const weeks = await importarSemanasDaEdicao(editionUrl, year) || [];
  let count = 0;
  if (weeks.length > 0) {
    const ok = await upsertWeeksToSupabase(issueKey, 'pt-BR', weeks);
    if (ok.ok) count = weeks.length;
    await uploadEditionPdfToSupabase(issueKey, editionUrl);
  }
  return { issueKey, weeks: count };
};

const backfillRange = async (startYear: number, endYear: number) => {
  const results: Array<{ issueKey: string; weeks: number }> = [];
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m += 2) {
      const { issueKey, weeks } = await ingestIssue(y, m);
      results.push({ issueKey, weeks });
      await sleep(300);
    }
  }
  const totalWeeks = results.reduce((acc, r) => acc + r.weeks, 0);
  return { totalWeeks, issues: results };
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'POST') {
      const body = await req.json().catch(() => null) as { action?: string; issueKey?: string; language?: string; weeks?: WeekProgram[] } | null;
      if (!body || !body.issueKey) {
        return new Response(JSON.stringify({ status: 'error', message: 'invalid payload' }), { headers: { 'content-type': 'application/json' }, status: 400 });
      }
      const action = body.action ?? 'upsert';
      const lang = body.language ?? 'pt-BR';
      if (action === 'delete_issue') {
        const del = await deleteIssueWeeks(body.issueKey, lang);
        return new Response(JSON.stringify({ status: del.ok ? 'ok' : 'error', issueKey: body.issueKey, deleted: del.count ?? 0, error: del.error ?? null }), { headers: { 'content-type': 'application/json' }, status: del.ok ? 200 : 500 });
      }
      if (!Array.isArray(body.weeks) || body.weeks.length === 0) {
        return new Response(JSON.stringify({ status: 'error', message: 'weeks_required' }), { headers: { 'content-type': 'application/json' }, status: 400 });
      }
      const res = await upsertWeeksToSupabase(body.issueKey, lang, body.weeks);
      return new Response(JSON.stringify({ status: res.ok ? 'ok' : 'error', issueKey: body.issueKey, weeks: res.ok ? body.weeks.length : 0, error: res.error ?? null }), { headers: { 'content-type': 'application/json' }, status: res.ok ? 200 : 500 });
    }
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') ?? 'single';
    const now = new Date();
    if (mode === 'backfill') {
      const startYear = parseInt(url.searchParams.get('start_year') ?? `${now.getFullYear() - 6}`, 10);
      const endYear = parseInt(url.searchParams.get('end_year') ?? `${now.getFullYear()}`, 10);
      const summary = await backfillRange(startYear, endYear);
      return new Response(JSON.stringify({ status: 'ok', mode, startYear, endYear, totalWeeks: summary.totalWeeks, issues: summary.issues }), { headers: { 'content-type': 'application/json' } });
    } else if (mode === 'next') {
      const curOdd = bimestreInicio(now.getMonth() + 1);
      let nextOdd = curOdd + 2;
      let year = now.getFullYear();
      if (nextOdd > 12) { nextOdd = 1; year += 1; }
      const res = await ingestIssue(year, nextOdd);
      return new Response(JSON.stringify({ status: 'ok', mode, ...res }), { headers: { 'content-type': 'application/json' } });
    } else if (mode === 'pair') {
      const curOdd = bimestreInicio(now.getMonth() + 1);
      const yearCur = now.getFullYear();
      let nextOdd = curOdd + 2;
      let yearNext = yearCur;
      if (nextOdd > 12) { nextOdd = 1; yearNext += 1; }
      const r1 = await ingestIssue(yearCur, curOdd);
      const r2 = await ingestIssue(yearNext, nextOdd);
      return new Response(JSON.stringify({ status: 'ok', mode, current: r1, next: r2 }), { headers: { 'content-type': 'application/json' } });
    } else {
      const year = parseInt(url.searchParams.get('year') ?? `${now.getFullYear()}`, 10);
      const monthStartParam = url.searchParams.get('month_start');
      const monthStart = monthStartParam ? parseInt(monthStartParam, 10) : bimestreInicio(now.getMonth() + 1);
      const res = await ingestIssue(year, monthStart);
      return new Response(JSON.stringify({ status: 'ok', mode, ...res }), { headers: { 'content-type': 'application/json' } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ status: 'error', message: String(e) }), { headers: { 'content-type': 'application/json' }, status: 500 });
  }
});
