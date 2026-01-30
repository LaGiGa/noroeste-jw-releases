import { createClient } from '@supabase/supabase-js';
// Importar direto do jw.org (sem PDF), replicando a lógica do Edge Function
const buildEditionUrl = (ano, mesInicioImpar) => {
  const mesesSlug = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const m1 = mesInicioImpar;
  const m2 = mesInicioImpar + 1;
  const slug = `${mesesSlug[m1 - 1]}-${mesesSlug[m2 - 1]}-${ano}-mwb`;
  return `https://www.jw.org/pt/biblioteca/jw-apostila-do-mes/${slug}/`;
};

const parsePeriodo = (periodo, anoFallback) => {
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

const stripHtml = (html) => {
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || html.match(/<div[^>]*id="[^"]*regionMain[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  let text = mainMatch ? mainMatch[1] : html;
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gmi, '');
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gmi, '');
  text = text.replace(/<(br|p|div|li|h[1-6])[^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return text;
};

const parseMonthTextRobust = (text, ano) => {
  const normalized = text
    .replace(/\u00A0/g, ' ')
    .replace(/[\s\t\r\f]+/g, ' ')
    .replace(/\s*\((\d{1,2})\s*min\.?\)/gi, ' ($1 min)');
  const periodRegexPt = /(\d{1,2}\s*[–—-]\s*\d{1,2}\s*de\s*[A-Za-zÀ-ÿ]+)/gi;
  const periodRegexEn = /([A-Za-z]+\s+\d{1,2}\s*[–—-]\s*\d{1,2},?\s*\d{4})/gi;
  const matches = [];
  let m;
  while ((m = periodRegexPt.exec(normalized)) !== null) matches.push({ start: m.index, end: m.index + m[0].length, periodo: m[1] });
  while ((m = periodRegexEn.exec(normalized)) !== null) matches.push({ start: m.index, end: m.index + m[0].length, periodo: m[1] });
  if (matches.length === 0) return [];
  matches.sort((a, b) => a.start - b.start);
  const weeks = [];
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const nextStart = matches[i + 1]?.start ?? normalized.length;
    const windowTxt = normalized.slice(cur.start, nextStart);
    const { dataInicio, dataFim } = parsePeriodo(cur.periodo, ano);
    let leitura = '';
    const p2Match = (windowTxt.match(/Leitura\s+da\s+B[ií]blia[^:：]*[:：]\s*(.+)$/i));
    if (p2Match) {
      const m2 = p2Match[1].match(/\b[A-ZÁÀÂÃÉÈÊÍÌÓÒÔÕÚÙÇ][A-Za-zÁÀÂÃÉÈÊÍÌÓÒÔÕÚÙÇ]+\b\s+\d+(?::\d+)?(?:\s*[–—-]\s*\d+(?::\d+)?)?(?:,\s*\d+)?/i);
      if (m2) leitura = m2[0].trim().replace(/-/g, '–').replace(/\s+/g,' ');
    } else {
      const m2 = windowTxt.match(/\b[A-ZÁÀÂÃÉÈÊÍÌÓÒÔÕÚÙÇ][A-Za-zÁÀÂÃÉÈÊÍÌÓÒÔÕÚÙÇ]+\b\s+\d+(?::\d+)?(?:\s*[–—-]\s*\d+(?::\d+)?)?(?:,\s*\d+)?/i);
      if (m2) leitura = m2[0].trim().replace(/-/g, '–').replace(/\s+/g,' ');
    }
    const cantoNums = [];
    const cantoRegex = /(C[âa]ntico[s]?|Song)\s*:?\s*(\d{1,3})/gi;
    let cm;
    while ((cm = cantoRegex.exec(windowTxt)) !== null) {
      const n = parseInt(cm[2], 10);
      if (!Number.isNaN(n)) cantoNums.push(n);
    }
    const canticos = { inicial: cantoNums[0] ?? null, meio: cantoNums[1] ?? null, final: cantoNums[2] ?? null };
    const partes = [];
    const partRegex = /(\d+\.?\s*)?([^()]{3,}?)\s*(?:\((\d{1,2})\s*(?:min\.?|minutos?)\)|[–—-]?\s*(\d{1,2})\s*(?:min\.?|minutos?))/gi;
    let pm;
    let secao = 'tesouros';
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
      let tipo = 'discurso';
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
};

const extractWeeklyLinksFromEdition = (html, base) => {
  const links = [];
  const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
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

const parseWeeklyHtml = (html) => {
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
  const formatPeriodoFromDates = (di, df) => {
    const sd = new Date(di);
    const ed = new Date(df);
    const mesesFull = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const sameMonth = sd.getMonth() === ed.getMonth() && sd.getFullYear() === ed.getFullYear();
    const d1 = sd.getDate();
    const d2 = ed.getDate();
    const anoEnd = ed.getFullYear();
    return sameMonth
      ? `${d1}-${d2} de ${mesesFull[sd.getMonth()]} de ${sd.getFullYear()}`
      : `${d1} de ${mesesFull[sd.getMonth()]}–${d2} de ${mesesFull[ed.getMonth()]} de ${anoEnd}`;
  };
  const periodoNormalized = formatPeriodoFromDates(dataInicio, dataFim);
  const canticosRegex = /(?:C[âa]ntico|Song)\s+(\d{1,3})/gi;
  const canticosFound = [];
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
  const partes = [];
  const findSectionIndex = (text, patterns) => {
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
    const found = [];
    let m;
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
      let tipo = 'discurso';
      let material;
      let cenario;
      if (sec.name === 'tesouros') {
        if (/leitura/i.test(titulo) || /bible\s+reading/i.test(titulo)) tipo = 'leitura';
        else if (/joias/i.test(titulo) || /gems/i.test(titulo)) tipo = 'perguntas_respostas';
      } else if (sec.name === 'ministerio') {
        tipo = 'demonstracao';
        const scen = postText.match(/\b(DE CASA EM CASA|TESTEMUNHO INFORMAL|TESTEMUNHO PÚBLICO|CONVERSA INFORMAL|HOUSE\s+TO\s+HOUSE|INFORMAL\s+WITNESSING|PUBLIC\s+WITNESSING)\b/i);
        if (scen) cenario = scen[1].toUpperCase();
        const matPar = postText.match(/\(([^)]*?\b(?:lmd|th|ap[êe]ndice|cap\.?|lfb)[^)]*?)\)/i);
        if (matPar) material = matPar[1].trim();
      } else if (sec.name === 'vida_crista') {
        if (/estudo/i.test(titulo) && /congrega/i.test(titulo)) tipo = 'estudo_congregacao';
        else if (/necessidades/i.test(titulo)) tipo = 'consideracao_anciao';
      }
      partes.push({
        numero: partes.length + 1,
        titulo,
        duracao: cur.duracao,
        secao: sec.name,
        tipo,
        sala: sec.name === 'ministerio' ? 'Ambas' : undefined,
        material,
        cenario
      });
    }
  });
  return { periodo: periodoNormalized, dataInicio, dataFim, leituraBiblica, canticos, partes };
};

