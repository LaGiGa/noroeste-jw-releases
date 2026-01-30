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

    // Find all Date Lines
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(dateRegex)) {
            meetingIndices.push(i);
        }
    }
    console.log(`Found ${meetingIndices.length} meeting dates.`);

    // --- INITIAL POOL: Names before first date (For Week 1 Principal) ---
    // Exclude Sala B marker lines or Reading lines if they leak in
    let principalNamesPool = lines.slice(0, meetingIndices[0]).filter(l => isValidName(l) && !l.includes('Sala B'));
    // Remove Bible Reading names (usually 2 names associated with Part 3) or leftovers from previous context?
    // In Week 1 preamble (0-25), we have lines 11-12 which are Bible Reading.
    // 11: 3. Leitura... with name
    // 12: Sala B: Stanlley Neres (Name)
    // We should filter out names that are ON part lines or "Sala B:" lines.
    // My validName filter handles 'Sala B:'.
    // But '13: Alcimina' is valid.
    // '12: Sala B: Stanlley' -> 'Stanlley' is NOT extracted by isValidName because line has 'Sala B:'.

    console.log(`Initial Pool Size: ${principalNamesPool.length}`);

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

        let nextDateIndex = (i === meetingIndices.length - 1) ? lines.length : meetingIndices[i + 1];
        const rawBlock = lines.slice(dateIndex + 1, nextDateIndex);
        const headerLines = rawBlock.slice(0, 20);

        // 1. President
        let presidentName = '';
        const presidentLine = headerLines.find(l => l.includes('Presidente:'));
        if (presidentLine) {
            let pName = presidentLine.replace(/Presidente:?/, '').trim();
            const parts = splitCamelCase(pName);
            if (parts.length >= 2 && parts[0] === parts[1]) pName = parts[0];
            presidentName = pName;
            meeting.assignments.push({ role: 'Presidente', studentName: pName, point: 'Presidente', room: 'Principal' });
        }

        // 2. Identify Parts
        const allParts = [];
        rawBlock.forEach((l, idx) => {
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

        // 3. ASSIGN PRINCIPAL NAMES FROM POOL
        let ptr = 0;

        // Ministry (Principal)
        ministryParts.forEach(part => {
            if (principalNamesPool[ptr]) {
                meeting.assignments.push({ studentName: principalNamesPool[ptr], point: part.title, room: 'Principal' });
                ptr++;
            }
        });

        // Treasures (Principal)
        treasuresParts.forEach(part => {
            if (principalNamesPool[ptr]) {
                meeting.assignments.push({ studentName: principalNamesPool[ptr], point: part.title, room: 'Principal' });
                ptr++;
            }
        });

        // NVC (Principal)
        nvcParts.forEach(part => {
            let name = '';
            // Check inline name
            const nameMatch = part.line.match(/\(\d+\s*min\.?\)\s*(.+)/);
            if (nameMatch && nameMatch[1].trim().length > 2) {
                name = nameMatch[1].trim();
            } else if (principalNamesPool[ptr]) {
                name = principalNamesPool[ptr];
                ptr++;
            }
            if (name) meeting.assignments.push({ studentName: name, point: part.title, room: 'Principal' });
        });

        // Closing Prayer
        if (principalNamesPool[ptr]) {
            const prayerName = principalNamesPool[ptr];
            if (!prayerName.includes('&') && prayerName !== presidentName) {
                meeting.assignments.push({ role: 'Oração Final', studentName: prayerName, point: 'Oração Final', room: 'Principal' });
                ptr++; // Consume
            }
        }

        // 4. PREPARE NEXT POOL AND SALA B NAMES
        // Filter out parts lines and known markers to get "loose names"
        const looseNames = rawBlock.filter(l => isValidName(l) && !l.includes('Estudo Bíblico de Congregação'));

        // Sala B count = Ministry Parts Count
        const salaBCount = ministryParts.length;

        // First 'salaBCount' names are Sala B
        const salaBNames = looseNames.slice(0, salaBCount);

        // Remaining names are for NEXT week's Principal Room
        const nextPool = looseNames.slice(salaBCount);

        // Update pool for next iteration
        principalNamesPool = nextPool;
        console.log(`  Sala B Assigned: ${salaBNames.length}.  Next Pool Size: ${principalNamesPool.length}.`);

        // 5. ASSIGN SALA B NAMES
        ministryParts.forEach((part, index) => {
            if (salaBNames[index]) {
                meeting.assignments.push({ studentName: salaBNames[index], point: part.title, room: 'Sala B' });
            }
        });

        // 6. Bible Reading (Special)
        if (bibleReading) {
            const readingLine = bibleReading.line;
            const readingIdx = bibleReading.idx;
            const salaBLine = rawBlock.slice(readingIdx, readingIdx + 5).find(l => l.includes('Sala B:'));

            let salaBName = '';
            let mainName = ''; // Actually Main reading name is usually ON the line or nearby, rarely in pool? 
            // In Week 1: 11: "... Laércio Avelino".
            // So Reading is usually distinct.

            if (salaBLine) {
                salaBName = salaBLine.replace('Sala B:', '').trim();
                const parts = readingLine.split(/\(\d+\s*min\.?\)/);
                if (parts[1] && parts[1].trim().length > 2) {
                    const names = splitCamelCase(parts[1].trim());
                    if (names.length > 1) mainName = names[names.length - 1]; else mainName = names[0];
                }
            } else {
                let namesPart = readingLine.split(/\(\d+\s*min\.?\)/)[1] || '';
                let names = splitCamelCase(namesPart.trim());
                if (names.length === 0) {
                    // Try looking at next lines, but be careful not to grab Sala B loose names
                    const candidates = rawBlock.slice(readingIdx + 1, readingIdx + 4).filter(l => isValidName(l));
                    // This is risky if loose names are close.
                    // But usually Reading is distinct.
                }
                if (names[0]) salaBName = names[0];
                if (names[1]) mainName = names[1];
            }

            const clean = (n) => n ? n.replace(/Salão principal/i, '').trim() : '';
            salaBName = clean(salaBName);
            mainName = clean(mainName);

            if (salaBName) meeting.assignments.push({ studentName: salaBName, point: 'Leitura da Bíblia', room: 'Sala B' });
            if (mainName) meeting.assignments.push({ studentName: mainName, point: 'Leitura da Bíblia', room: 'Principal' });
        }

        // 7. Bible Study (Special)
        if (bibleStudy) {
            const studyLine = bibleStudy.line;
            let conductor = '';
            let reader = '';
            const nameMatch = studyLine.match(/\(30 min\.\)\s*(.+)/);
            if (nameMatch) {
                const namesText = nameMatch[1].trim();
                const names = namesText.split(/&| e /).map(s => s.trim());
                conductor = names[0] || '';
                reader = names[1] || '';
            }
            const cleanName = (n) => n ? n.split(/Comentários|Cântico|Oração|\d{1,2}\s+[A-Za-zç]+\s+\|/)[0].trim() : '';
            reader = cleanName(reader);
            conductor = cleanName(conductor);

            if (conductor && conductor.length > 2) meeting.assignments.push({ role: 'Condutor', studentName: conductor, point: 'Estudo Bíblico de Congregação', room: 'Principal' });
            if (reader && reader.length > 2) meeting.assignments.push({ role: 'Leitor', studentName: reader, point: 'Leitor', room: 'Principal' });
        }

        meetings.push(meeting);
    }

    fs.writeFileSync('src/data/history_data.json', JSON.stringify(meetings, null, 2));
    console.log(`\n✅ Parsed ${meetings.length} meetings successfully!`);
}
parse();
