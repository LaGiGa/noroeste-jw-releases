import XLSX from 'xlsx';
import fs from 'fs';

try {
    const workbook = XLSX.readFile('DISCURSOS - FREQUÊNCIA.xlsx');
    const sheetNames = workbook.SheetNames;

    console.log('Planilhas encontradas:', sheetNames);

    sheetNames.forEach(sheetName => {
        console.log(`\n\n========== PLANILHA: ${sheetName} ==========\n`);
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        console.log('Total de linhas:', data.length);
        console.log('\nPrimeiras 3 linhas (cabeçalho):');
        data.slice(0, 3).forEach((row, idx) => {
            console.log(`Linha ${idx}:`, JSON.stringify(row));
        });

        console.log('\n\nTODOS OS DADOS:');
        data.forEach((row, idx) => {
            if (row && row.length > 0 && row[0]) {
                console.log(JSON.stringify({
                    linha: idx,
                    numero: row[0],
                    tema: row[1],
                    feito: row[2],
                    orador: row[3],
                    data1: row[4],
                    data2: row[5],
                    data3: row[6],
                    data4: row[7]
                }));
            }
        });
    });
} catch (error) {
    console.error('Erro:', error.message);
}
