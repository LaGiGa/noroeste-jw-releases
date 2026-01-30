// Preload script para expor APIs de forma segura ao renderer process
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Expor APIs necessárias de forma segura
contextBridge.exposeInMainWorld('electron', {
    platform: process.platform,
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
    },
    readFileArray: (filePath) => {
        try {
            const resolved = path.resolve(filePath);
            const buffer = fs.readFileSync(resolved);
            return Array.from(buffer);
        } catch (e) {
            console.error('readFileArray error:', e.message);
            return null;
        }
    },
    fetchText: (url) => ipcRenderer.invoke('fetch-text', url),
    fetchBinary: async (url) => {
        const arr = await ipcRenderer.invoke('fetch-binary', url);
        return new Uint8Array(arr);
    },
    openConsent: () => ipcRenderer.invoke('open-consent'),
    openUrl: (url) => ipcRenderer.invoke('open-url', url),
    jwlibFetchPdf: async (urlOrParams) => ipcRenderer.invoke('jwlib-fetch-pdf', urlOrParams),
    mwbExtract: async (urlOrParams) => ipcRenderer.invoke('mwb-extract', urlOrParams),
    prefetchMwbs: async (opts) => ipcRenderer.invoke('prefetch-mwb-pdfs', opts),
    getMwbPath: async (params) => ipcRenderer.invoke('get-mwb-path', params),
    scrapeHtml: (url) => ipcRenderer.invoke('scrape-html', url),
    saveAdminFeed: (params) => ipcRenderer.invoke('save-admin-feed', params),
    saveBackup: (data) => ipcRenderer.invoke('save-backup', data)
});

console.log('Preload script loaded successfully');
