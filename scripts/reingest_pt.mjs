import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

// Carregar variáveis de ambiente
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) process.env[k] = envConfig[k];
}

// --- Funções de Parsing (Adaptadas de ingest_from_storage.mjs) ---

const parsePeriodo = (periodo, anoFallback) => {
  // Regex para PT complexo: "23 de fevereiro–1.º de março" ou "29 de dezembro de 2025–4 de janeiro de 2026"
  const mFull = periodo.match(/(\d{1,2})(?:[\.\sº°]+)?\s*de\s*([A-Za-zÀ-ÿ]+)(?:\s*de\s*(\d{4}))?\s*(?:[–—-]|\s+a\s+)\s*(\d{1,2})(?:[\.\sº°]+)?\s*de\s*([A-Za-zÀ-ÿ]+)(?:\s*de\s*(\d{4}))?/i);
  
  const mesesFull = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const mesesAbbr = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  if (mFull) {
    const d1 = parseInt(mFull[1], 10);
    const m1Name = mFull[2].toLowerCase().replace(/\./g, '');
    const y1 = mFull[3] ? parseInt(mFull[3], 10) : null;
    
    const d2 = parseInt(mFull[4], 10);
    const m2Name = mFull[5].toLowerCase().replace(/\./g, '');
    const y2 = mFull[6] ? parseInt(mFull[6], 10) : anoFallback;
    
    const finalYear = y2 || anoFallback;
    const startYear = y1 || finalYear;
    
    let idx1 = mesesFull.indexOf(m1Name);
    if (idx1 === -1) idx1 = mesesAbbr.indexOf(m1Name);
    idx1 += 1;

    let idx2 = mesesFull.indexOf(m2Name);
    if (idx2 === -1) idx2 = mesesAbbr.indexOf(m2Name);
    idx2 += 1;
    
    // Fallback logic for cross-year
    let realStartYear = startYear;
    let realEndYear = finalYear;
    
    if (!y1 && !y2) {
        if (idx1 > idx2) {
            // Dec -> Jan (using fallback year)
             realEndYear = realStartYear + 1;
        }
    } else if (!y1 && y2) {
         if (idx1 > idx2) {
             realStartYear = realEndYear - 1;
         }
    }

    const mm1 = idx1 < 10 ? `0${idx1}` : `${idx1}`;
    const mm2 = idx2 < 10 ? `0${idx2}` : `${idx2}`;
    const dd1 = d1 < 10 ? `0${d1}` : `${d1}`;
    const dd2 = d2 < 10 ? `0${d2}` : `${d2}`;
    
    return { dataInicio: `${realStartYear}-${mm1}-${dd1}`, dataFim: `${realEndYear}-${mm2}-${dd2}` };
  }
  
  // Regex simples para mesmo mês: "2-8 de fevereiro" or "2-8 de fevereiro de 2026"
  const mPT = periodo.match(/(\d{1,2})(?:[\.\sº°]+)?\s*(?:-|a)\s*(\d{1,2})(?:[\.\sº°]+)?\s*de\s*([A-Za-zÀ-ÿ.]+)/i);
  if (mPT) {
    const d1 = parseInt(mPT[1], 10);
    const d2 = parseInt(mPT[2], 10);
    const mesNome = mPT[3].toLowerCase().replace(/\./g, '');
    
    let mi = mesesFull.indexOf(mesNome);
    if (mi === -1) mi = mesesAbbr.indexOf(mesNome);
    mi += 1;
    
    const mm = mi < 10 ? `0${mi}` : `${mi}`;
    const dd1 = d1 < 10 ? `0${d1}` : `${d1}`;
    const dd2 = d2 < 10 ? `0${d2}` : `${d2}`;
    
    return { dataInicio: `${anoFallback}-${mm}-${dd1}`, dataFim: `${anoFallback}-${mm}-${dd2}` };
  }
  
  return { dataInicio: `${anoFallback}-01-01`, dataFim: `${anoFallback}-01-01` };
};

