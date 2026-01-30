import type { Brother, Speech } from '../types';

export const mockBrothers: Brother[] = [
    {
        id: '1',
        name: 'Carlos Silva',
        privilege: 'ancião',
        phone: '11999999999',
        email: 'carlos@email.com',
        abilities: ['orador', 'leitor', 'presidente'],
        availability: 'ambos',
        isActive: true,
        history: []
    },
    {
        id: '2',
        name: 'João Santos',
        privilege: 'servo',
        phone: '11888888888',
        abilities: ['leitor', 'indicador', 'som'],
        availability: 'domingo',
        isActive: true,
        history: []
    },
    {
        id: '3',
        name: 'Pedro Oliveira',
        privilege: 'publicador',
        abilities: ['leitor', 'microfone'],
        availability: 'quarta',
        isActive: true,
        history: []
    }
];

export const mockSpeeches: Speech[] = [
    {
        id: '1',
        number: 1,
        title: 'Conhece você bem a Deus?',
        theme: 'Jeová',
        scripture: 'João 17:3',
        duration: 30,
        difficulty: 'fácil',
        lastGivenDate: '2024-01-15',
        lastSpeakerId: '1'
    },
    {
        id: '2',
        number: 2,
        title: 'Será que você vai sobreviver aos últimos dias?',
        theme: 'Profecia',
        scripture: 'Sofonias 2:3',
        duration: 30,
        difficulty: 'médio'
    },
    {
        id: '3',
        number: 3,
        title: 'Sirva a Jeová com um coração leal',
        theme: 'Lealdade',
        scripture: '1 Crônicas 28:9',
        duration: 30,
        difficulty: 'difícil'
    },
    {
        id: '4',
        number: 4,
        title: 'A oração — Uma dádiva de Deus',
        theme: 'Oração',
        scripture: 'Filipenses 4:6',
        duration: 30,
        difficulty: 'fácil'
    },
    {
        id: '5',
        number: 5,
        title: 'Por que devemos perdoar?',
        theme: 'Perdão',
        scripture: 'Mateus 6:14, 15',
        duration: 30,
        difficulty: 'médio'
    }
];
