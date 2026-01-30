import type { User } from '../types';

const USERS_STORAGE_KEY = 'noroeste_jw_users';
const AUTH_STORAGE_KEY = 'noroeste_jw_auth';

// Interface extending User to include password for storage
interface StoredUser extends User {
    password?: string;
}

// Initialize default admin if no users exist
export const initializeDefaultAdmin = (): void => {
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (!storedUsers) {
        const defaultAdmin: StoredUser = {
            id: '1',
            username: 'admin',
            name: 'Administrador',
            email: 'admin@noroeste.jw',
            password: 'admin',
            role: 'admin',
            permissions: [] // Admin has implicit full access
        };
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([defaultAdmin]));
    }
};

export const getUsers = (): StoredUser[] => {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    if (!stored) return [];

    const users = JSON.parse(stored);

    // Migration: Ensure all users have a username
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const migratedUsers = users.map((u: any) => {
        if (!u.username) {
            // Generate username from email or name
            const generatedUsername = u.email ? u.email.split('@')[0] : u.name.toLowerCase().replace(/\s+/g, '');
            return { ...u, username: generatedUsername };
        }
        return u;
    });

    return migratedUsers;
};

export const saveUser = (user: StoredUser): void => {
    const users = getUsers();
    const index = users.findIndex(u => u.id === user.id);

    if (index >= 0) {
        users[index] = user;
    } else {
        users.push(user);
    }

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const deleteUser = (id: string): void => {
    const users = getUsers().filter(u => u.id !== id);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const validateCredentials = (username: string, password: string): User | null => {
    initializeDefaultAdmin(); // Ensure at least one user exists
    const users = getUsers();

    const user = users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (user) {
        // Return user without password
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    return null;
};

export const getUserByEmail = (email: string): User | null => {
    const users = getUsers();
    const user = users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase());

    if (user) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    return null;
};

export const saveAuthToStorage = (user: User): void => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
};

export const loadAuthFromStorage = (): User | null => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored) as User;
        } catch {
            return null;
        }
    }
    return null;
};

export const clearAuthFromStorage = (): void => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
};
