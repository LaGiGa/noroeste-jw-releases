
import { jworgImportService } from '../src/services/jworgImportService.js';

async function testImport() {
    console.log('Iniciando teste de importação JW.org...');
    try {
        // Tentando importar Dezembro 2025 (Mes 12)
        const weeks = await jworgImportService.importarApostilaMes(2025, 12);

        if (weeks) {
            console.log(`Importação realizada com sucesso! ${weeks.length} semanas encontradas.`);
            weeks.forEach((week, i) => {
                console.log(`\nSemana ${i + 1}: ${week.periodo}`);
                console.log('Partes do Ministério:');
                week.partes.filter(p => p.secao === 'ministerio').forEach(p => {
                    console.log(` - [${p.tipo}] ${p.titulo} (${p.duracao} min)`);
                    if (p.material) console.log(`   Material: ${p.material}`);
                    if (p.cenario) console.log(`   Cenário: ${p.cenario}`);
                });
            });
        } else {
            console.error('Nenhuma semana retornada (null).');
        }
    } catch (error) {
        console.error('Erro durante o teste:', error);
    }
}

testImport();