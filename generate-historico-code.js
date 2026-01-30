import { readFileSync } from 'fs';

const historico = JSON.parse(readFileSync('historico-discursos.json', 'utf8'));

console.log('const [historico] = useState<HistoricoItem[]>([');

historico.forEach((item, idx) => {
    const numeroDiscurso = item.numeroDiscurso;
    const tema = item.tema.replace(/"/g, '\\"');
    const orador = item.orador.replace(/"/g, '\\"');

    console.log(`    { id: ${idx + 1}, data: '${item.data}', tema: '${tema}', orador: '${orador}', congregacao: 'Congregação Noroeste', discurso: '${numeroDiscurso} - ${tema}' },`);
});

console.log(']);');
