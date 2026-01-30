const fs = require('fs');
const pdf = require('pdf-parse');

const months = {
    'Janeiro': '01', 'Fevereiro': '02', 'Março': '03', 'Abril': '04', 'Maio': '05', 'Junho': '06',
    'Julho': '07', 'Agosto': '08', 'Setembro': '09', 'Outubro': '10', 'Novembro': '11', 'Dezembro': '12'
};

const pdfPath = './Vida e Ministério agosto a janeiro.pdf';

function splitCamelCase(str) {
    if (!str) return [];
    return str.replace(/([a-zà-ú0-9.])(?=[A-ZÀ-Ú])/g, '$1|').split('|').map(s => s.trim());
}

function isValidName(l) {
    l = l.trim();
    if (l.length <= 2) return false;
    if (l.match(/^\d+\./)) return false;
    if (l.includes('TESOUROS') || l.includes('FAÇA SEU') || l.includes('NOSSA VIDA')) return false;
    if (l.startsWith('Cântico') || l.startsWith('Oração') || l.startsWith('Comentários') || l.startsWith('Presidente')) return false;
    if (l.includes('Sala B:') || l.includes('Salão principal')) return false;
    if (l.includes('Vida e Ministério') || l.includes('Impresso') || l.includes('Noroeste')) return false;
    if (l.includes('Dirigente/Leitor')) return false;
    if (l.includes('Estudo Bíblico de Congregação')) return false;
    return true;
}

