/**
 * Teste da Importação do jw.org
 * Execute este arquivo para testar a importação
 */

import { jworgImportService } from '../services/jworgImportService';

async function testarImportacao() {
    console.log('🧪 Iniciando teste de importação...\n');

    // Testar com Novembro 2025
    const ano = 2025;
    const mes = 11; // Novembro

    console.log(`📅 Buscando apostila de ${mes}/${ano}...\n`);

    try {
        const semanas = await jworgImportService.importarApostilaMes(ano, mes);

        if (!semanas || semanas.length === 0) {
            console.error('❌ Nenhuma semana encontrada');
            return;
        }

        console.log(`✅ ${semanas.length} semanas importadas com sucesso!\n`);

        // Mostrar detalhes de cada semana
        semanas.forEach((semana, index) => {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📅 SEMANA ${index + 1}: ${semana.periodo}`);
            console.log(`${'='.repeat(60)}`);
            console.log(`📖 Leitura Bíblica: ${semana.leituraBiblica}`);
            console.log(`🎵 Cânticos: ${semana.canticos.inicial} | ${semana.canticos.meio} | ${semana.canticos.final}`);
            console.log(`📆 Data: ${semana.dataInicio} até ${semana.dataFim}`);
            console.log(`\n📋 PARTES DA REUNIÃO:`);

            // Agrupar por seção
            const tesouros = semana.partes.filter(p => p.secao === 'tesouros');
            const ministerio = semana.partes.filter(p => p.secao === 'ministerio');
            const vidaCrista = semana.partes.filter(p => p.secao === 'vida_crista');

            if (tesouros.length > 0) {
                console.log(`\n  📖 TESOUROS DA PALAVRA DE DEUS:`);
                tesouros.forEach(p => {
                    console.log(`    ${p.numero}. ${p.titulo} (${p.duracao} min)`);
                    if (p.material) console.log(`       📚 Material: ${p.material}`);
                });
            }

            if (ministerio.length > 0) {
                console.log(`\n  🎯 FAÇA SEU MELHOR NO MINISTÉRIO:`);
                ministerio.forEach(p => {
                    console.log(`    ${p.numero}. ${p.titulo} (${p.duracao} min)`);
                    if (p.cenario) console.log(`       🏠 Cenário: ${p.cenario}`);
                    if (p.material) console.log(`       📚 Material: ${p.material}`);
                    if (p.sala) console.log(`       🚪 Sala: ${p.sala}`);
                });
            }

            if (vidaCrista.length > 0) {
                console.log(`\n  ❤️ NOSSA VIDA CRISTÃ:`);
                vidaCrista.forEach(p => {
                    console.log(`    ${p.numero}. ${p.titulo} (${p.duracao} min)`);
                    if (p.material) console.log(`       📚 Material: ${p.material}`);
                });
            }
        });

        console.log(`\n${'='.repeat(60)}`);
        console.log('✨ Teste concluído com sucesso!');
        console.log(`${'='.repeat(60)}\n`);

        // Exemplo de como usar no seu componente
        console.log('\n💡 EXEMPLO DE USO NO COMPONENTE:\n');
        console.log('const handleImportSuccess = (semanas) => {');
        console.log('  const semana = semanas[0]; // Primeira semana');
        console.log('  setPrograma({');
        console.log(`    data: '${semanas[0].periodo}',`);
        console.log(`    referenciaBiblica: '${semanas[0].leituraBiblica}',`);
        console.log(`    canticoInicial: '${semanas[0].canticos.inicial}',`);
        console.log('    // ... resto dos campos');
        console.log('  });');
        console.log('};\n');

    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

// Executar teste
testarImportacao();
