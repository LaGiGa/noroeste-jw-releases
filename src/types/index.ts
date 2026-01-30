export type Privilege = 'ancião' | 'servo' | 'publicador';
export type MeetingDay = 'quarta' | 'domingo' | 'ambos';
export type UserRole = 'admin' | 'user';

export interface User {
    id: string;
    username: string;
    name: string;
    email?: string;
    role: UserRole;
    permissions?: string[]; // List of allowed paths/routes
    congregationId?: string;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
}

export interface Brother {
    id: string;
    name: string;
    privilege: Privilege;
    phone?: string;
    email?: string;
    baptismDate?: string;
    abilities: string[]; // 'leitor', 'orador', 'indicador', etc.
    availability: MeetingDay;
    restrictions?: string;
    isActive: boolean;
    photoUrl?: string;
    history: AssignmentHistory[];
}

export interface AssignmentHistory {
    date: string;
    role: string; // 'presidente', 'leitor', 'orador', etc.
    theme?: string;
}

export interface Speech {
    id: string;
    number: number;
    title: string;
    theme: string; // Biblical theme
    scripture: string;
    duration: number; // minutes
    difficulty: 'fácil' | 'médio' | 'difícil';
    notes?: string;
    lastGivenDate?: string;
    lastSpeakerId?: string;
}

export interface Assignment {
    id: string;
    date: string;
    type: 'quarta' | 'domingo';
    parts: AssignmentPart[];
}

export interface AssignmentPart {
    role: string; // 'Presidente', 'Oração Inicial', 'Discurso Público', etc.
    brotherId: string;
    assistantId?: string; // For student parts
    theme?: string;
    time?: string;
}

export interface StudentAssignment {
    id: string;
    studentId: string;
    assistantId?: string;
    date: string;
    point: number; // Study point
    theme: string;
    isCompleted: boolean;
}

export interface Congregation {
    id: string;
    name: string;
    address: string;
    coordinator: string;
    phone: string;
}
