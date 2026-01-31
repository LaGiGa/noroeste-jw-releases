import { v4 as uuidv4 } from 'uuid';
import historyData from '../data/history_data.json';
import { DISCURSOS_COMPLETOS } from '../data/discursos';

// Tipos de Dados
export interface User {
    id: string;
    username: string;
    password: string; // Em produção, usar hash!
    role: 'ADMIN' | 'USER';
    name: string;
    permissions: string[]; // 'dashboard', 'agenda', 'campo', 'congregacoes', 'escola', 'relatorios', 'usuarios', 'dados'
}

export interface Speaker {
    id: string;
    name: string;
    phone: string;
    congregation: string;
    qualifiedSpeeches: number[]; // IDs dos discursos
    approvedForOutside?: boolean; // Aprovado para fazer discursos fora
}

export interface Speech {
    id: string;
    number: number;
    theme: string;
    doNotUseUntil?: string; // Data até quando o discurso não deve ser usado
}

export interface ScheduleItem {
    id: string;
    date: string;
    time: string;
    speechNumber: number;
    speechTheme: string;
    speakerName: string;
    congregation: string; // Congregação de origem do orador
    location?: string;    // Local do discurso (onde será realizado)
    meetingTime?: string; // Horário da reunião (se for fora)
    host?: string;        // Anfitrião
}

export interface HistoryItem {
    id: string;
    date: string;
    speechNumber: number;
    speechTheme: string;
    speakerName: string;
    congregation: string;
}

export interface Congregation {
    id: string;
    name: string;
    address?: string;
    meetingTime?: string; // Horário da reunião
    city?: string;
}



export interface SchoolAssignment {
    id: string;
    date: string;
    // Campos da Escola (Estudantes)
    studentId: string;
    studentName: string;
    point: string;
    room: 'Principal' | 'Sala B';
    assistant?: string; // Ajudante (estudante)
    role?: string; // Função (Presidente, Orador, etc.)
    // Campos de Oradores (Mantidos para compatibilidade, mas o ideal é criar designações separadas)
    president?: string; // Presidente / Responsável Sala Principal
    speaker?: string; // Orador
    bibleReader?: string; // Leitura da Bíblia (estudante)
    conductor?: string; // Condutor
    bibleStudyConductor?: string; // Estudo Bíblico - Condutor
    bibleStudyReader?: string; // Estudo Bíblico - Leitor (pessoa do indicador com função Leitor)
}



export interface Quadra {
    id: string;
    numero: string;
    status: 'trabalhada' | 'nao_trabalhada';
    observacoes?: string;
    lat?: number;
    lng?: number;
}

export interface ServiceGroup {
    id: string;
    nome: string;
    responsavel: string;
    assistente: string;
    territorio: string;
    cor: string;
    paths?: google.maps.LatLngLiteral[][];
    lines?: google.maps.LatLngLiteral[][];
    membros?: string[];
    quadras?: Quadra[];
}

export interface Person {
    id: string;
    name: string; // Nome de Exibição
    firstName?: string;
    middleName?: string;
    lastName?: string;
    suffix?: string;
    displayName?: string;
    gender?: 'M' | 'F';
    headOfFamily?: boolean;
    maritalStatus?: string;
    spouseId?: string;
    childrenIds?: string[];
    parentIds?: string[];
    unavailability?: {
        id: string;
        startDate: string;
        endDate: string;
        reason?: string;
    }[];
    birthDate?: string;
    phones?: {
        home?: string;
        mobile?: string;
        work?: string;
    };
    address?: string;
    notes?: string;

    // Flags Pessoa
    elderly?: boolean;
    child?: boolean;
    incarcerated?: boolean;
    deaf?: boolean;
    blind?: boolean;
    khsUser?: boolean;
    khsId?: string;
    moved?: boolean;
    deceased?: boolean;

    // Espiritual
    baptizedDate?: string;
    unbaptizedPublisher?: boolean;
    serviceGroup?: string;
    spiritualNotes?: {
        printedWatchtower?: boolean;
        printedMeetingWorkbook?: boolean;
        largePrint?: boolean;
        khKeys?: boolean;
    };

    // Designações
    privileges?: {
        elder?: boolean;
        ministerialServant?: boolean;
    };
    pioneerStatus?: {
        auxiliary?: boolean;
        regular?: boolean;
        special?: boolean;
        missionary?: boolean;
    };
    reportDirectly?: boolean;

    // Responsabilidades
    responsibilities?: {
        coordinator?: boolean;
        secretary?: boolean;
        serviceOverseer?: boolean;
        lifeMinistryOverseer?: boolean;
        auxiliaryCounselor?: boolean;
        publicTalkCoordinator?: boolean;
        publicTalkCoordinatorHelper?: boolean;
        watchtowerStudyConductor?: boolean;
        avCoordinator?: boolean;
        cleaningCoordinator?: boolean;
        landscapeCoordinator?: boolean;
        publicWitnessingCoordinator?: boolean;
        khMaintenanceCommittee?: boolean;
        accountsHelper?: boolean;
        literatureServant?: boolean;
        territoryServant?: boolean;
        bethelite?: boolean;
        tempVolunteer?: boolean;
        commuter?: boolean;
        remoteVolunteer?: boolean;
        hlc?: boolean;
        ldc?: boolean;
        metroWitnessing?: boolean;
    };

    // Atribuições
    assignments?: {
        // Tesouros
        president?: boolean;
        prayer?: boolean;
        treasuresTalk?: boolean;
        gems?: boolean;
        bibleReading?: boolean;
        // Ministério
        startingConversations?: boolean;
        cultivatingInterest?: boolean;
        makingDisciples?: boolean;
        explainingBeliefs?: boolean;
        assistant?: boolean;
        studentTalk?: boolean;
        noMainHall?: boolean;
        onlyMainHall?: boolean;
        // Vida Cristã
        parts?: boolean;
        congregationBibleStudy?: boolean;
        reader?: boolean;
        // Discursos Públicos
        publicTalkSpeaker?: boolean;
        publicMeetingPresident?: boolean;
        watchtowerReader?: boolean;
        hospitality?: boolean;
        // Audio/Video/Indicadores
        sound?: boolean; // Adicionado para manter compatibilidade com "Áudio"
        videoOperator?: boolean;
        videoZoom?: boolean;
        zoomAttendant?: boolean;
        zoomIndicator?: boolean;
        indicator?: boolean;
        indicatorEntrance?: boolean; // Indicador (Entrada)
        indicatorAuditorium?: boolean; // Indicador (Auditório)
        cameras?: boolean;
        stage?: boolean;
        mic?: boolean; // Adicionado para manter compatibilidade com "Mic. Volante"
        // Testemunho Público
        publicWitnessingApproved?: boolean;
    };

    congregation: string;
    roles: string[]; // Mantido para compatibilidade
    phone: string;
    email: string;
    active: boolean;
}

