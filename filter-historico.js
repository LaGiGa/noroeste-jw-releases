import { readFileSync } from 'fs';

const historico = JSON.parse(readFileSync('historico-discursos.json', 'utf8'));

// Filtrar apenas discursos até hoje (29/11/2025)
const hoje = new Date('2025-11-29');
const historicoPassado = historico.filter(item => {
    const dataDiscurso = new Date(item.data);
    return dataDiscurso <= hoje;
});

console.log(`Total de discursos realizados até hoje: ${historicoPassado.length}`);
console.log('\nÚltimos 50 discursos realizados:');

historicoPassado.slice(0, 50).forEach((item, idx) => {
    const numeroDiscurso = item.numeroDiscurso;
    const tema = item.tema.replace(/"/g, '\\"');
    const orador = item.orador.replace(/"/g, '\\"');

    console.log(`    { id: ${idx + 1}, data: '${item.data}', tema: '${tema}', orador: '${orador}', congregacao: 'Congregação Noroeste', discurso: '${numeroDiscurso} - ${tema}' },`);
});
