const fs = require('fs');

// Read the current JSON
const data = JSON.parse(fs.readFileSync('src/data/history_data.json', 'utf8'));

// Mapping of incorrect names to correct names for first week (2025-08-06)
const corrections = {
    '2025-08-06': {
        'Ronaldo Lucindo': {
            oldPoint: 'Iniciando conversas',
            newName: 'Mª de Fátima & Graça Gomes'
        },
        'Júnior Miranda': {
            oldPoint: 'Cultivando o interesse',
            newName: 'Márcia Castro & Mayrla Miranda'
        },
        // Add missing part
        missing: {
            studentName: 'Thássio Brandão',
            point: 'Fazendo discípulos',
            room: 'Principal'
        },
        // Correct NVC part
        nvc: {
            studentName: 'Ronaldo Lucindo',
            point: 'Necessidades locais - Recapitulação Congresso',
            room: 'Principal'
        }
    }
};

// Apply corrections
data.forEach(meeting => {
    if (meeting.date === '2025-08-06') {
        // Remove incorrect assignments
        meeting.assignments = meeting.assignments.filter(a => {
            if (a.studentName === 'Ronaldo Lucindo' && a.point === 'Iniciando conversas') return false;
            if (a.studentName === 'Júnior Miranda' && a.point === 'Cultivando o interesse') return false;
            return true;
        });

        // Add correct assignments
        meeting.assignments.push({
            studentName: 'Mª de Fátima & Graça Gomes',
            point: 'Iniciando conversas',
            room: 'Principal'
        });

        meeting.assignments.push({
            studentName: 'Márcia Castro & Mayrla Miranda',
            point: 'Cultivando o interesse',
            room: 'Principal'
        });

        meeting.assignments.push({
            studentName: 'Thássio Brandão',
            point: 'Fazendo discípulos',
            room: 'Principal'
        });

        meeting.assignments.push({
            studentName: 'Ronaldo Lucindo',
            point: 'Necessidades locais - Recapitulação Congresso',
            room: 'Principal'
        });
    }
});

// Save corrected JSON
fs.writeFileSync('src/data/history_data.json', JSON.stringify(data, null, 2));
console.log('✅ Corrections applied successfully!');