export interface IndicatorAssignment {
    id: string;
    date: string;
    type: 'domingo' | 'quarta';
    theme: string;
    speaker?: string;
    president?: string;
    reader?: string;
    hospitality?: string;
    entranceIndicator?: string;
    auditoriumIndicator?: string;
    audio?: string;
    video?: string;
    mic1?: string;
    mic2?: string;
}

export interface SpecialEvent {
    id: string;
    startDate: string;
    endDate: string;
    description: string;
    type: 'VISITA_SUPERINTENDENTE' | 'ASSEMBLEIA' | 'CONGRESSO' | 'CELEBRACAO' | 'OUTRO';
}

// Schema do Banco de Dados
export interface DatabaseSchema {
    users: User[];
    speakers: Speaker[];
    schedule: ScheduleItem[];
    history: HistoryItem[];
    congregations: Congregation[];
    speeches: Speech[];

    schoolAssignments: SchoolAssignment[];
    persons: Person[];
    indicatorAssignments: IndicatorAssignment[];
    specialEvents: SpecialEvent[];
    serviceGroups: ServiceGroup[];
    // Novos campos para backup unificado
    vmProgramasByWeek: Record<string, any>;
    currentVMPrograma: any;
}

// Dados Iniciais
const INITIAL_DATA: DatabaseSchema = {
    users: [
        {
            id: '1',
            username: 'admin',
            password: 'la.99448282',
            role: 'ADMIN',
            name: 'Administrador',
            permissions: ['dashboard', 'agenda', 'campo', 'congregacoes', 'escola', 'indicador', 'relatorios', 'usuarios', 'dados']
        },
        {
            id: '2',
            username: 'usuario',
            password: '123',
            role: 'USER',
            name: 'Usuário Padrão',
            permissions: ['dashboard', 'agenda', 'campo', 'congregacoes', 'escola', 'indicador', 'relatorios']
        }
    ],
    serviceGroups: [
        {
            id: '1',
            nome: 'GRUPO 31 NORTE',
            responsavel: '',
            assistente: '',
            territorio: 'Área Norte',
            cor: '#3b82f6',
            paths: [
                // 303 NORTE (ARNO 31)
                [
                    { lat: -10.1647, lng: -48.3392 },
                    { lat: -10.1647, lng: -48.3352 },
                    { lat: -10.1687, lng: -48.3352 },
                    { lat: -10.1687, lng: -48.3392 }
                ],
                // METADE DA 503 NORTE (Oeste)
                [
                    { lat: -10.1540, lng: -48.3320 },
                    { lat: -10.1540, lng: -48.3300 },
                    { lat: -10.1580, lng: -48.3300 },
                    { lat: -10.1580, lng: -48.3320 }
                ],
                // ARNO 21 (203 NORTE)
                [
                    { lat: -10.1746, lng: -48.3446 },
                    { lat: -10.1746, lng: -48.3406 },
                    { lat: -10.1786, lng: -48.3406 },
                    { lat: -10.1786, lng: -48.3446 }
                ]
            ],
            membros: []
        },
        {
            id: '2',
            nome: 'GRUPO 02',
            responsavel: '',
            assistente: '',
            territorio: 'Área Norte',
            cor: '#10b981',
            paths: [
                // 403 NORTE (ARNO 41)
                [
                    { lat: -10.1563, lng: -48.3364 },
                    { lat: -10.1563, lng: -48.3324 },
                    { lat: -10.1603, lng: -48.3324 },
                    { lat: -10.1603, lng: -48.3364 }
                ],
                // METADE 503 NORTE (Leste)
                [
                    { lat: -10.1540, lng: -48.3300 },
                    { lat: -10.1540, lng: -48.3280 },
                    { lat: -10.1580, lng: -48.3280 },
                    { lat: -10.1580, lng: -48.3300 }
                ]
            ],
            membros: []
        },
        {
            id: '3',
            nome: 'GRUPO 03 607',
            responsavel: '',
            assistente: '',
            territorio: 'Área Norte',
            cor: '#f59e0b',
            paths: [
                // 607 NORTE (ARNO 73)
                [
                    { lat: -10.1505, lng: -48.3417 },
                    { lat: -10.1505, lng: -48.3377 },
                    { lat: -10.1545, lng: -48.3377 },
                    { lat: -10.1545, lng: -48.3417 }
                ],
                // METADE DA 605 NORTE (Sul/Baixo)
                [
                    { lat: -10.1505, lng: -48.3338 },
                    { lat: -10.1505, lng: -48.3298 },
                    { lat: -10.1525, lng: -48.3298 },
                    { lat: -10.1525, lng: -48.3338 }
                ],
                // METADE DA ARNO 12 (105 NORTE) - Norte
                [
                    { lat: -10.1788, lng: -48.3481 },
                    { lat: -10.1788, lng: -48.3441 },
                    { lat: -10.1808, lng: -48.3441 },
                    { lat: -10.1808, lng: -48.3481 }
                ]
            ],
            membros: [],
            quadras: [
                { id: 'q1', numero: '01', status: 'trabalhada', lat: -10.1510, lng: -48.3370 },
                { id: 'q2', numero: '02', status: 'nao_trabalhada', lat: -10.1510, lng: -48.3330 },
                { id: 'q3', numero: '03', status: 'trabalhada', lat: -10.1540, lng: -48.3370 },
                { id: 'q4', numero: '04', status: 'nao_trabalhada', lat: -10.1540, lng: -48.3330 }
            ]
        },
        {
            id: '4',
            nome: 'GRUPO 04 603',
            responsavel: '',
            assistente: '',
            territorio: 'Área Norte',
            cor: '#ef4444',
            paths: [
                // 603 NORTE (ARNO 71)
                [
                    { lat: -10.1520, lng: -48.3259 },
                    { lat: -10.1520, lng: -48.3219 },
                    { lat: -10.1560, lng: -48.3219 },
                    { lat: -10.1560, lng: -48.3259 }
                ],
                // METADE DA 605 NORTE (Norte/Cima)
                [
                    { lat: -10.1485, lng: -48.3338 },
                    { lat: -10.1485, lng: -48.3298 },
                    { lat: -10.1505, lng: -48.3298 },
                    { lat: -10.1505, lng: -48.3338 }
                ],
                // CHACARA AGUA FRIA
                [
                    { lat: -10.1310, lng: -48.3220 },
                    { lat: -10.1310, lng: -48.3180 },
                    { lat: -10.1350, lng: -48.3180 },
                    { lat: -10.1350, lng: -48.3220 }
                ]
            ],
            membros: []
        },
    ],
    speakers: [
        {
            id: 'spk-1',
            name: 'Ronaldo Lucindo',
            phone: '',
            congregation: 'Noroeste',
            qualifiedSpeeches: [1, 51, 55, 59, 77, 105]
        },
        {
            id: 'spk-2',
            name: 'Roberto Apinagé',
            phone: '',
            congregation: 'Noroeste',
            qualifiedSpeeches: [2, 3, 15, 23, 44, 79, 103, 107, 128, 169, 189, 191]
        },
        {
            id: 'spk-3',
            name: 'Júnior Miranda',
            phone: '',
            congregation: 'Noroeste',
            qualifiedSpeeches: [4, 10, 22, 63, 66, 73, 79, 118, 121, 130, 145, 170, 171, 174, 185]
        },
        {
            id: 'spk-4',
            name: 'André Almeida',
            phone: '',
            congregation: 'Noroeste',
            qualifiedSpeeches: [5, 9, 10, 12, 13, 18, 22, 27, 28, 29, 33, 35, 38, 46, 48, 63, 66, 71, 78, 81, 85, 88, 90, 97, 100, 113, 121, 134, 160, 162, 166, 170, 171, 173, 177, 181]
        },
        {
            id: 'spk-5',
            name: 'Alonso Gomes',
            phone: '',
            congregation: 'Noroeste',
            qualifiedSpeeches: [5, 30, 39, 44, 52, 74, 92, 133, 138, 190]
        },
        {
            id: 'spk-6',
            name: 'Stanlley Neres',
            phone: '',
            congregation: 'Noroeste',
            qualifiedSpeeches: [30, 35, 71, 86, 93, 100, 113, 127, 146, 167]
        },
        {
            id: 'spk-7',
            name: 'Clécio Morais',
            phone: '',
            congregation: 'Noroeste',
            qualifiedSpeeches: [36, 40, 41, 44, 134, 135]
        },
        {
            id: 'spk-8',
            name: 'Rafael Leão',
            phone: '',
            congregation: 'Noroeste',
            qualifiedSpeeches: [68]
        },
        {
            id: 'spk-9',
            name: 'Edilson Almeida',
            phone: '',
            congregation: 'Noroeste',
            qualifiedSpeeches: [78, 85, 88, 100, 114, 140]
        },
        {
            id: 'spk-10',
            name: 'Dourivan Miranda',
            phone: '',
            congregation: 'Noroeste',
            qualifiedSpeeches: [101, 184],
            approvedForOutside: true
        }
    ],
    schedule: [],
    history: [],
    congregations: [
        { id: 'cong-1', name: 'Sul', city: 'Palmas TO' },
        { id: 'cong-2', name: 'Sudeste', city: 'Palmas TO' },
        { id: 'cong-3', name: 'Oeste', city: 'Palmas TO' },
        { id: 'cong-4', name: 'Aureny', city: 'Palmas TO' },
        { id: 'cong-5', name: 'Novo Horizonte', city: 'Palmas TO' },
        { id: 'cong-6', name: 'Nordeste', city: 'Palmas TO' },
        { id: 'cong-7', name: 'Central', city: 'Palmas TO' },
        { id: 'cong-8', name: 'Norte', city: 'Palmas TO' },
        { id: 'cong-9', name: 'Noroeste', city: 'Palmas TO' },
        { id: 'cong-10', name: 'Taquari', city: 'Palmas TO' },
        { id: 'cong-11', name: 'Bela Vista', city: 'Palmas TO' },
        { id: 'cong-12', name: 'Taquaralto', city: 'Palmas TO' },
        { id: 'cong-13', name: 'Portal do Lago', city: 'Porto Nacional TO' },
        { id: 'cong-14', name: 'Taquaruçu', city: 'Palmas TO' },
        { id: 'cong-15', name: 'Aparecida do Rio Negro', city: 'TO' },
        { id: 'cong-16', name: 'Norte', city: 'Porto Nacional TO' },
        { id: 'cong-17', name: 'Central', city: 'Porto Nacional TO' },
        { id: 'cong-18', name: 'Lajeado', city: 'TO' },
        { id: 'cong-19', name: 'Miracema do Tocantins', city: 'TO' },
        { id: 'cong-20', name: 'Santa Tereza do Tocantins', city: 'TO' },
        { id: 'cong-21', name: 'Jardim Paulista', city: 'Paraíso do Tocantins TO' },
        { id: 'cong-22', name: 'Pouso Alegre', city: 'Paraíso do Tocantins TO' },
        { id: 'cong-23', name: 'Barrolândia', city: 'TO' },
        { id: 'cong-24', name: 'Novo Acordo', city: 'TO' },
        { id: 'cong-25', name: 'Lagoa do Tocantins', city: 'TO' },
        { id: 'cong-26', name: 'Pium', city: 'TO' }
    ],

    schoolAssignments: [],
    persons: [
        { id: 'p-1', name: "Clécio Morais", congregation: "Noroeste", roles: ["Orador", "Presidente", "Áudio", "Vídeo"], phone: "", email: "", active: true },
        { id: 'p-5', name: "Roberto Apinajé", congregation: "Noroeste", roles: ["Orador", "Presidente", "Áudio"], phone: "", email: "", active: true },
        { id: 'p-6', name: "Dourivan Miranda", congregation: "Noroeste", roles: ["Presidente", "Leitor", "Mic. Volante"], phone: "", email: "", active: true },
        { id: 'p-7', name: "Edilson Almeida", congregation: "Noroeste", roles: ["Presidente", "Leitor", "Indicador"], phone: "", email: "", active: true },
        { id: 'p-8', name: "Ian Gabriel", congregation: "Noroeste", roles: ["Presidente", "Leitor", "Mic. Volante"], phone: "", email: "", active: true },
        { id: 'p-9', name: "Junior Miranda", congregation: "Noroeste", roles: ["Presidente", "Indicador", "Mic. Volante"], phone: "", email: "", active: true },
        { id: 'p-10', name: "Rafael Leão", congregation: "Noroeste", roles: ["Presidente", "Leitor", "Indicador"], phone: "", email: "", active: true },
        { id: 'p-11', name: "André Almeida", congregation: "Noroeste", roles: ["Leitor", "Hospitalidade", "Indicador"], phone: "", email: "", active: true },
        { id: 'p-12', name: "Cícero Castro", congregation: "Noroeste", roles: ["Leitor", "Presidente", "Mic. Volante"], phone: "", email: "", active: true },
        { id: 'p-13', name: "Eduardo Siqueira", congregation: "Noroeste", roles: ["Leitor", "Indicador", "Mic. Volante"], phone: "", email: "", active: true },
        { id: 'p-14', name: "Eduardo Miranda", congregation: "Noroeste", roles: ["Hospitalidade", "Mic. Volante", "Áudio"], phone: "", email: "", active: true },
        { id: 'p-15', name: "Stanley Neves", congregation: "Noroeste", roles: ["Hospitalidade", "Indicador", "Mic. Volante"], phone: "", email: "", active: true },
        { id: 'p-16', name: "Fábio Gomes", congregation: "Noroeste", roles: ["Indicador", "Mic. Volante", "Áudio"], phone: "", email: "", active: true },
        { id: 'p-17', name: "Ronaldo Lucindo", congregation: "Noroeste", roles: ["Indicador", "Mic. Volante", "Hospitalidade"], phone: "", email: "", active: true },
        { id: 'p-18', name: "Wideglan Pereira", congregation: "Noroeste", roles: ["Indicador", "Mic. Volante", "Leitor"], phone: "", email: "", active: true },
        { id: 'p-19', name: "Thássio Brandão", congregation: "Noroeste", roles: ["Indicador", "Mic. Volante", "Áudio"], phone: "", email: "", active: true },
        { id: 'p-20', name: "Laércio Avelino", congregation: "Noroeste", roles: ["Indicador", "Mic. Volante", "Hospitalidade"], phone: "", email: "", active: true },
        { id: 'p-21', name: "Pedro Avelino", congregation: "Noroeste", roles: ["Indicador", "Mic. Volante", "Leitor"], phone: "", email: "", active: true }
    ],
    indicatorAssignments: [],
    specialEvents: [],
    vmProgramasByWeek: {},
    currentVMPrograma: null,
    speeches: DISCURSOS_COMPLETOS.map(d => ({
        id: `speech-${d.numero}`,
        number: d.numero,
        theme: d.tema
    }))
};

