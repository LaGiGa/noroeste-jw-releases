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

        // Determine Meeting Block Range
        // Content appears AFTER the date line until the next date line
        let nextDateIndex = (i === meetingIndices.length - 1) ? lines.length : meetingIndices[i + 1];

        const meetingLines = lines.slice(dateIndex + 1, nextDateIndex);
        const headerLines = meetingLines.slice(0, 20);

        // --- STEP 1: Extract Footer Names (for Principal Room) ---
        // Names appear BEFORE the date line
        // Order found in footer: Ministry -> Treasures -> NVC -> Prayer
        const footerNames = [];
        for (let j = dateIndex - 1; j >= Math.max(0, dateIndex - 30); j--) {
            const line = lines[j].trim();

            // Stop conditions
            if (line.match(/^\d+\./) ||
                line.includes('TESOUROS') || line.includes('FAÇA SEU') || line.includes('NOSSA VIDA') ||
                line.includes('Vida e Ministério') || line.includes('Impresso')) {
                break;
            }

            // Skip but don't stop
            if (line.includes('Sala B:') || line.includes('Salão principal') ||
                line.startsWith('Cântico') || line.includes('Comentários') || line.includes('Oração:')) {
                continue;
            }

            if (line.length > 2) {
                footerNames.unshift(line);
            }
        }
        console.log(`  Footer names: ${footerNames.length}`);

        // --- STEP 2: Find President ---
        let presidentName = '';
        const presidentLine = headerLines.find(l => l.includes('Presidente:')) || meetingLines.find(l => l.includes('Presidente:'));
        if (presidentLine) {
            let pName = presidentLine.replace(/Presidente:?/, '').trim();
            const parts = splitCamelCase(pName);
            if (parts.length >= 2 && parts[0] === parts[1]) pName = parts[0];
            presidentName = pName;
            meeting.assignments.push({ role: 'Presidente', studentName: pName, point: 'Presidente', room: 'Principal' });
        }

        // --- STEP 3: Identify Parts ---
        const allParts = [];
        meetingLines.forEach((l, idx) => {
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

        // --- STEP 4: Assign Principal Room Names from Footer ---
        let footerPtr = 0;

        // 4a. Ministry (Principal)
        ministryParts.forEach(part => {
            if (footerNames[footerPtr]) {
                meeting.assignments.push({ studentName: footerNames[footerPtr], point: part.title, room: 'Principal' });
                footerPtr++;
            }
        });

        // 4b. Treasures (Principal)
        treasuresParts.forEach(part => {
            if (footerNames[footerPtr]) {
                meeting.assignments.push({ studentName: footerNames[footerPtr], point: part.title, room: 'Principal' });
                footerPtr++;
            }
        });

        // 4c. NVC (Principal)
        nvcParts.forEach(part => {
            let name = '';
            const nameMatch = part.line.match(/\(\d+\s*min\.?\)\s*(.+)/);
            if (nameMatch && nameMatch[1].trim().length > 2) {
                name = nameMatch[1].trim();
            } else if (footerNames[footerPtr]) {
                name = footerNames[footerPtr];
                footerPtr++;
            }

            if (name) {
                meeting.assignments.push({ studentName: name, point: part.title, room: 'Principal' });
            }
        });

        // 4d. Closing Prayer
        if (footerNames[footerPtr]) {
            const prayerName = footerNames[footerPtr];
            if (!prayerName.includes('&') && prayerName !== presidentName) {
                meeting.assignments.push({ role: 'Oração Final', studentName: prayerName, point: 'Oração Final', room: 'Principal' });
            }
        }

        // --- STEP 5: Assign Sala B Names from Body (for Ministry) ---
        // Names appear after headers (between NVC and Oração/Parts)
        const nvcIdx = meetingLines.findIndex(l => l.includes('NOSSA VIDA CRISTÃ'));

        let salaBNames = [];
        if (nvcIdx !== -1) {
            for (let j = nvcIdx + 1; j < meetingLines.length; j++) {
                const line = meetingLines[j].trim();
                // Check stop conditions: Numbered PArts or Oração
                if (line.match(/^\d+\./) || line.includes('Oração:')) break;

                // Collect valid names
                if (line.length > 2 && !line.includes('NOSSA VIDA')) {
                    salaBNames.push(line);
                }
            }
        }

        console.log(`  Sala B names: ${salaBNames.length}`);

        ministryParts.forEach((part, index) => {
            if (salaBNames[index]) {
                meeting.assignments.push({ studentName: salaBNames[index], point: part.title, room: 'Sala B' });
            }
        });

        // --- STEP 6: Bible Reading (Part 3) ---
        const bibleReading = allParts.find(p => p.num === 3);
        if (bibleReading) {
            const readingLine = bibleReading.line;
            const readingIdx = bibleReading.idx;
            const salaBLine = meetingLines.slice(readingIdx, readingIdx + 5).find(l => l.includes('Sala B:'));

            let salaBName = '';
            let mainName = '';

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
                    const nextLines = meetingLines.slice(readingIdx + 1, readingIdx + 4);
                    const candidateNames = nextLines.filter(l => !l.includes('Sala B') && !l.includes('Salão principal') && !l.match(/^\d+\./));
                    names = candidateNames;
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

        // --- STEP 7: Bible Study ---
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