const parseWeeklyHtml = (html) => {
    // Tenta encontrar o período no título ou h1
    // Regex ajustado para incluir anos no meio e ordinais (1.º)
    const periodoRegex = /(\d{1,2}(?:[\.\sº°]+)?(?:\s*[-–—]\s*\d{1,2}(?:[\.\sº°]+)?)?\s+de\s+[A-Za-zÀ-ÿ]+(?:\s+de\s+\d{4})?(?:\s*(?:[–—-]|\s+a\s+)\s*\d{1,2}(?:[\.\sº°]+)?\s+de\s+[A-Za-zÀ-ÿ]+)?(?:\s+de\s+[0-9]{4})?)/i;
    let periodo = '';
    const titleTag = html.match(/<title>([\s\S]*?)<\/title>/i);
    const h1Tag = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const candidateText = (titleTag ? titleTag[1] : '') + ' ' + (h1Tag ? h1Tag[1] : '');
    
    const mPeriodo = candidateText.match(periodoRegex);
    if (mPeriodo) periodo = mPeriodo[1].trim();

    // Special case for Memorial 2026
    if (candidateText.includes('Celebração de 2026') || candidateText.includes('Celebration of 2026')) {
        return {
            periodo: '30 de março–5 de abril de 2026',
            dataInicio: '2026-03-30',
            dataFim: '2026-04-05',
            leituraBiblica: 'Leitura da Bíblia para a Celebração',
            canticos: { inicial: null, meio: null, final: null },
            partes: []
        };
    }
    
    // Fallback para ano atual se não encontrar no texto
    let anoFallback = new Date().getFullYear();
    const mYear = periodo.match(/\d{4}/) || html.match(/(?:20)\d{2}/);
    if (mYear) anoFallback = parseInt(mYear[0], 10);
    
    // Parse das datas
    const { dataInicio, dataFim } = parsePeriodo(periodo, anoFallback);
    
    // Normalizar período para exibição
    const formatPeriodoFromDates = (di, df) => {
        const sd = new Date(di);
        const ed = new Date(df);
        const mesesFull = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
        
        // Ajuste para timezone local (simples)
        // sd.setMinutes(sd.getMinutes() + sd.getTimezoneOffset());
        // ed.setMinutes(ed.getMinutes() + ed.getTimezoneOffset());
        // Melhor usar UTC getters e setters ou split string
        const [y1, m1, d1] = di.split('-').map(Number);
        const [y2, m2, d2] = df.split('-').map(Number);
        
        const sameMonth = m1 === m2 && y1 === y2;
        
        return sameMonth
          ? `${d1}-${d2} de ${mesesFull[m1-1]} de ${y1}`
          : `${d1} de ${mesesFull[m1-1]}–${d2} de ${mesesFull[m2-1]} de ${y2}`;
    };
    const periodoNormalized = formatPeriodoFromDates(dataInicio, dataFim);
    
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const mainContent = doc.querySelector('main') || doc.body;
    const textContent = mainContent.textContent;
    
    // Cânticos
    const canticosRegex = /(?:C[âa]ntico|Song)\s+(\d{1,3})/gi;
    const canticosFound = [];
    let cm;
    while ((cm = canticosRegex.exec(textContent)) !== null) {
        canticosFound.push(parseInt(cm[1], 10));
    }
    const uniqueCanticos = [...new Set(canticosFound)];
    const canticos = { 
        inicial: uniqueCanticos[0] || null, 
        meio: uniqueCanticos[1] || null, 
        final: uniqueCanticos[2] || null 
    };
    
    // Leitura Bíblica
    let leituraBiblica = '';
    const p2Element = doc.querySelector('#p2') || doc.querySelector('[data-pid="2"]');
    if (p2Element) {
        const p2Text = p2Element.textContent.replace(/\s+/g, ' ').trim();
        // Regex simplificado para extrair referência
        const match = p2Text.match(/Leitura\s+da\s+B[ií]blia[^:：]*[:：]\s*(.+)$/i) || p2Text.match(/\b([1-3]?\s*[A-ZÀ-ÿ]+\s+\d+.*)/i);
        if (match) {
            leituraBiblica = match[1].trim();
        }
    }
    
    // Partes
    const partes = [];
    
    // Estratégia baseada em seções H2/H3
    const sections = [
        { id: 'tesouros', pattern: /TESOUROS|TREASURES/i },
        { id: 'ministerio', pattern: /MINIST[ÉE]RIO|APPLY/i },
        { id: 'vida_crista', pattern: /VIDA\s+CRIST[ÃA]|CHRISTIAN\s+LIFE/i }
    ];
    
    let currentSection = 'tesouros';
    
    // Select main container to avoid sidebar noise
    const docContent = doc.querySelector('.docSubContent') || doc.querySelector('#p1') || doc.querySelector('main') || doc.body;
    
    // We will iterate through children to track sections and parts
    // Get all relevant headers and paragraphs/divs in order
    const allElements = docContent.querySelectorAll('h2, h3, div, p');
    
    allElements.forEach(el => {
        const text = el.textContent.trim().replace(/\s+/g, ' ');
        
        // Detectar mudança de seção (check length to avoid matching long paragraphs)
        if (text.length < 50) {
            if (sections[1].pattern.test(text)) currentSection = 'ministerio';
            else if (sections[2].pattern.test(text)) currentSection = 'vida_crista';
        }
        
        // Detectar partes: H3 starting with number
        // Structure is often: <h3>1. Title</h3> <p>(10 min) ...</p>
        if (el.tagName === 'H3' && /^\d+\./.test(text)) {
            // Found a numbered part title
            const titleMatch = text.match(/^(\d+\.)\s+(.+)/);
            if (titleMatch) {
                const numero = partes.length + 1; // Or parse from titleMatch[1]
                const titulo = titleMatch[2].trim();
                let duracao = 0;
                
                // Look for duration and description in next sibling (p or div)
                let next = el.nextElementSibling;
                let descricao = undefined;

                // Skip empty text nodes or irrelevant elements if needed, but usually it's immediate
                if (next) {
                    const nextText = next.textContent.trim().replace(/\s+/g, ' ');
                    const durMatch = nextText.match(/\((\d{1,2})\s*min\)/);
                    if (durMatch) {
                        duracao = parseInt(durMatch[1], 10);
                        
                        // Extract description and other metadata from the text following duration
                        // Example: "(4 min) TESTEMUNHO INFORMAL. A pessoa diz que... (lmd lição 2 ponto 5)"
                        let textContent = nextText.replace(durMatch[0], '').trim();
                        
                        // Extract material (usually at the end in parentheses)
                        // Look for (th ...) or (lmd ...) or generic parens at end
                        const matMatch = textContent.match(/\(([^)]*)\)$/);
                        if (matMatch) {
                             // If we haven't set material yet, use this
                             // But wait, let's keep it separate for now
                             // Actually, let's prioritize extraction from here
                        }

                        // Check for Scenario/Setting keywords
                        if (/TESTEMUNHO INFORMAL|INFORMAL WITNESSING/i.test(textContent)) {
                             // cenario = 'INFORMAL'; // If using enum
                        } else if (/CASA EM CASA|HOUSE TO HOUSE/i.test(textContent)) {
                             // cenario = 'HOUSE_TO_HOUSE';
                        }
                        
                        // The whole text (minus duration) is valuable description
                        descricao = textContent;
                    }
                }
                
                // If duration found or strictly required? Usually yes.
                // Fallback: check if duration is inside the H3 itself (old format)
                if (duracao === 0) {
                    const selfDur = text.match(/\((\d{1,2})\s*min\)/);
                    if (selfDur) duracao = parseInt(selfDur[1], 10);
                }

                if (duracao > 0) {
                     let tipo = 'discurso';
                    let material = undefined;
                    let cenario = undefined;
                    
                    // Classificar tipo
                    if (currentSection === 'tesouros') {
                        if (/leitura/i.test(titulo)) tipo = 'leitura';
                        else if (/joias/i.test(titulo)) tipo = 'perguntas_respostas';
                    } else if (currentSection === 'ministerio') {
                        tipo = 'demonstracao';
                        if (/casa\s+em\s+casa/i.test(text) || /casa\s+em\s+casa/i.test(titulo) || (descricao && /casa\s+em\s+casa/i.test(descricao))) {
                            cenario = 'Casa em Casa';
                            // Remove redundant scenario text from description (English or Portuguese)
                            if (descricao) {
                                descricao = descricao.replace(/^(De\s+)?Casa\s+em\s+Casa[\.\s]*|HOUSE\s+TO\s+HOUSE[\.\s]*/i, '').trim();
                            }
                        }
                        
                        // Tentar extrair material dos parênteses do título ou descrição
                        // Priority 1: From description (lmd/th references)
                        if (descricao) {
                            const descMatMatch = descricao.match(/\((lmd|th|lfb)[^)]*\)/i) || descricao.match(/\(([^)]*)\)$/);
                            if (descMatMatch) {
                                material = descMatMatch[0].replace(/[()]/g, ''); // Keep clean text like "lmd lição 5 ponto 5"
                                // Remove material from description to avoid duplication
                                descricao = descricao.replace(descMatMatch[0], '').trim();
                            }
                        }
                        
                        // Priority 2: From title if not found
                        if (!material) {
                            const matMatch = titulo.match(/\(([^)]*)\)/);
                            if (matMatch) material = matMatch[1];
                        }
                    } else if (currentSection === 'vida_crista') {
                        if (/estudo/i.test(titulo) && /congrega/i.test(titulo)) tipo = 'estudo_congregacao';
                        else if (/necessidades/i.test(titulo)) tipo = 'consideracao_anciao';
                        
                        // Capture description for Life and Ministry parts too if available
                        if (!descricao && next) {
                             // Logic to capture description for other sections if needed
                             // But user specifically asked for Ministry
                        }
                    }
                    
                    partes.push({
                        numero,
                        titulo,
                        duracao,
                        secao: currentSection,
                        tipo,
                        sala: currentSection === 'ministerio' ? 'Ambas' : undefined,
                        material,
                        cenario,
                        descricao // Adding the new field
                    });
                }
            }
        }
    });
    
    return { periodo: periodoNormalized, dataInicio, dataFim, leituraBiblica, canticos, partes };
};