const DB_KEY = 'noroeste_jw_db';

class DatabaseService {
    private data: DatabaseSchema;

    constructor() {
        this.data = this.load();
    }

    private load(): DatabaseSchema {
        const stored = localStorage.getItem(DB_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);

                // Função auxiliar para clonar dados iniciais
                const getInitial = (key: keyof DatabaseSchema) => JSON.parse(JSON.stringify(INITIAL_DATA[key]));

                // Se não houver usuários no localStorage, usar os usuários padrão
                const users = (parsed.users && parsed.users.length > 0) ? parsed.users : getInitial('users');

                // Para oradores, se a chave existir no JSON (mesmo vazia), usamos ela. 
                // Se não existir (undefined), usamos o inicial.
                let speakers = parsed.speakers !== undefined ? parsed.speakers : getInitial('speakers');

                // MIGRAÇÃO DE DADOS LEGADOS (localStorage 'oradores')
                // Verifica se há dados antigos e se a lista atual está vazia ou é igual à inicial (sem dados do usuário)
                const legacySpeakersStr = localStorage.getItem('oradores');
                const isSpeakersInitial = JSON.stringify(speakers) === JSON.stringify(INITIAL_DATA.speakers);

                if (legacySpeakersStr && (speakers.length === 0 || isSpeakersInitial)) {
                    try {
                        const legacySpeakers = JSON.parse(legacySpeakersStr);
                        if (Array.isArray(legacySpeakers) && legacySpeakers.length > 0) {
                            console.log('Migrando oradores legados...');
                            type LegacySpeaker = Partial<{
                                id: string | number;
                                nome: string;
                                name: string;
                                telefone: string;
                                phone: string;
                                congregacao: string;
                                congregation: string;
                                discursos: number[];
                                qualifiedSpeeches: number[];
                            }>;
                            speakers = legacySpeakers.map((s: LegacySpeaker) => ({
                                id: s.id ? String(s.id) : uuidv4(),
                                name: (s.nome ?? s.name ?? '') as string,
                                phone: (s.telefone ?? s.phone ?? '') as string,
                                congregation: (s.congregacao ?? s.congregation ?? '') as string,
                                qualifiedSpeeches: (s.discursos ?? s.qualifiedSpeeches ?? []) as number[]
                            }));
                        }
                    } catch (e) {
                        console.error('Erro ao migrar oradores legados:', e);
                    }
                }



                // Para pessoas, mesma lógica
                let persons = parsed.persons !== undefined ? parsed.persons : getInitial('persons');

                // MIGRAÇÃO DE ROLES PARA ASSIGNMENTS EM PESSOAS
                // Se uma pessoa tem 'roles' mas não tem 'assignments' (ou vazio), populamos assignments baseados em roles
                if (persons.length > 0) {
                    // Recuperação resiliente: Se não tiver ID, gera um. Remove apenas nulos/inválidos.
                    persons = persons.map((p: any) => {
                        if (!p || typeof p !== 'object') return null;

                        // Garante que tenha ID
                        if (!p.id) {
                            console.warn('Pessoa sem ID encontrada, gerando novo ID:', p.name || (p as any).nome);
                            p.id = uuidv4();
                        }

                        // Garante que tenha assignments inicializado
                        if (!p.assignments) {
                            p.assignments = {};
                        }

                        // RECUPERAÇÃO DE NOME (nome -> name)
                        if (!p.name && (p as any).nome) {
                            p.name = (p as any).nome;
                        }
                        // Fallback para evitar crash
                        if (!p.name) {
                            p.name = 'Sem Nome';
                        }

                        // MIGRAÇÃO DE CAMPOS LEGADOS/PORTUGUÊS (TENTATIVA DE RECUPERAÇÃO)
                        // Telefone
                        if (!p.phones) p.phones = { home: '', mobile: '', work: '' };
                        if ((p as any).telefone && !p.phones.mobile) p.phones.mobile = (p as any).telefone;
                        if ((p as any).celular && !p.phones.mobile) p.phones.mobile = (p as any).celular;
                        if ((p as any).phone && !p.phones.mobile) p.phones.mobile = (p as any).phone;

                        // Grupo
                        if (!p.serviceGroup) {
                            if ((p as any).grupo) p.serviceGroup = (p as any).grupo;
                            if ((p as any).grupo_servico) p.serviceGroup = (p as any).grupo_servico;
                        }

                        // MIGRAÇÃO CONGREGAÇÕES (circuit -> meetingTime)
                        if (parsed.congregations) {
                            parsed.congregations = parsed.congregations.map((c: any) => {
                                if (c.circuit && !c.meetingTime) {
                                    c.meetingTime = c.circuit;
                                    delete c.circuit;
                                }
                                return c;
                            });
                        }

                        // Privilégios (se vier como array de strings ou objeto antigo)
                        if (!p.privileges) p.privileges = { elder: false, ministerialServant: false };
                        if ((p as any).privilegios) {
                            const privs = (p as any).privilegios;
                            if (Array.isArray(privs)) {
                                if (privs.includes('Ancião')) p.privileges.elder = true;
                                if (privs.includes('Servo Ministerial')) p.privileges.ministerialServant = true;
                            } else if (typeof privs === 'object') {
                                if (privs.anciao) p.privileges.elder = true;
                                if (privs.servo) p.privileges.ministerialServant = true;
                            }
                        }

                        // Pioneiro
                        if (!p.pioneerStatus) p.pioneerStatus = { auxiliary: false, regular: false, special: false, missionary: false };
                        if ((p as any).pioneiro) {
                            if ((p as any).pioneiro === 'Regular' || (p as any).pioneiro === true) p.pioneerStatus.regular = true;
                            if ((p as any).pioneiro === 'Auxiliar') p.pioneerStatus.auxiliary = true;
                        }

                        return p;
                    }).filter((p: any) => p !== null);

                    persons.forEach((p: Person) => {
                        // Verifica se assignments está vazio ou indefinido (agora garantido que existe o objeto, verificamos chaves)
                        const hasAssignments = p.assignments && Object.keys(p.assignments).length > 0;

                        // Migração de ROLES para assignments e privilégios
                        if (p.roles && p.roles.length > 0) {
                            p.assignments = p.assignments || {};
                            p.privileges = p.privileges || { elder: false, ministerialServant: false };
                            p.pioneerStatus = p.pioneerStatus || { regular: false, auxiliary: false, special: false, missionary: false };

                            // Mapeamento de roles legados para assignments
                            if (!hasAssignments) {
                                if (p.roles.includes('Orador')) p.assignments.publicTalkSpeaker = true;
                                if (p.roles.includes('Presidente')) p.assignments.president = true;
                                if (p.roles.includes('Leitor')) {
                                    p.assignments.reader = true;
                                    p.assignments.watchtowerReader = true;
                                }
                                if (p.roles.includes('Oração')) p.assignments.prayer = true;
                                if (p.roles.includes('Hospitalidade')) p.assignments.hospitality = true;
                                if (p.roles.includes('Indicador')) {
                                    p.assignments.indicator = true;
                                    p.assignments.indicatorEntrance = true;
                                    p.assignments.indicatorAuditorium = true;
                                }
                                if (p.roles.includes('Áudio')) p.assignments.sound = true;
                                if (p.roles.includes('Vídeo')) p.assignments.videoOperator = true;
                                if (p.roles.includes('Mic. Volante')) p.assignments.mic = true;
                            }

                            // Mapeamento de roles para Privilégios (mesmo se já tiver assignments, roles pode conter info de privilégio)
                            if (p.roles.includes('Ancião')) p.privileges.elder = true;
                            if (p.roles.includes('Servo Ministerial')) p.privileges.ministerialServant = true;
                            if (p.roles.includes('Pioneiro Regular')) p.pioneerStatus.regular = true;
                            if (p.roles.includes('Pioneiro Auxiliar')) p.pioneerStatus.auxiliary = true;

                            console.log(`Migrou dados de: ${p.name}`);
                        }
                    });
                }

                // MIGRAÇÃO DE AGENDA (localStorage 'agenda')
                const legacyAgendaStr = localStorage.getItem('agenda');
                let schedule = parsed.schedule || [];
                if (legacyAgendaStr && schedule.length === 0) {
                    try {
                        const legacyAgenda = JSON.parse(legacyAgendaStr);
                        if (Array.isArray(legacyAgenda) && legacyAgenda.length > 0) {
                            console.log('Migrando agenda legada...');
                            schedule = legacyAgenda.map((item: any) => ({
                                id: item.id || uuidv4(),
                                date: item.date || item.data,
                                time: item.time || item.horario,
                                speechNumber: item.speechNumber || item.numero,
                                speechTheme: item.speechTheme || item.tema,
                                speakerName: item.speakerName || item.orador,
                                congregation: item.congregation || item.congregacao
                            }));
                        }
                    } catch (e) {
                        console.error('Erro ao migrar agenda legada:', e);
                    }
                }

                // MIGRAÇÃO DE HISTÓRICO JSON (history_data.json)
                let schoolAssignments = parsed.schoolAssignments || [];
                if (historyData && Array.isArray(historyData)) {
                    const jsonAssignments: SchoolAssignment[] = [];
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    historyData.forEach((week: any) => {
                        if (week.assignments && Array.isArray(week.assignments)) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            week.assignments.forEach((a: any) => {
                                jsonAssignments.push({
                                    id: uuidv4(),
                                    date: week.date,
                                    studentId: '',
                                    studentName: a.studentName || '',
                                    point: a.point || '',
                                    room: a.room === 'Sala B' ? 'Sala B' : 'Principal',
                                    assistant: a.assistant,
                                    role: a.role
                                } as SchoolAssignment);
                            });
                        }
                    });

                    let addedCount = 0;
                    jsonAssignments.forEach(newA => {
                        const exists = schoolAssignments.some((ex: SchoolAssignment) =>
                            ex.date === newA.date &&
                            ex.point === newA.point &&
                            ex.studentName === newA.studentName
                        );
                        if (!exists) {
                            schoolAssignments.push(newA);
                            addedCount++;
                        }
                    });
                    if (addedCount > 0) {
                        console.log(`Merged ${addedCount} assignments from history_data.json`);
                    }
                }