const importarProgramaSemanalUrl = async (targetUrl) => {
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

async function main() {
  let SUPABASE_URL = process.env.PROJECT_URL;
  let SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    try {
      const fs = await import('node:fs');
      const envText = fs.readFileSync('.env', 'utf-8');
      const lines = envText.split(/\r?\n/).filter(Boolean);
      const map = new Map(lines.map(l => {
        const idx = l.indexOf('=');
        if (idx === -1) return [l.trim(), ''];
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      }));
      SUPABASE_URL = SUPABASE_URL || map.get('VITE_SUPABASE_URL');
      SERVICE_ROLE_KEY = SERVICE_ROLE_KEY || map.get('VITE_SUPABASE_ANON_KEY');
    } catch {
      // ignore
    }
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Set PROJECT_URL and SERVICE_ROLE_KEY env vars or provide VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY in .env');
    process.exit(2);
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const targetIssue = process.env.ISSUE_KEY || null;
  const weekUrlsEnv = process.env.WEEK_URLS || '';
  const weekUrls = weekUrlsEnv.split(',').map(s => s.trim()).filter(s => s.length > 0);
  if (targetIssue && weekUrls.length > 0) {
    let weeks = [];
    for (const wl of weekUrls) {
      try {
        const w = await importarProgramaSemanalUrl(wl);
        if (w) weeks.push(w);
      } catch { /* ignore */ }
    }
    const uniq = new Map();
    for (const w of weeks) if (!uniq.has(w.dataInicio)) uniq.set(w.dataInicio, w);
    weeks = Array.from(uniq.values());
    if (weeks.length === 0) {
      console.error('Nenhuma semana válida foi extraída dos WEEK_URLS');
      process.exit(1);
    }
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/mwb_ingest`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ issueKey: targetIssue, language: 'pt-BR', weeks })
      });
      const txt = await resp.text();
      console.log('Function upsert response:', txt);
    } catch (e) {
      console.error('Function upsert failed:', e);
      process.exit(1);
    }
    return;
  }
  const issues = ['2026-03'];
  for (const issue of issues) {
    const [yearStr, monthStr] = issue.split('-');
    const year = parseInt(yearStr, 10);
    const monthStart = parseInt(monthStr, 10);
    const editionUrl = buildEditionUrl(year, monthStart);
    console.log(`Buscando edição em ${editionUrl}`);
    let weeks = [];
    try {
      const res = await fetch(editionUrl);
      const html = await res.text();
      const weekLinks = extractWeeklyLinksFromEdition(html, editionUrl);
      const txt = stripHtml(html);
      const weeksFromMonth = parseMonthTextRobust(txt, year);
      if (weekLinks && weekLinks.length > 0) {
        for (const wl of weekLinks) {
          try {
            const w = await importarProgramaSemanalUrl(wl);
            if (w) weeks.push(w);
          } catch { /* ignore */ }
        }
      }
      const starts = new Set(weeks.map(w => w.dataInicio));
      for (const w of weeksFromMonth) {
        if (!starts.has(w.dataInicio)) weeks.push(w);
      }
    } catch (e) {
      console.error('Falha ao buscar/parsing edição:', e);
      continue;
    }
    // Deduplicar por dataInicio
    const mapByStart = new Map();
    for (const w of weeks) {
      if (!mapByStart.has(w.dataInicio)) mapByStart.set(w.dataInicio, w);
    }
    weeks = Array.from(mapByStart.values());
    console.log(`Encontradas ${weeks.length} semanas para ${issue}`);
    if (weeks.length === 0) continue;
    const rows = weeks.map(w => ({
      issue_key: issue,
      language: 'pt-BR',
      week_date: w.dataInicio,
      content: w
    }));
    // Limpar existentes para evitar conflitos de batch
    try { await supabase.from('mwb_weeks').delete().eq('issue_key', issue).eq('language', 'pt-BR'); } catch {}
    const { error } = await supabase.from('mwb_weeks').upsert(rows, { onConflict: 'week_date,language' });
    if (error) {
      console.error('Upsert error:', error);
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/mwb_ingest`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ issueKey: issue, language: 'pt-BR', weeks })
        });
        const txt = await resp.text();
        console.log('Function upsert response:', txt);
      } catch (e) {
        console.error('Function upsert failed:', e);
      }
    } else {
      console.log(`Upserted ${rows.length} rows for ${issue}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
