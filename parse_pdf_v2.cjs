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

    // 1. Find all Date Lines
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

        console.log(`Processing meeting: ${dateStr}`);

        const meeting = {
            date: dateStr,
            assignments: []
        };

        // Determine Meeting Block Range
        let actualStart = (i === 0) ? 0 : meetingIndices[i - 1] + 1;
        let actualEnd = meetingIndices[i];

        const meetingLines = lines.slice(actualStart, actualEnd);
        const headerLines = lines.slice(actualEnd + 1, actualEnd + 20);

        // --- PARSING LOGIC ---

        // 1. President
        let presidentName = '';
        const presidentLine = headerLines.find(l => l.includes('Presidente:')) || meetingLines.find(l => l.includes('Presidente:'));

        if (presidentLine) {
            let pName = presidentLine.replace(/Presidente:?/, '').trim();
            const parts = splitCamelCase(pName);
            if (parts.length >= 2 && parts[0] === parts[1]) pName = parts[0];
            presidentName = pName;
            meeting.assignments.push({ role: 'Presidente', studentName: pName, point: 'Presidente', room: 'Principal' });
        }

        // 2. Find section headers
        const tesourosIdx = meetingLines.findIndex(l => l.includes('TESOUROS DA PALAVRA'));
        const ministerioIdx = meetingLines.findIndex(l => l.includes('FAÇA SEU MELHOR'));
        const nvcIdx = meetingLines.findIndex(l => l.includes('NOSSA VIDA CRISTÃ'));

        // 3. Extract Treasures parts (1 and 2) - Names appear BEFORE the numbered lines
        if (tesourosIdx !== -1) {
            const part1Idx = meetingLines.findIndex((l, idx) => idx > tesourosIdx && l.match(/^1\.\s/));
            const part2Idx = meetingLines.findIndex((l, idx) => idx > tesourosIdx && l.match(/^2\.\s/));

            if (part1Idx !== -1) {
                const part1Line = meetingLines[part1Idx];
                const titleMatch = part1Line.match(/^\d+\.\s+([^(]+)/);
                const title = titleMatch ? titleMatch[1].trim().replace(/:$/, '') : '';

                // Look backwards for the name
                for (let j = part1Idx - 1; j > tesourosIdx; j--) {
                    const line = meetingLines[j].trim();
                    if (!line || line.includes('TESOUROS') || line.includes('FAÇA SEU') ||
                        line.includes('NOSSA VIDA') || line.startsWith('Cântico') ||
                        line.includes('Comentários') || line.match(/^\d+\./)) continue;

                    if (line.length > 2) {
                        meeting.assignments.push({
                            studentName: line,
                            point: title,
                            room: 'Principal'
                        });
                        break;
                    }
                }
            }

            if (part2Idx !== -1) {
                const part2Line = meetingLines[part2Idx];
                const titleMatch = part2Line.match(/^\d+\.\s+([^(]+)/);
                const title = titleMatch ? titleMatch[1].trim().replace(/:$/, '') : '';

                const searchStart = part1Idx !== -1 ? part1Idx : tesourosIdx;
                for (let j = part2Idx - 1; j > searchStart; j--) {
                    const line = meetingLines[j].trim();
                    if (!line || line.includes('TESOUROS') || line.includes('FAÇA SEU') ||
                        line.includes('NOSSA VIDA') || line.startsWith('Cântico') ||
                        line.includes('Comentários') || line.match(/^\d+\./)) continue;

                    if (line.length > 2) {
                        meeting.assignments.push({
                            studentName: line,
                            point: title,
                            room: 'Principal'
                        });
                        break;
                    }
                }
            }
        }

        // 4. Bible Reading (Part 3)
        const readingLineIdx = meetingLines.findIndex(l => l.match(/^3\.\s+Leitura da Bíblia/));

        if (readingLineIdx !== -1) {
            const readingLine = meetingLines[readingLineIdx];

            const salaBLine = meetingLines.slice(readingLineIdx, readingLineIdx + 5).find(l => l.includes('Sala B:'));

            let salaBName = '';
            let mainName = '';

            if (salaBLine) {
                salaBName = salaBLine.replace('Sala B:', '').trim();

                const parts = readingLine.split(/\(\d+\s*min\.?\)/);
                if (parts[1] && parts[1].trim().length > 2) {
                    const names = splitCamelCase(parts[1].trim());
                    if (names.length > 1) mainName = names[names.length - 1];
                    else mainName = names[0];
                }
            } else {
                let namesPart = readingLine.split(/\(\d+\s*min\.?\)/)[1] || '';
                let names = splitCamelCase(namesPart.trim());
                if (names.length === 0) {
                    const nextLines = meetingLines.slice(readingLineIdx + 1, readingLineIdx + 4);
                    const candidateNames = nextLines.filter(l =>
                        !l.includes('Sala B') &&
                        !l.includes('Salão principal') &&
                        !l.match(/^\d+\./)
                    );
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

        // 5. Ministry Parts (4-7) - Names appear BEFORE the numbered lines
        if (ministerioIdx !== -1) {
            const ministryParts = [];

            meetingLines.forEach((l, idx) => {
                if (idx > ministerioIdx && idx < (nvcIdx !== -1 ? nvcIdx : meetingLines.length)) {
                    const m = l.match(/^([4-7])\.\s+([^(]+)/);
                    if (m) {
                        const num = parseInt(m[1]);
                        const title = m[2].trim().replace(/:$/, '');
                        ministryParts.push({ num, title, idx });
                    }
                }
            });

            ministryParts.forEach((part, partIndex) => {
                const searchStart = partIndex > 0 ? ministryParts[partIndex - 1].idx : ministerioIdx;

                for (let j = part.idx - 1; j > searchStart; j--) {
                    const line = meetingLines[j].trim();
                    if (!line || line.includes('TESOUROS') || line.includes('FAÇA SEU') ||
                        line.includes('NOSSA VIDA') || line.startsWith('Cântico') ||
                        line.includes('Comentários') || line.match(/^\d+\./)) continue;

                    if (line.length > 2) {
                        meeting.assignments.push({
                            studentName: line,
                            point: part.title,
                            room: 'Principal'
                        });
                        break;
                    }
                }
            });
        }

        // 6. NVC parts (7+) - excluding Bible Study
        if (nvcIdx !== -1) {
            const nvcParts = [];

            meetingLines.forEach((l, idx) => {
                if (idx > nvcIdx) {
                    const m = l.match(/^([7-9]|1[0-9])\.\s+([^(]+)/);
                    if (m && !l.includes('Estudo Bíblico de Congregação')) {
                        const num = parseInt(m[1]);
                        const title = m[2].trim().replace(/:$/, '');
                        nvcParts.push({ num, title, idx });
                    }
                }
            });

            nvcParts.forEach((part, partIndex) => {
                const searchStart = partIndex > 0 ? nvcParts[partIndex - 1].idx : nvcIdx;

                for (let j = part.idx - 1; j > searchStart; j--) {
                    const line = meetingLines[j].trim();
                    if (!line || line.includes('NOSSA VIDA') || line.startsWith('Cântico') ||
                        line.includes('Comentários') || line.includes('Estudo Bíblico') ||
                        line.match(/^\d+\./)) continue;

                    if (line.length > 2) {
                        meeting.assignments.push({
                            studentName: line,
                            point: part.title,
                            room: 'Principal'
                        });
                        break;
                    }
                }
            });
        }

        // 7. Oração Final
        const closingPrayerCandidates = headerLines.filter(l =>
            !l.includes('Presidente') &&
            !l.includes('Cântico') &&
            !l.match(/^\d+\./) &&
            !l.includes('Oração') &&
            !l.includes('Salão principal') &&
            !l.includes('Sala B') &&
            !l.includes('Fim da reunião') &&
            l.length > 2 &&
            l !== presidentName
        );

        if (closingPrayerCandidates.length > 0) {
            const prayerName = closingPrayerCandidates[0];
            if (!prayerName.includes('&')) {
                meeting.assignments.push({ role: 'Oração Final', studentName: prayerName, point: 'Oração Final', room: 'Principal' });
            }
        }

        // 8. Bible Study
        const studyIdx = meetingLines.findIndex(l => l.includes('Estudo Bíblico de Congregação'));

        if (studyIdx !== -1) {
            const studyBlock = [];
            for (let k = studyIdx; k < Math.min(studyIdx + 4, meetingLines.length); k++) {
                const line = meetingLines[k];
                if (k > studyIdx && (line.includes('Comentários') || line.startsWith('Cântico') || line.startsWith('Oração'))) {
                    break;
                }
                studyBlock.push(line);
            }

            let conductor = '';
            let reader = '';

            const studyText = studyBlock.join(' ');

            const dlMatch = studyText.match(/Dirigente\/Leitor:\s*([^&]+)(?:&|e)\s*(.+)/i);

            if (dlMatch) {
                conductor = dlMatch[1].trim();
                reader = dlMatch[2].trim();

                conductor = conductor.replace(/\(30 min\.\)/, '').trim();
            } else {
                const timeSplit = studyText.split(/\(30 min\.\)/);
                if (timeSplit[1]) {
                    const namesPart = timeSplit[1].replace(/Dirigente\/Leitor:?/, '').trim();
                    const names = namesPart.split(/&| e /).map(s => s.trim());
                    conductor = names[0];
                    reader = names[1];
                }
            }

            const cleanName = (n) => {
                if (!n) return '';
                return n.split(/Comentários|Cântico|Oração|\d{1,2}\s+[A-Za-zç]+\s+\|/)[0].trim();
            };

            reader = cleanName(reader);
            conductor = cleanName(conductor);

            if (conductor && conductor.length > 2) meeting.assignments.push({ role: 'Condutor', studentName: conductor, point: 'Estudo Bíblico de Congregação', room: 'Principal' });
            if (reader && reader.length > 2) meeting.assignments.push({ role: 'Leitor', studentName: reader, point: 'Leitor', room: 'Principal' });
        }

        meetings.push(meeting);
    }

    fs.writeFileSync('src/data/history_data.json', JSON.stringify(meetings, null, 2));
    console.log(`Parsed ${meetings.length} meetings.`);
}

parse();