async function parse() {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    const text = data.text;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    const dateRegex = /^(\d{1,2})\s+(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s+\|/i;

    const meetings = [];
    const meetingIndices = [];

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(dateRegex)) meetingIndices.push(i);
    }
    console.log(`Found ${meetingIndices.length} meeting dates.`);

    let prevBlockStart = 0;

    for (let i = 0; i < meetingIndices.length; i++) {
        const dateIndex = meetingIndices[i];
        const dateMatch = lines[dateIndex].match(dateRegex);

        const day = dateMatch[1].padStart(2, '0');
        const monthName = dateMatch[2];
        const month = months[monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase()];
        const year = (month === '01' || month === '02') ? '2026' : '2025';
        const dateStr = `${year}-${month}-${day}`;

        console.log(`\nProcessing meeting: ${dateStr}`);

        const meeting = {
            date: dateStr,
            assignments: []
        };

        // 1. MAIN BLOCK (Titles & Principal Names)
        const mainBlock = lines.slice(prevBlockStart, dateIndex);

        // 2. RAW NEXT BLOCK (For Sala B Names candidates)
        let nextDateIndex = (i === meetingIndices.length - 1) ? lines.length : meetingIndices[i + 1];
        const salaBBlock = lines.slice(dateIndex + 1, nextDateIndex);

        // Update prevBlockStart
        prevBlockStart = dateIndex + 1;

        // --- IDENTIFY PARTS (from Main Block) ---
        const allParts = [];
        mainBlock.forEach((l, idx) => {
            const m = l.match(/^(\d+)\.\s+([^(]+)/);
            if (m) {
                const num = parseInt(m[1]);
                const title = m[2].trim().replace(/:$/, '');
                allParts.push({ num, title, line: l, idx });
            }
        });

        const treasuresParts = allParts.filter(p => p.num >= 1 && p.num <= 2);
        const ministryParts = allParts.filter(p => p.num >= 4 && p.num <= 7);
        const nvcParts = allParts.filter(p => p.num >= 7 && !p.line.includes('Estudo Bíblico'));
        const bibleStudy = allParts.find(p => p.line.includes('Estudo Bíblico'));
        const bibleReading = allParts.find(p => p.num === 3);

        // --- EXTRACT PRINCIPAL NAMES (from Main Block) ---
        const principalNames = mainBlock.filter(l => isValidName(l) && !l.includes('Leitura da Bíblia'));

        // Assign Principal Names
        let ptr = 0;

        // 1. Ministry (Principal)
        ministryParts.forEach(p => { if (principalNames[ptr]) { meeting.assignments.push({ studentName: principalNames[ptr], point: p.title, room: 'Principal' }); ptr++; } });
        // 2. Treasures (Principal)
        treasuresParts.forEach(p => { if (principalNames[ptr]) { meeting.assignments.push({ studentName: principalNames[ptr], point: p.title, room: 'Principal' }); ptr++; } });
        // 3. NVC (Principal)
        nvcParts.forEach(p => {
            let name = '';
            const nameMatch = p.line.match(/\(\d+\s*min\.?\)\s*(.+)/);
            if (nameMatch && nameMatch[1].trim().length > 2) name = nameMatch[1].trim();
            else if (principalNames[ptr]) { name = principalNames[ptr]; ptr++; }
            if (name) meeting.assignments.push({ studentName: name, point: p.title, room: 'Principal' });
        });
        // 4. Prayer
        if (principalNames[ptr]) {
            const prayerName = principalNames[ptr];
            if (!prayerName.includes('&')) { meeting.assignments.push({ role: 'Oração Final', studentName: prayerName, point: 'Oração Final', room: 'Principal' }); ptr++; }
        }

        // --- EXTRACT SALA B NAMES (from Sala B Block) ---
        const salaBCount = ministryParts.length;
        const salaBCandidates = salaBBlock.filter(l => isValidName(l) && !l.includes('Leitura da Bíblia') && !l.includes('Estudo Bíblico'));
        const salaBNames = salaBCandidates.slice(0, salaBCount);

        // Assign Sala B
        ministryParts.forEach((p, idx) => {
            if (salaBNames[idx]) meeting.assignments.push({ studentName: salaBNames[idx], point: p.title, room: 'Sala B' });
        });

        // President logic
        const headerLines = mainBlock.slice(-15);
        const presidentLine = headerLines.find(l => l.includes('Presidente:')) || mainBlock.find(l => l.includes('Presidente:'));
        if (presidentLine) {
            let pName = presidentLine.replace(/Presidente:?/, '').trim();
            const parts = splitCamelCase(pName);
            if (parts.length >= 2 && parts[0] === parts[1]) pName = parts[0];
            meeting.assignments.push({ role: 'Presidente', studentName: pName, point: 'Presidente', room: 'Principal' });
        }

        // Bible Reading
        if (bibleReading) {
            const readingLine = bibleReading.line;
            const readingIdx = bibleReading.idx;
            const salaBLine = mainBlock.slice(readingIdx, readingIdx + 6).find(l => l.includes('Sala B:'));

            let salaBName = '';
            let mainName = '';
            if (salaBLine) {
                salaBName = salaBLine.replace('Sala B:', '').trim();
                const parts = readingLine.split(/\(\d+\s*min\.?\)/);
                if (parts[1] && parts[1].trim().length > 2) {
                    let extracted = splitCamelCase(parts[1].trim());
                    mainName = extracted[extracted.length - 1];
                }
            } else {
                let namesPart = readingLine.split(/\(\d+\s*min\.?\)/)[1] || '';
                let names = splitCamelCase(namesPart.trim());
                if (names[0]) salaBName = names[0];
                if (names[1]) mainName = names[1];
            }
            const clean = (n) => n ? n.replace(/Salão principal/i, '').trim() : '';
            salaBName = clean(salaBName);
            mainName = clean(mainName);
            if (salaBName) meeting.assignments.push({ studentName: salaBName, point: 'Leitura da Bíblia', room: 'Sala B' });
            if (mainName) meeting.assignments.push({ studentName: mainName, point: 'Leitura da Bíblia', room: 'Principal' });
        }

        // Bible Study
        if (bibleStudy) {
            const studyLine = bibleStudy.line;
            let conductor = '', reader = '';
            const nameMatch = studyLine.match(/\(30 min\.\)\s*(.+)/);
            if (nameMatch) {
                const namesText = nameMatch[1].trim();
                const names = namesText.split(/&| e /).map(s => s.trim());
                conductor = names[0] || ''; reader = names[1] || '';
            }
            const cleanName = (n) => n ? n.split(/Comentários|Cântico|Oração|\d{1,2}\s+[A-Za-zç]+\s+\|/)[0].trim() : '';
            reader = cleanName(reader); conductor = cleanName(conductor);
            if (conductor.length > 2) meeting.assignments.push({ role: 'Condutor', studentName: conductor, point: 'Estudo Bíblico de Congregação', room: 'Principal' });
            if (reader.length > 2) meeting.assignments.push({ role: 'Leitor', studentName: reader, point: 'Leitor', room: 'Principal' });
        }

        meetings.push(meeting);
    }

    fs.writeFileSync('src/data/history_data.json', JSON.stringify(meetings, null, 2));
    console.log(`\n✅ Parsed ${meetings.length} meetings successfully!`);
}
parse();
