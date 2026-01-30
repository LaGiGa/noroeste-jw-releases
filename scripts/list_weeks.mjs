
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

async function main() {
    let SUPABASE_URL = process.env.PROJECT_URL;
    let SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        try {
            const envText = fs.readFileSync('.env', 'utf-8');
            const lines = envText.split(/\r?\n/).filter(Boolean);
            const map = new Map(lines.map(l => {
                const idx = l.indexOf('=');
                if (idx === -1) return [l.trim(), ''];
                return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
            }));
            SUPABASE_URL = SUPABASE_URL || map.get('VITE_SUPABASE_URL');
            SERVICE_ROLE_KEY = SERVICE_ROLE_KEY || map.get('VITE_SUPABASE_ANON_KEY');
        } catch {
            // ignore
        }
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        console.error('Erro: Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas.');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    console.log('Conectando ao Supabase...');

    const { data, error } = await supabase
        .from('mwb_weeks')
        .select('week_date, content')
        .eq('language', 'pt-BR')
        .order('week_date', { ascending: true });

    if (error) {
        console.error('Erro ao consultar mwb_weeks:', error);
        process.exit(1);
    }

    if (!data || data.length === 0) {
        console.log('Nenhuma semana encontrada no banco de dados.');
        return;
    }

    // Organizar por Ano -> Mês
    const grouped = {};
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    data.forEach(row => {
        const date = new Date(row.week_date + 'T12:00:00'); // Evitar problemas de timezone
        const year = date.getFullYear();
        const monthIndex = date.getMonth();
        const monthName = meses[monthIndex];

        if (!grouped[year]) grouped[year] = {};
        if (!grouped[year][monthIndex]) grouped[year][monthIndex] = { name: monthName, weeks: [] };

        const content = row.content || {};
        const periodo = content.periodo || row.week_date;
        
        grouped[year][monthIndex].weeks.push({
            date: row.week_date,
            periodo: periodo
        });
    });

    console.log('\n=== Semanas Disponíveis no Supabase ===\n');

    const sortedYears = Object.keys(grouped).sort();

    for (const year of sortedYears) {
        const sortedMonths = Object.keys(grouped[year]).sort((a, b) => parseInt(a) - parseInt(b));
        
        for (const monthIndex of sortedMonths) {
            const monthData = grouped[year][monthIndex];
            console.log(`\n📅 ${monthData.name} ${year}`);
            console.log('-------------------------');
            
            monthData.weeks.forEach(w => {
                console.log(`   • [${w.date}] ${w.periodo}`);
            });
        }
    }
    console.log('\n=======================================\n');
}

main().catch(console.error);