// --- Processamento ---

async function processIssue(issueKey, indexUrl) {
    console.log(`\nProcessing Issue: ${issueKey}`);
    
    try {
        console.log(`  Fetching Index: ${indexUrl}`);
        const res = await fetch(indexUrl);
        if (!res.ok) {
            console.error(`  Failed to fetch index: ${res.status}`);
            return;
        }
        const html = await res.text();
        const dom = new JSDOM(html, { url: indexUrl });
        const doc = dom.window.document;
        
        // Extract Links
        // Filter for links containing "Programa" and "Vida-e-Ministério" (or encoded variants)
        // Debug showed: Programa%C3%A7%C3%A3o-da-Reuni%C3%A3o-Vida-e-Minist%C3%A9rio-para-
        const allLinks = [...doc.querySelectorAll('a')]
            .map(a => a.href)
            .filter(h => (h.includes('Programa') || h.includes('schedule')) && /\d/.test(h));
            
        // Deduplicate
        const uniqueLinks = [...new Set(allLinks)];
        
        // Sort (optional, but nice)
        uniqueLinks.sort();
        
        console.log(`Found ${uniqueLinks.length} potential week links.`);
        
        // Filter to ensure we only get the week pages, avoiding other links
        // The pattern seems to be .../Programa...-para-<dates>/
        const validLinks = uniqueLinks.filter(l => l.includes('Programa') && l.includes('para-'));
        
        console.log(`Found ${validLinks.length} confirmed week links.`);
        
        // 3. Process Each Week
        for (const url of validLinks) {
            try {
                console.log(`  Fetching ${url}...`);
                const wResp = await fetch(url);
                const wHtml = await wResp.text();
                
                const weekData = parseWeeklyHtml(wHtml);
                
                if (!weekData.dataInicio || weekData.dataInicio.includes('NaN')) {
                    console.warn(`    Skipping invalid date parse for ${url}`);
                    continue;
                }
                
                // Send to Edge Function
                const payload = {
                    issueKey: issueKey,
                    language: 'pt-BR',
                    weeks: [weekData]
                };

                const edgeUrl = `${process.env.VITE_SUPABASE_URL}/functions/v1/mwb_ingest`;
                console.log(`    Sending to Edge Function: ${edgeUrl}`);
                
                const resp = await fetch(edgeUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!resp.ok) {
                    const txt = await resp.text();
                    console.error(`    Error from Edge Function (${resp.status}):`, txt);
                } else {
                    const json = await resp.json();
                    console.log(`    Success: ${weekData.dataInicio} (${weekData.periodo}) - Status: ${json.status}`);
                }
                
            } catch (e) {
                console.error(`    Error processing ${url}:`, e.message);
            }
        }
    } catch (e) {
        console.error(`Error processing issue ${issueKey}:`, e);
    }
}

async function main() {
    // Nov/Dez 2025
    // await processIssue('2025-11', 'https://www.jw.org/pt/biblioteca/jw-apostila-do-mes/novembro-dezembro-2025-mwb/');
    
    // Jan/Fev 2026
    // await processIssue('2026-01', 'https://www.jw.org/pt/biblioteca/jw-apostila-do-mes/janeiro-fevereiro-2026-mwb/');

    // Mar/Abr 2026
    // await processIssue('2026-03', 'https://www.jw.org/pt/biblioteca/jw-apostila-do-mes/marco-abril-2026-mwb/');
}

main();
