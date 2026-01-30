import { createClient } from '@supabase/supabase-js';
import { db } from './database';
import type { Person, IndicatorAssignment } from './database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const syncToCloud = async () => {
    console.log('☁️ Iniciando sincronização com a nuvem...');

    // Helpers de sanitização para evitar erros 400
    const sanitizeDate = (d?: string) => (d && d.trim().length >= 10) ? d.substring(0, 10) : null;
    const sanitizeGender = (g?: string) => (g === 'F' ? 'F' : 'M'); // Garante M ou F
    const sanitizeStr = (s?: string) => (s && s.trim() !== '') ? s.trim() : null;

    try {
        // 1. Sincronizar Pessoas
        const persons = db.getPersons();
        console.log(`👥 Sincronizando ${persons.length} pessoas...`);

        const personsPayload = persons.map((p: Person) => ({
            legacy_id: p.id,
            name: p.name || 'Sem Nome',
            gender: sanitizeGender(p.gender),
            birth_date: sanitizeDate(p.birthDate),
            baptism_date: sanitizeDate(p.baptizedDate),
            phone: sanitizeStr(p.phones?.home || p.phones?.work),
            mobile: sanitizeStr(p.phones?.mobile),
            email: null,
            address: sanitizeStr(p.address),
            city: null,

            active: p.active ?? true,
            moved: p.moved || false,
            deceased: p.deceased || false,

            elder: p.privileges?.elder || false,
            ministerial_servant: p.privileges?.ministerialServant || false,
            pioneer_regular: p.pioneerStatus?.regular || false,
            pioneer_auxiliary: p.pioneerStatus?.auxiliary || false,
            pioneer_special: p.pioneerStatus?.special || false,
            missionary: p.pioneerStatus?.missionary || false,

            assignments: p.assignments || {},
            unavailability: p.unavailability || []
        }));

        // Upsert pessoas
        const { error: errDelP } = await supabase.from('persons').delete().neq('name', 'PLACEHOLDER_NEVER_MATCH');
        if (errDelP) console.error('Erro limpando pessoas:', errDelP);

        const { error: errP } = await supabase.from('persons').insert(personsPayload);
        if (errP) {
            console.error('❌ Erro ao enviar pessoas:', errP);
            // Em caso de erro, tente identificar qual registro falhou (opcional)
            throw errP;
        }

        // 2. Sincronizar Designações (Indicador)
        const assignments = db.getIndicatorAssignments();
        console.log(`📅 Sincronizando ${assignments.length} designações...`);

        const assignPayload = assignments.map((a: IndicatorAssignment) => ({
            date: a.date,
            type: a.type,
            theme: sanitizeStr(a.theme),
            speaker_name: sanitizeStr(a.speaker),
            president_name: sanitizeStr(a.president),
            reader_name: sanitizeStr(a.reader),
            hospitality_name: sanitizeStr(a.hospitality),
            entrance_indicator_name: sanitizeStr(a.entranceIndicator),
            auditorium_indicator_name: sanitizeStr(a.auditoriumIndicator),
            audio_operator_name: sanitizeStr(a.audio),
            video_operator_name: sanitizeStr(a.video),
            mic1_name: sanitizeStr(a.mic1),
            mic2_name: sanitizeStr(a.mic2)
        }));

        const { error: errDelA } = await supabase.from('assignments').delete().neq('type', 'PLACEHOLDER');
        if (errDelA) console.error('Erro limpando designações:', errDelA);

        if (assignPayload.length > 0) {
            const { error: errA } = await supabase.from('assignments').insert(assignPayload);
            if (errA) {
                console.error('❌ Erro ao enviar designações:', errA);
                throw errA;
            }
        }

        // 3. Sincronizar Congregações
        const congregations = db.getCongregations();
        console.log(`🏛️ Sincronizando ${congregations.length} congregações...`);
        const congPayload = congregations.map(c => ({
            id: c.id,
            name: c.name,
            address: sanitizeStr(c.address),
            meeting_day: null,
            meeting_time: null,
            circuit: sanitizeStr((c as any).circuit)
        }));

        const { error: _errDelC } = await supabase.from('congregations').delete().neq('id', 'PLACEHOLDER');
        if (congPayload.length > 0) {
            const { error: errC } = await supabase.from('congregations').insert(congPayload);
            if (errC) console.error('❌ Erro congregações:', errC);
        }

        // 4. Sincronizar Escola (Vida e Ministério)
        // Agrupar designações por semana para salvar no formato JSONB esperado pela tabela school_assignments (ou salvar individualmente se mudamos a strategy)
        // A tabela school_assignments espera: id, week_date, program_data (jsonb)
        // O app espera ler dessa tabela.
        // Vamos pegar todas as designações locais e agrupar por data (semana).

        const schoolAssignments = db.getSchoolAssignments();
        console.log(`📚 Sincronizando ${schoolAssignments.length} partes da escola...`);

        // Agrupar por data
        const schoolByWeek = new Map<string, any[]>();
        schoolAssignments.forEach(assign => {
            if (!schoolByWeek.has(assign.date)) {
                schoolByWeek.set(assign.date, []);
            }
            schoolByWeek.get(assign.date)?.push(assign);
        });

        const schoolPayload = Array.from(schoolByWeek.entries()).map(([date, assignments]) => ({
            week_date: date,
            program_data: { school: assignments } // Empacota dentro de um objeto 'school' para bater com o App.tsx: item.program_data.school
        }));

        const { error: errDelS } = await supabase.from('school_assignments').delete().neq('week_date', '1900-01-01');
        if (errDelS) console.error('Erro limpando escola:', errDelS);

        if (schoolPayload.length > 0) {
            const { error: errS } = await supabase.from('school_assignments').insert(schoolPayload);
            if (errS) {
                console.error('❌ Erro ao enviar escola:', errS);
                throw errS;
            }
        }


        console.log('✅ Sincronização concluída com sucesso!');
        return { success: true, count: persons.length };

    } catch (error) {
        console.error('❌ Falha geral na sincronização:', error);
        return { success: false, error };
    }
};
