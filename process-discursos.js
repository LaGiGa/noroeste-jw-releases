import XLSX from 'xlsx';
import { writeFileSync } from 'fs';

const workbook = XLSX.readFile('DISCURSOS - FREQUÊNCIA.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

// Mapear oradores e seus discursos
const oradoresDiscursos = {};
const historico = [];

// Função para converter data do Excel para formato JS
function excelDateToJSDate(excelDate) {
    try {
        if (!excelDate || excelDate === '' || isNaN(excelDate)) return null;
        const date = new Date((Number(excelDate) - 25569) * 86400 * 1000);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0];
    } catch (e) {
        return null;
    }
}

// Processar dados
data.forEach((row, idx) => {
    if (idx === 0 || !row[0]) return; // Pular cabeçalho e linhas vazias

    const numero = row[0];
    const tema = row[1];
    const feito = row[2];
    const orador = row[3];
    const data1 = row[4];
    const data2 = row[5];
    const data3 = row[6];
    const data4 = row[7];

    // Se tem orador, adicionar discurso à lista dele
    if (orador && String(orador).trim()) {
        const nomeOrador = String(orador).split('(')[0].trim();
        if (!oradoresDiscursos[nomeOrador]) {
            oradoresDiscursos[nomeOrador] = new Set();
        }
        oradoresDiscursos[nomeOrador].add(numero);
    }

    // Se foi feito, adicionar ao histórico
    if (feito === 'Sim') {
        [data1, data2, data3, data4].forEach(dataExcel => {
            if (dataExcel && dataExcel !== '') {
                const dataFormatada = excelDateToJSDate(dataExcel);
                if (dataFormatada) {
                    historico.push({
                        data: dataFormatada,
                        numeroDiscurso: numero,
                        tema: tema,
                        orador: orador && String(orador).trim() ? String(orador).split('(')[0].trim() : 'Não especificado'
                    });
                }
            }
        });
    }
});

// Converter Sets para Arrays e ordenar
const oradoresResult = {};
Object.keys(oradoresDiscursos).forEach(nome => {
    oradoresResult[nome] = Array.from(oradoresDiscursos[nome]).sort((a, b) => a - b);
});

// Ordenar histórico por data (mais recente primeiro)
historico.sort((a, b) => new Date(b.data) - new Date(a.data));

// Salvar resultados
writeFileSync('oradores-discursos.json', JSON.stringify(oradoresResult, null, 2));
writeFileSync('historico-discursos.json', JSON.stringify(historico, null, 2));

console.log('✅ Dados processados com sucesso!');
console.log('\n📊 Oradores e seus discursos:');
console.log(JSON.stringify(oradoresResult, null, 2));
console.log(`\n📅 Total de discursos no histórico: ${historico.length}`);
console.log('\n🎤 Últimos 10 discursos realizados:');
console.log(JSON.stringify(historico.slice(0, 10), null, 2));
