
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const url = 'https://www.jw.org/pt/biblioteca/jw-apostila-do-mes/janeiro-fevereiro-2026-mwb/Programa%C3%A7%C3%A3o-da-Reuni%C3%A3o-Vida-e-Minist%C3%A9rio-para-2-8-de-fevereiro-de-2026/';

const parseWeeklyHtml = (html) => {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const mainContent = doc.querySelector('.docSubContent') || doc.querySelector('#p1') || doc.querySelector('main') || doc.body;
    
    // Partes
    const partes = [];
    
    // Estratégia baseada em seções H2/H3
    const sections = [
        { id: 'tesouros', pattern: /TESOUROS|TREASURES/i },
        { id: 'ministerio', pattern: /MINIST[ÉE]RIO|APPLY/i },
        { id: 'vida_crista', pattern: /VIDA\s+CRIST[ÃA]|CHRISTIAN\s+LIFE/i }
    ];
    
    let currentSection = 'tesouros';
    
    // Debug: Log all headers to see structure
    const headers = mainContent.querySelectorAll('h2, h3');
    console.log('--- Headers Found ---');
    headers.forEach(h => console.log(h.tagName, h.textContent.trim()));
    console.log('---------------------');

    // Only look at direct children or specific blocks to avoid noise
    const allElements = mainContent.querySelectorAll('h3');
    
    allElements.forEach(el => {
        const text = el.textContent.trim().replace(/\s+/g, ' ');
        
        // Check for numbered parts in H3
        if (/^\d+\./.test(text)) {
            console.log(`[H3 Part] "${text}"`);
            
            // Check next sibling
            let next = el.nextElementSibling;
            if (next) {
                const nextText = next.textContent.trim().replace(/\s+/g, ' ');
                console.log(`   [Next Sibling] Tag: ${next.tagName}, Text: "${nextText.substring(0, 100)}..."`);
            }
        }
    });
    
    return partes;
};

async function main() {
    console.log(`Fetching ${url}...`);
    const res = await fetch(url);
    const html = await res.text();
    const results = parseWeeklyHtml(html);
    console.log('\n--- Parsed Parts ---');
    console.log(JSON.stringify(results, null, 2));
}

main();