                return {
                    users,
                    speakers,
                    schedule,
                    history: parsed.history || [],
                    congregations: (parsed.congregations && parsed.congregations.length > 0) ? parsed.congregations : getInitial('congregations'),
                    speeches: (parsed.speeches && parsed.speeches.length > 0) ? parsed.speeches : getInitial('speeches'),
                    schoolAssignments,
                    persons,
                    indicatorAssignments: parsed.indicatorAssignments || [],
                    specialEvents: parsed.specialEvents || [],
                    serviceGroups: (() => {
                        let groups = parsed.serviceGroups;
                        if (!groups) {
                            const saved = localStorage.getItem('campo_grupos');
                            groups = saved ? JSON.parse(saved).map((g: any) => ({ ...g, id: String(g.id) })) : INITIAL_DATA.serviceGroups;
                        }

                        // Sincronizar paths do INITIAL_DATA se estiverem vazios ou no formato antigo no banco
                        return groups.map((g: ServiceGroup) => {
                            const initialGroup = INITIAL_DATA.serviceGroups.find(ig => ig.id === g.id || ig.nome === g.nome);

                            // Sincroniza Quadras de Exemplo (Arno 73)
                            if (g.id === '3' && initialGroup?.quadras && (!g.quadras || g.quadras.length === 0)) {
                                g.quadras = initialGroup.quadras;
                            }

                            // Verifica se os paths atuais são inválidos (vazio ou formato antigo de array simples de coords)
                            let isOldFormat = false;
                            if (g.paths && g.paths.length > 0) {
                                // @ts-ignore - Verificação de runtime
                                if (g.paths[0].lat !== undefined) {
                                    isOldFormat = true;
                                }
                            }

                            if (initialGroup && initialGroup.paths && initialGroup.paths.length > 0) {
                                // Apenas migra se estiver no formato antigo (objeto lat/lng direto no array em vez de array de arrays)
                                if (isOldFormat) {
                                    console.log(`Atualizando paths do grupo ${g.nome} a partir dos dados iniciais (Migração para múltiplos polígonos).`);
                                    return { ...g, paths: initialGroup.paths };
                                }
                                // REMOVIDO: A verificação de (!g.paths || g.paths.length === 0) causava o bug de restaurar polígonos apagados pelo usuário.
                            }
                            return g;
                        });
                    })(),
                    vmProgramasByWeek: (() => {
                        if (parsed.vmProgramasByWeek) return parsed.vmProgramasByWeek;
                        const saved = localStorage.getItem('vm_programas_by_week');
                        return saved ? JSON.parse(saved) : {};
                    })(),
                    currentVMPrograma: (() => {
                        if (parsed.currentVMPrograma) return parsed.currentVMPrograma;
                        const saved = localStorage.getItem('programaVidaMinisterio');
                        return saved ? JSON.parse(saved) : null;
                    })()
                };
            } catch (error) {
                console.error('❌ Erro crítico ao processar JSON do banco de dados:', error);
                // Se falhar o parse do banco inteiro, tentamos carregar apenas as coleções vitais individualmente se possível
                // para não perder tudo. Por ora, retornamos o banco atual se houver, ou inicial.
                if (this.data && this.data.persons && this.data.persons.length > 0) {
                    console.warn('⚠️ Usando dados em memória para evitar perda total.');
                    return this.data;
                }
                return JSON.parse(JSON.stringify(INITIAL_DATA));
            }
        }
        return JSON.parse(JSON.stringify(INITIAL_DATA));
    }

    // Método público para inicializar/reinicializar o banco de dados
    public initialize(): void {
        console.log('Inicializando banco de dados...');
        const currentData = this.load();
        this.save(currentData);
        console.log('Banco de dados inicializado com sucesso!');
    }

    // Limpar todos os dados mantendo apenas o usuário atual (ou admin padrão)
    // Opções permitem preservar cadastros base
    public clearDatabase(options: { keepSpeakers?: boolean, keepCongregations?: boolean, keepPersons?: boolean, keepSpeeches?: boolean } = {}): void {
        const adminUser = this.data.users.find(u => u.role === 'ADMIN') || INITIAL_DATA.users[0];

        const emptyData: DatabaseSchema = {
            users: [adminUser],
            speakers: options.keepSpeakers ? this.data.speakers : [],
            schedule: [],
            history: [],
            congregations: options.keepCongregations ? this.data.congregations : [],
            speeches: options.keepSpeeches ? this.data.speeches : [],

            schoolAssignments: [],
            persons: options.keepPersons ? this.data.persons : [],
            indicatorAssignments: [],
            specialEvents: [],
            serviceGroups: options.keepPersons ? this.data.serviceGroups : INITIAL_DATA.serviceGroups,
            vmProgramasByWeek: {},
            currentVMPrograma: null
        };
        this.save(emptyData);
    }

    private save(data: DatabaseSchema) {
        try {
            localStorage.setItem(DB_KEY, JSON.stringify(data));
            this.data = data;
        } catch (e) {
            console.error('ERRO CRÍTICO AO SALVAR DADOS:', e);
            // Evita loop de alertas se o save for chamado muitas vezes
            console.warn('Falha ao salvar no localStorage. Verifique cota de disco.');
        }
    }

    // --- Métodos Genéricos ---

    public getData(): DatabaseSchema {
        return this.data;
    }

    public importData(jsonData: string) {
        try {
            const importedData = JSON.parse(jsonData);

            // Validação básica
            if (!importedData || typeof importedData !== 'object') {
                throw new Error('Formato de arquivo inválido');
            }

            // Sanitização pré-merge: Garantir IDs em todos os objetos importados
            const ensureIds = (list: any[]) => {
                if (!Array.isArray(list)) return [];
                return list.map(item => {
                    if (item && typeof item === 'object' && !item.id) {
                        item.id = uuidv4();
                    }
                    return item;
                }).filter(item => item && item.id);
            };

            if (importedData.persons) importedData.persons = ensureIds(importedData.persons);
            if (importedData.speakers) importedData.speakers = ensureIds(importedData.speakers);
            if (importedData.congregations) importedData.congregations = ensureIds(importedData.congregations);
            if (importedData.schedule) importedData.schedule = ensureIds(importedData.schedule);
            if (importedData.history) importedData.history = ensureIds(importedData.history);
            if (importedData.specialEvents) importedData.specialEvents = ensureIds(importedData.specialEvents);

            // Função auxiliar para fazer merge de arrays baseado em ID (UPSERT Strategy)
            // Lógica ajustada: O dado importado tem precedência sobre o existente se o ID bater.
            const mergeById = <T extends { id: string }>(existing: T[], imported: T[]): T[] => {
                if (!Array.isArray(imported)) return existing;

                const map = new Map<string, T>();

                // 1. Carrega existentes
                existing.forEach(item => map.set(item.id, item));

                // 2. Sobrescreve com importados (Upsert)
                imported.forEach(item => map.set(item.id, item));

                return Array.from(map.values());
            };

            // Função auxiliar para fazer merge de arrays baseado em campos únicos (para usuários)
            const mergeUsers = (existing: User[], imported: User[]): User[] => {
                if (!Array.isArray(imported)) return existing;

                const map = new Map<string, User>();
                existing.forEach(u => map.set(u.username, u));
                imported.forEach(u => map.set(u.username, u));

                return Array.from(map.values());
            };

            // Fazer merge incremental de cada coleção
            const mergedData: DatabaseSchema = {
                users: mergeUsers(this.data.users, importedData.users || []),
                speakers: mergeById(this.data.speakers, importedData.speakers || []),
                schedule: mergeById(this.data.schedule, importedData.schedule || []),
                history: mergeById(this.data.history, importedData.history || []),
                congregations: mergeById(this.data.congregations, importedData.congregations || []),

                schoolAssignments: mergeById(this.data.schoolAssignments, importedData.schoolAssignments || []),
                persons: mergeById(this.data.persons, importedData.persons || []),
                indicatorAssignments: mergeById(this.data.indicatorAssignments, importedData.indicatorAssignments || []),
                speeches: mergeById(this.data.speeches || [], importedData.speeches || []),
                specialEvents: mergeById(this.data.specialEvents, importedData.specialEvents || []),
                serviceGroups: mergeById(this.data.serviceGroups, importedData.serviceGroups || []),
                vmProgramasByWeek: { ...(this.data.vmProgramasByWeek || {}), ...(importedData.vmProgramasByWeek || {}) },
                currentVMPrograma: importedData.currentVMPrograma || this.data.currentVMPrograma
            };

            this.save(mergedData);
            window.location.reload(); // Recarregar para aplicar mudanças
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            throw error;
        }
    }

    public exportData(): string {
        return JSON.stringify(this.data, null, 2);
    }

    // --- Users ---
    public getUser(username: string): User | undefined {
        return this.data.users.find(u => u.username === username);
    }

    public getUsers(): User[] {
        return this.data.users;
    }

    public addUser(user: Omit<User, 'id'>): User {
        const newUser = { ...user, id: uuidv4() };
        this.data.users.push(newUser);
        this.save(this.data);
        return newUser;
    }

    public updateUser(id: string, updates: Partial<User>) {
        this.data.users = this.data.users.map(u =>
            u.id === id ? { ...u, ...updates } : u
        );
        this.save(this.data);
    }

    public deleteUser(id: string) {
        this.data.users = this.data.users.filter(u => u.id !== id);
        this.save(this.data);
    }

    // --- Speakers ---
    public getSpeakers(): Speaker[] {
        return this.data.speakers;
    }

    public addSpeaker(speaker: Omit<Speaker, 'id'>): Speaker {
        const newSpeaker = { ...speaker, id: uuidv4() };
        this.data.speakers.push(newSpeaker);
        this.save(this.data);
        return newSpeaker;
    }

    public updateSpeaker(id: string, updates: Partial<Speaker>) {
        this.data.speakers = this.data.speakers.map(s =>
            s.id === id ? { ...s, ...updates } : s
        );
        this.save(this.data);
    }

    public deleteSpeaker(id: string) {
        this.data.speakers = this.data.speakers.filter(s => s.id !== id);
        this.save(this.data);
    }

    // --- Schedule (Agenda) ---
    public getSchedule(): ScheduleItem[] {
        return this.data.schedule;
    }

    public addScheduleItem(item: Omit<ScheduleItem, 'id'>): ScheduleItem {
        const newItem = { ...item, id: uuidv4() };
        this.data.schedule.push(newItem);
        this.save(this.data);
        return newItem;
    }

    public updateScheduleItem(id: string, updates: Partial<ScheduleItem>) {
        this.data.schedule = this.data.schedule.map(i =>
            i.id === id ? { ...i, ...updates } : i
        );
        this.save(this.data);
    }

    public deleteScheduleItem(id: string) {
        this.data.schedule = this.data.schedule.filter(i => i.id !== id);
        this.save(this.data);
    }

    // --- History ---
    public getHistory(): HistoryItem[] {
        return this.data.history;
    }

    public addHistoryItem(item: Omit<HistoryItem, 'id'>): HistoryItem {
        const newItem = { ...item, id: uuidv4() };
        this.data.history.push(newItem);
        this.save(this.data);
        return newItem;
    }

    public updateHistoryItem(id: string, updates: Partial<HistoryItem>) {
        this.data.history = this.data.history.map(i =>
            i.id === id ? { ...i, ...updates } : i
        );
        this.save(this.data);
    }

    public deleteHistoryItem(id: string) {
        this.data.history = this.data.history.filter(i => i.id !== id);
        this.save(this.data);
    }

    // --- Congregations ---
    public getCongregations(): Congregation[] {
        return this.data.congregations;
    }

    public addCongregation(congregation: Omit<Congregation, 'id'>): Congregation {
        const newCong = { ...congregation, id: uuidv4() };
        this.data.congregations.push(newCong);
        this.save(this.data);
        return newCong;
    }

    public updateCongregation(id: string, updates: Partial<Congregation>) {
        this.data.congregations = this.data.congregations.map(c =>
            c.id === id ? { ...c, ...updates } : c
        );
        this.save(this.data);
    }

    public deleteCongregation(id: string) {
        this.data.congregations = this.data.congregations.filter(c => c.id !== id);
        this.save(this.data);
    }



    // --- School Assignments ---
    public getSchoolAssignments(): SchoolAssignment[] {
        return this.data.schoolAssignments;
    }

    public saveSchoolAssignments(assignments: SchoolAssignment[]) {
        this.data.schoolAssignments = assignments;
        this.save(this.data);
    }

    public addSchoolAssignment(assignment: Omit<SchoolAssignment, 'id'>): SchoolAssignment {
        const newAssignment = { ...assignment, id: uuidv4() };
        this.data.schoolAssignments.push(newAssignment);
        this.save(this.data);
        return newAssignment;
    }

    public updateSchoolAssignment(id: string, updates: Partial<SchoolAssignment>) {
        this.data.schoolAssignments = this.data.schoolAssignments.map(a =>
            a.id === id ? { ...a, ...updates } : a
        );
        this.save(this.data);
    }

    public deleteSchoolAssignment(id: string) {
        this.data.schoolAssignments = this.data.schoolAssignments.filter(a => a.id !== id);
        this.save(this.data);
    }

    public deleteAllSchoolAssignments() {
        this.data.schoolAssignments = [];
        this.save(this.data);
    }

    public syncPersonAttributesFromHistory() {
        const assignments = this.data.schoolAssignments;
        const persons = this.data.persons;
        let updatedCount = 0;
        const personsMap = new Map<string, Person>();

        // Create a map for faster lookup by ID and Name
        persons.forEach(p => {
            personsMap.set(p.id, p);
            personsMap.set(p.name.toLowerCase(), p);
            if (p.displayName) personsMap.set(p.displayName.toLowerCase(), p);
        });

        assignments.forEach(assign => {
            // Find person
            let person = personsMap.get(assign.studentId);
            if (!person && assign.studentName) {
                person = personsMap.get(assign.studentName.toLowerCase());
            }

            if (person) {
                if (!person.assignments) person.assignments = {};
                let modified = false;

                // President
                if (assign.role === 'Presidente' || assign.point === 'Presidente') {
                    if (!person.assignments.president) {
                        person.assignments.president = true;
                        modified = true;
                    }
                }

                // Bible Reading
                if (assign.point === 'Leitura da Bíblia' || assign.role === 'Leitura da Bíblia') {
                    if (!person.assignments.bibleReading) {
                        person.assignments.bibleReading = true;
                        modified = true;
                    }
                }

                // Joias Espirituais
                if (assign.point.toLowerCase().includes('joias espirituais')) {
                    if (!person.assignments.gems) {
                        person.assignments.gems = true;
                        modified = true;
                    }
                }

                // Orações
                if (assign.point.toLowerCase().includes('oração')) {
                    if (!person.assignments.prayer) {
                        person.assignments.prayer = true;
                        modified = true;
                    }
                }

                // Vida Cristã (Necessidades Locais, etc)
                if (assign.point.toLowerCase().includes('necessidades locais')) {
                    if (!person.assignments.parts) {
                        person.assignments.parts = true;
                        modified = true;
                    }
                }

                // Tentar identificar Discurso de Tesouros (difícil pois o título varia)
                // Lógica: Se não for nenhum dos outros tipos conhecidos, e não for ministério
                const lowerPoint = assign.point.toLowerCase();
                const isMinistry = lowerPoint.includes('iniciando') ||
                    lowerPoint.includes('cultivando') ||
                    lowerPoint.includes('fazendo') ||
                    lowerPoint.includes('explicando') ||
                    lowerPoint.includes('leitura da bíblia'); // Leitura é tesouros, mas tem attr próprio

                const isOther = lowerPoint.includes('oração') ||
                    lowerPoint.includes('joias') ||
                    lowerPoint.includes('estudo bíblico') ||
                    lowerPoint.includes('presidente') ||
                    lowerPoint.includes('leitor') ||
                    lowerPoint.includes('condutor') ||
                    lowerPoint.includes('necessidades');

                if (!isMinistry && !isOther && !person.assignments.treasuresTalk) {
                    // Assumindo que o que sobrou pode ser um discurso de tesouros
                    // (Geralmente 10 min). Arriscado, mas melhor que nada.
                    // Podemos verificar se a pessoa é Varão (se tiver genero). Mas aqui não temos genero garantido no assign.
                    // Vamos ativar. O usuário pode desmarcar depois.
                    person.assignments.treasuresTalk = true;
                    modified = true;
                }

                // Parts
                if (assign.point === 'Iniciando conversas') {
                    if (!person.assignments.startingConversations) {
                        person.assignments.startingConversations = true;
                        modified = true;
                    }
                }
                if (assign.point === 'Cultivando o interesse') {
                    if (!person.assignments.cultivatingInterest) {
                        person.assignments.cultivatingInterest = true;
                        modified = true;
                    }
                }
                if (assign.point === 'Fazendo discípulos') {
                    if (!person.assignments.makingDisciples) {
                        person.assignments.makingDisciples = true;
                        modified = true;
                    }
                }
                if (assign.point === 'Explicando suas crenças') {
                    if (!person.assignments.explainingBeliefs) {
                        person.assignments.explainingBeliefs = true;
                        modified = true;
                    }
                }
                if (assign.point === 'Discurso') {
                    if (!person.assignments.studentTalk) {
                        person.assignments.studentTalk = true;
                        modified = true;
                    }
                }

                // Bible Study
                if ((assign.role === 'Condutor' && assign.point === 'Estudo Bíblico de Congregação') || assign.point === 'Estudo Bíblico de Congregação (Condutor)') {
                    if (!person.assignments.congregationBibleStudy) {
                        person.assignments.congregationBibleStudy = true;
                        modified = true;
                    }
                }
                if ((assign.role === 'Leitor' && assign.point === 'Estudo Bíblico de Congregação') || assign.point === 'Estudo Bíblico de Congregação (Leitor)') {
                    if (!person.assignments.reader) {
                        person.assignments.reader = true;
                        modified = true;
                    }
                }

                if (modified) updatedCount++;
            }
        });

        if (updatedCount > 0) {
            this.save(this.data);
        }
        return updatedCount;
    }

    // --- Persons ---
    public getPersons(): Person[] {
        return this.data.persons;
    }

    public addPerson(person: Omit<Person, 'id'>): Person {
        const newPerson = { ...person, id: uuidv4() };
        this.data.persons.push(newPerson);
        this.save(this.data);
        return newPerson;
    }

    public updatePerson(id: string, updates: Partial<Person>) {
        this.data.persons = this.data.persons.map(p =>
            p.id === id ? { ...p, ...updates } : p
        );
        this.save(this.data);
    }

    public deletePerson(id: string) {
        this.data.persons = this.data.persons.filter(p => p.id !== id);
        this.save(this.data);
    }

    // --- Indicator Assignments ---
    public getIndicatorAssignments(): IndicatorAssignment[] {
        return this.data.indicatorAssignments;
    }

    public addIndicatorAssignment(assignment: Omit<IndicatorAssignment, 'id'>): IndicatorAssignment {
        const newAssignment = { ...assignment, id: uuidv4() };
        this.data.indicatorAssignments.push(newAssignment);
        this.save(this.data);
        return newAssignment;
    }

    public updateIndicatorAssignment(id: string, updates: Partial<IndicatorAssignment>) {
        this.data.indicatorAssignments = this.data.indicatorAssignments.map(a =>
            a.id === id ? { ...a, ...updates } : a
        );
        this.save(this.data);
    }

    public deleteIndicatorAssignment(id: string) {
        this.data.indicatorAssignments = this.data.indicatorAssignments.filter(a => a.id !== id);
        this.save(this.data);
    }

    // --- Service Groups ---
    public getServiceGroups(): ServiceGroup[] {
        return this.data.serviceGroups || [];
    }

    public addServiceGroup(group: Omit<ServiceGroup, 'id'>): ServiceGroup {
        const newGroup = { ...group, id: uuidv4() };
        if (!this.data.serviceGroups) this.data.serviceGroups = [];
        this.data.serviceGroups.push(newGroup);
        this.save(this.data);
        return newGroup;
    }

    public updateServiceGroup(id: string, updates: Partial<ServiceGroup>) {
        this.data.serviceGroups = (this.data.serviceGroups || []).map(g =>
            g.id === id ? { ...g, ...updates } : g
        );
        this.save(this.data);
    }

    public deleteServiceGroup(id: string) {
        this.data.serviceGroups = (this.data.serviceGroups || []).filter(g => g.id !== id);
        this.save(this.data);
    }

    // --- Special Events ---
    public getSpecialEvents(): SpecialEvent[] {
        return this.data.specialEvents || [];
    }

    public addSpecialEvent(event: Omit<SpecialEvent, 'id'>): SpecialEvent {
        const newEvent = { ...event, id: uuidv4() };
        if (!this.data.specialEvents) this.data.specialEvents = [];
        this.data.specialEvents.push(newEvent);
        this.save(this.data);
        return newEvent;
    }

    public updateSpecialEvent(id: string, updates: Partial<SpecialEvent>) {
        this.data.specialEvents = (this.data.specialEvents || []).map(e =>
            e.id === id ? { ...e, ...updates } : e
        );
        this.save(this.data);
    }

    public deleteSpecialEvent(id: string) {
        this.data.specialEvents = (this.data.specialEvents || []).filter(e => e.id !== id);
        this.save(this.data);
    }

    // --- Speeches ---
    public getSpeeches(): Speech[] {
        return (this.data.speeches || []).sort((a, b) => a.number - b.number);
    }

    public addSpeech(speech: Omit<Speech, 'id'>): Speech {
        const newSpeech = { ...speech, id: uuidv4() };
        if (!this.data.speeches) this.data.speeches = [];
        this.data.speeches.push(newSpeech);
        this.save(this.data);
        return newSpeech;
    }

    public updateSpeech(id: string, updates: Partial<Speech>) {
        this.data.speeches = (this.data.speeches || []).map(s =>
            s.id === id ? { ...s, ...updates } : s
        );
        this.save(this.data);
    }

    public deleteSpeech(id: string) {
        this.data.speeches = (this.data.speeches || []).filter(s => s.id !== id);
        this.save(this.data);
    }

    // --- Vida e Ministério ---
    public getVMProgramasByWeek(): Record<string, any> {
        return this.data.vmProgramasByWeek || {};
    }

    public updateVMProgramaByWeek(key: string, programa: any) {
        if (!this.data.vmProgramasByWeek) this.data.vmProgramasByWeek = {};
        this.data.vmProgramasByWeek[key] = programa;
        this.save(this.data);
    }

    public getCurrentVMPrograma(): any {
        return this.data.currentVMPrograma;
    }

    public updateCurrentVMPrograma(programa: any) {
        this.data.currentVMPrograma = programa;
        this.save(this.data);
    }
}

export const db = new DatabaseService();

