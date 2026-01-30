import type { Assignment, Brother } from '../types';

export interface ConflictResult {
    hasConflict: boolean;
    conflicts: string[];
}

export const validateAssignmentConflicts = (
    assignment: Assignment,
    existingAssignments: Assignment[],
    brothers: Brother[]
): ConflictResult => {
    const conflicts: string[] = [];

    // Check for same date assignments
    const sameDate = existingAssignments.filter(a => a.date === assignment.date && a.id !== assignment.id);

    assignment.parts.forEach(part => {
        const brother = brothers.find(b => b.id === part.brotherId);
        if (!brother) {
            conflicts.push(`Irmão não encontrado para a parte: ${part.role}`);
            return;
        }

        // Check if brother is active
        if (!brother.isActive) {
            conflicts.push(`${brother.name} está inativo e não pode receber designações`);
        }

        // Check availability
        if (assignment.type === 'quarta' && brother.availability === 'domingo') {
            conflicts.push(`${brother.name} não está disponível às quartas-feiras`);
        }
        if (assignment.type === 'domingo' && brother.availability === 'quarta') {
            conflicts.push(`${brother.name} não está disponível aos domingos`);
        }

        // Check for duplicate assignments on same date
        sameDate.forEach(existing => {
            const hasPart = existing.parts.some(p => p.brotherId === part.brotherId);
            if (hasPart) {
                conflicts.push(`${brother.name} já tem uma designação nesta data`);
            }
        });

        // Check if brother has required abilities
        const requiredAbilities: Record<string, string[]> = {
            'Presidente': ['presidente'],
            'Oração': ['orador', 'ancião', 'servo'],
            'Leitor': ['leitor'],
            'Discurso Público': ['orador'],
            'Estudo de A Sentinela': ['orador', 'ancião'],
        };

        const required = requiredAbilities[part.role];
        if (required && !required.some(ability => brother.abilities.includes(ability))) {
            conflicts.push(`${brother.name} não tem as habilidades necessárias para: ${part.role}`);
        }
    });

    return {
        hasConflict: conflicts.length > 0,
        conflicts,
    };
};

export const checkBrotherOverload = (
    brotherId: string,
    assignments: Assignment[],
    periodDays: number = 30
): { isOverloaded: boolean; count: number } => {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const count = assignments.filter(assignment => {
        const assignmentDate = new Date(assignment.date);
        return assignmentDate >= periodStart &&
            assignmentDate <= now &&
            assignment.parts.some(part => part.brotherId === brotherId);
    }).length;

    // Consider overloaded if more than 4 assignments in 30 days
    return {
        isOverloaded: count > 4,
        count,
    };
};

export const getNextAvailableDate = (
    type: 'quarta' | 'domingo',
    startDate: Date = new Date()
): Date => {
    const date = new Date(startDate);
    const targetDay = type === 'quarta' ? 3 : 0; // 3 = Wednesday, 0 = Sunday

    while (date.getDay() !== targetDay) {
        date.setDate(date.getDate() + 1);
    }

    return date;
};
