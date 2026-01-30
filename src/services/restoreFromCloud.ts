import { createClient } from '@supabase/supabase-js';
import { db } from './database';
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const restoreFromCloud = async () => {
    console.log('☁️ Iniciando RESTAURAÇÃO da nuvem...');

    try {
        const dbData: any = {
            persons: [],
            assignments: [], // Indicator
            congregations: [],
            schoolAssignments: []
        };

        // 1. Restaurar Pessoas
        console.log('Baixando pessoas...');
        const { data: persons, error: errP } = await supabase.from('persons').select('*');
        if (errP) throw errP;

        if (persons) {
            dbData.persons = persons.map(p => ({
                id: p.legacy_id || uuidv4(), // Usa legacy_id se tiver, senão gera
                name: p.name,
                gender: p.gender,
                birthDate: p.birth_date,
                baptizedDate: p.baptism_date,
                phones: {
                    home: p.phone,
                    mobile: p.mobile,
                    work: ''
                },
                address: p.address,
                active: p.active,
                moved: p.moved,
                deceased: p.deceased,
                privileges: {
                    elder: p.elder,
                    ministerialServant: p.ministerial_servant
                },
                pioneerStatus: {
                    regular: p.pioneer_regular,
                    auxiliary: p.pioneer_auxiliary,
                    special: p.pioneer_special,
                    missionary: p.missionary
                },
                assignments: p.assignments || {}, // Recupera JSON de atribuições
                unavailability: p.unavailability || []
            }));
        }

        // 2. Restaurar Designações de Indicador
        console.log('Baixando designações (Indicador)...');
        const { data: assignments, error: errA } = await supabase.from('assignments').select('*');
        if (errA) throw errA;

        if (assignments) {
            dbData.indicatorAssignments = assignments.map(a => ({
                id: uuidv4(), // Gera novo ID pois indicador não tem ID fixo crítico
                date: a.date,
                type: a.type,
                theme: a.theme,
                speaker: a.speaker_name,
                president: a.president_name,
                reader: a.reader_name,
                hospitality: a.hospitality_name,
                entranceIndicator: a.entrance_indicator_name,
                auditoriumIndicator: a.auditorium_indicator_name,
                audio: a.audio_operator_name,
                video: a.video_operator_name,
                mic1: a.mic1_name,
                mic2: a.mic2_name
            }));
        }

        // 3. Restaurar Congregações
        console.log('Baixando congregações...');
        const { data: congregations, error: errC } = await supabase.from('congregations').select('*');
        if (errC) throw errC;

        if (congregations) {
            dbData.congregations = congregations.map(c => ({
                id: c.id,
                name: c.name,
                address: c.address,
                circuit: c.circuit
            }));
        }

        // 4. Restaurar Escola
        console.log('Baixando Escola...');
        const { data: school, error: errS } = await supabase.from('school_assignments').select('*');
        if (errS) throw errS;

        if (school) {
            // A tabela guarda JSON agrupado por semana. Precisamos desagrupar.
            const allAssignments: any[] = [];
            school.forEach(row => {
                if (row.program_data && row.program_data.school) {
                    allAssignments.push(...row.program_data.school);
                }
            });
            dbData.schoolAssignments = allAssignments;
        }

        console.log(`📦 Preparando importação: ${dbData.persons.length} pessoas, ${dbData.schoolAssignments.length} partes.`);

        // Injeta no banco local
        // Nota: importData faz merge. Para restaurar "limpo", ideal seria limpar antes, mas o merge corrigido (Upsert) deve funcionar bem.
        db.importData(JSON.stringify(dbData));

        return { success: true, count: dbData.persons.length };

    } catch (error) {
        console.error('❌ Falha na restauração:', error);
        return { success: false, error };
    }
};
