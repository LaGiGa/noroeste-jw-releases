import { db } from './database';
import type { User } from './database';

const SESSION_KEY = 'noroeste_jw_session';

class AuthService {
    private currentUser: User | null = null;

    constructor() {
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
            this.currentUser = JSON.parse(stored);
        }
    }

    public login(username: string, password: string): boolean {
        const user = db.getUser(username);
        if (user && user.password === password) {
            this.currentUser = user;
            localStorage.setItem(SESSION_KEY, JSON.stringify(user));
            return true;
        }
        return false;
    }

    public logout() {
        this.currentUser = null;
        localStorage.removeItem(SESSION_KEY);
        window.location.reload();
    }

    public getCurrentUser(): User | null {
        return this.currentUser;
    }

    public isAuthenticated(): boolean {
        return !!this.currentUser;
    }

    public hasRole(allowedRoles: User['role'][]): boolean {
        if (!this.currentUser) return false;
        if (this.currentUser.role === 'ADMIN') return true; // Admin tem acesso a tudo
        return allowedRoles.includes(this.currentUser.role);
    }

    public hasPermission(permission: string): boolean {
        if (!this.currentUser) return false;
        if (this.currentUser.role === 'ADMIN') return true;
        return this.currentUser.permissions.includes(permission);
    }
}

export const auth = new AuthService();
