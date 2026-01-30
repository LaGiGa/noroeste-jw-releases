// Storage keys
const STORAGE_KEYS = {
    BROTHERS: 'noroeste_jw_brothers',
    SPEECHES: 'noroeste_jw_speeches',
    ASSIGNMENTS: 'noroeste_jw_assignments',
    STUDENTS: 'noroeste_jw_students',
    CONGREGATIONS: 'noroeste_jw_congregations',
    BACKUP: 'noroeste_jw_backup',
} as const;

// Generic storage functions
export const saveToStorage = <T>(key: string, data: T): void => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
        console.error('Error loading from storage:', error);
        return defaultValue;
    }
};

export const removeFromStorage = (key: string): void => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error removing from storage:', error);
    }
};

// Backup and restore
export const createBackup = (): string => {
    const backup = {
        timestamp: new Date().toISOString(),
        data: {
            brothers: localStorage.getItem(STORAGE_KEYS.BROTHERS),
            speeches: localStorage.getItem(STORAGE_KEYS.SPEECHES),
            assignments: localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS),
            students: localStorage.getItem(STORAGE_KEYS.STUDENTS),
            congregations: localStorage.getItem(STORAGE_KEYS.CONGREGATIONS),
        },
    };

    const backupString = JSON.stringify(backup, null, 2);
    saveToStorage(STORAGE_KEYS.BACKUP, backup);
    return backupString;
};

export const restoreBackup = (backupString: string): boolean => {
    try {
        const backup = JSON.parse(backupString);

        if (backup.data.brothers) localStorage.setItem(STORAGE_KEYS.BROTHERS, backup.data.brothers);
        if (backup.data.speeches) localStorage.setItem(STORAGE_KEYS.SPEECHES, backup.data.speeches);
        if (backup.data.assignments) localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, backup.data.assignments);
        if (backup.data.students) localStorage.setItem(STORAGE_KEYS.STUDENTS, backup.data.students);
        if (backup.data.congregations) localStorage.setItem(STORAGE_KEYS.CONGREGATIONS, backup.data.congregations);

        return true;
    } catch (error) {
        console.error('Error restoring backup:', error);
        return false;
    }
};

export const downloadBackup = (): void => {
    const backupString = createBackup();
    const blob = new Blob([backupString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noroeste-jw-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const exportToJSON = <T>(data: T, filename: string): void => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export { STORAGE_KEYS };
